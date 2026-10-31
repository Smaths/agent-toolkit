import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, mkdir, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function fixture(t) {
  const home = await realpath(await mkdtemp(join(tmpdir(), "handoff-test-")));
  t.after(() => rm(home, { recursive: true, force: true }));
  const cwd = join(home, "repo");
  await mkdir(cwd);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
  const git = (...args) => execFileSync("git", ["-c", "core.hooksPath=/dev/null", ...args], { cwd, env: { ...env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" }, stdio: "pipe" });
  git("init", "-q");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.invalid");
  await writeFile(join(cwd, "tracked.txt"), "original\n");
  git("add", ".");
  git("commit", "-qm", "fixture");
  const brief = join(home, "brief.md");
  await writeFile(brief, "# Handoff\n\n## Receiver startup\nValidate and ask.\n");
  return { home, cwd, git, brief };
}
