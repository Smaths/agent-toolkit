import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, mkdtemp, open, readlink, realpath, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
const FILE_LIMIT = 2 * 1024 * 1024;
const hash = value => createHash("sha256").update(value).digest("hex");
export const inside = (root, path) => {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
};

// Fixed arguments only. Disable Git's external diff/textconv and fsmonitor hooks.
async function git(cwd, args) {
  try {
    const { stdout } = await execute("git", ["--no-pager", "--literal-pathspecs", "-c", "core.fsmonitor=false", ...args], {
      cwd, timeout: 5000, maxBuffer: 4 * 1024 * 1024, encoding: "utf8",
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null" },
    });
    return stdout;
  } catch {
    // Git output can contain source/credentials. Never echo command stderr.
    throw new Error("Git inspection failed or exceeded its time/output limit; native handoff is blocked.");
  }
}

async function readRegular(path, limit = FILE_LIMIT) {
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw new Error("Expected a regular file.");
    if (info.size > limit) throw new Error("File exceeds the handoff inspection limit.");
    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > limit) throw new Error("File exceeds the handoff inspection limit.");
    return buffer.subarray(0, length);
  } finally {
    await handle.close();
  }
}

export async function captureWorkspace(cwd) {
  const workspace = await realpath(cwd);
  const root = await realpath((await git(workspace, ["rev-parse", "--show-toplevel"])).trim());
  // Root-only avoids silently ignoring dirty files outside a subdirectory session.
  if (root !== workspace) throw new Error("Native handoff requires the repository root as cwd.");
  const head = (await git(workspace, ["rev-parse", "--verify", "HEAD"])).trim();
  const branch = (await git(workspace, ["rev-parse", "--abbrev-ref", "HEAD"])).trim();
  const status = await git(workspace, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  const diffArgs = ["diff", "--no-ext-diff", "--no-textconv", "--binary", "--no-renames"];
  const unstaged = await git(workspace, diffArgs);
  const staged = await git(workspace, [...diffArgs, "--cached"]);
  const untracked = (await git(workspace, ["ls-files", "--others", "--exclude-standard", "-z"])).split("\0").filter(Boolean);
  if (untracked.length > 200) throw new Error("Untracked file count exceeds the handoff inspection limit.");
  let total = 0;
  const untrackedHashes = [];
  for (const name of untracked) {
    const path = join(workspace, name);
    const info = await lstat(path);
    let contents;
    if (info.isSymbolicLink()) contents = Buffer.from(await readlink(path));
    else {
      if (!inside(workspace, await realpath(path))) throw new Error("Untracked file escapes workspace.");
      contents = await readRegular(path);
    }
    total += contents.length;
    if (total > 16 * 1024 * 1024) throw new Error("Untracked content exceeds the handoff inspection limit.");
    untrackedHashes.push([name, info.mode, hash(contents)]);
  }
  const fingerprint = hash(JSON.stringify({ workspace, head, branch, status, unstaged, staged, untrackedHashes }));
  return { workspace, head, branch, status: status.split("\0").filter(Boolean), fingerprint };
}

export const sameState = (a, b) => a?.workspace === b?.workspace && a?.fingerprint === b?.fingerprint;

export async function workspaceDiff(workspace, name, staged = false) {
  const path = resolve(workspace, name);
  if (!name || path === workspace || !inside(workspace, path)) throw new Error("Choose a specific path inside the workspace for diff inspection.");
  const diff = await git(workspace, ["diff", "--no-ext-diff", "--no-textconv", "--no-renames", ...(staged ? ["--cached"] : []), "--", relative(workspace, path)]);
  return { path: relative(workspace, path), staged, text: diff.slice(0, 16000), truncated: diff.length > 16000 };
}

async function localReadPath(workspace, name) {
  if (typeof name !== "string" || !name.trim() || /[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u.test(name)) {
    throw new Error("Choose one readable local file or directory path.");
  }
  // Recognize native drive paths without treating URI schemes as repository paths.
  if (/^[a-z][a-z\d+.-]*:/i.test(name) && !/^[a-z]:[\\/]/i.test(name)) {
    throw new Error("URLs are not supported by the startup reader; supply local context or request a separately approved investigation.");
  }
  return realpath(resolve(workspace, name));
}

export async function resolveReadGrant(workspace, name) {
  const path = await localReadPath(workspace, name);
  const info = await lstat(path);
  if (!info.isFile() && !info.isDirectory()) throw new Error("Read grants require a regular file or directory.");
  return { path, kind: info.isDirectory() ? "directory" : "file" };
}

export async function readScoped(scope, name, offset = 1, limit = 160, grants = []) {
  if (!Number.isInteger(offset) || offset < 1 || !Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new Error("Read range must use a positive offset and 1–200 lines.");
  }
  const path = await localReadPath(scope.workspace, name);
  const granted = grants.some(grant => grant.kind === "directory" ? inside(grant.path, path) : grant.kind === "file" && path === grant.path);
  if (!inside(scope.workspace, path) && path !== scope.brief && !granted) {
    throw new Error("Reference is outside startup read scope. Ask the user to run /handoff-allow-read <path> and confirm its read scope; chat permission alone cannot grant access.");
  }
  const bytes = await readRegular(path);
  if (bytes.includes(0)) throw new Error("Startup reader supports text files only.");
  const lines = bytes.toString("utf8").split("\n");
  const selected = lines.slice(offset - 1, offset - 1 + limit).join("\n");
  return { path, text: selected.slice(0, 16000), totalLines: lines.length, truncated: selected.length > 16000 || offset - 1 + limit < lines.length };
}

export function proposalText(proposal) {
  for (const key of ["outcome", "checked", "next", "verify"]) {
    const value = proposal[key];
    if (typeof value !== "string" || !value.trim() || value.length > 240 || /[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u.test(value)) {
      throw new Error("Proposal fields must be single readable lines of 1–240 characters.");
    }
    if (/\bproceed\s*\?/i.test(value)) throw new Error("The adapter adds Proceed?; leave the approval question out of all proposal fields.");
  }
  return `Ready: ${proposal.outcome}\nChecked: ${proposal.checked}\nNext: ${proposal.next}\nVerify: ${proposal.verify}\nProceed?`;
}

export async function prepareTransfer({ cwd, brief, settings, sourceSession, tools, stateHome }) {
  if (!["provider", "model", "reasoning"].every(key => typeof settings?.[key] === "string" && settings[key].trim())) {
    throw new Error("Exact provider/model/reasoning settings are required.");
  }
  const workspace = await realpath(cwd);
  const contents = await readRegular(await realpath(resolve(workspace, brief)), 32 * 1024);
  if (!contents.length || contents.includes(0)) throw new Error("Brief must be a nonempty text file (maximum 32 KiB).");
  const base = resolve(stateHome ?? process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state"), "agent-handoffs");
  // Check an existing ancestor before mkdir, including a state-home symlink.
  let ancestor = base;
  while (true) {
    try { ancestor = await realpath(ancestor); break; }
    catch (error) { if (error.code !== "ENOENT") throw error; ancestor = dirname(ancestor); }
  }
  if (inside(workspace, ancestor) || inside(workspace, base)) throw new Error("Handoff storage must be outside the workspace.");
  await mkdir(base, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(join(await realpath(base), "pi-"));
  const path = join(directory, "handoff.md");
  await writeFile(path, contents, { mode: 0o600, flag: "wx" });
  const snapshot = await captureWorkspace(workspace);
  const transfer = {
    version: 1, id: randomUUID(), directory, brief: path, briefHash: hash(contents), record: `${path}.launch.json`,
    createdAt: new Date().toISOString(), workspace, snapshot, settings, sourceSession,
    tools: [...tools], phase: "pending",
  };
  await writeRecord(transfer, { status: "prepared" });
  return transfer;
}

export async function verifyBrief(transfer) {
  if (hash(await readRegular(transfer.brief, 32 * 1024)) !== transfer.briefHash) {
    throw new Error("Saved brief changed; prepare a new handoff.");
  }
}

// Receiver observers merge metadata into their own existing launch record. They never
// reconstruct it from approval state or overwrite another receiver's progress.
export async function updateReceiverRecord(transfer, receiver, update) {
  const record = JSON.parse((await readRegular(transfer.record)).toString("utf8"));
  const identity = ["version", "id", "directory", "record", "brief", "briefHash", "workspace", "sourceSession"];
  if (!record || identity.some(key => record[key] !== transfer[key]) || !receiver || record.receiver !== receiver || !["created", "delivered"].includes(record.status)) {
    throw new Error("Launch record does not match this receiver; inspect it without redelivering.");
  }
  const patch = update(record);
  if (!patch) return false;
  await writeRecord(record, patch);
  return true;
}

export async function writeRecord(transfer, update) {
  const temporary = join(transfer.directory, `.record-${randomUUID()}.json`);
  await writeFile(temporary, `${JSON.stringify({ ...transfer, ...update }, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  await rename(temporary, transfer.record);
}
