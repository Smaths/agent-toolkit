import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const categories = ["M", "A", "D", "R", "C", "U", "?"] as const;
type Category = (typeof categories)[number];
type Counts = Record<Category, number>;
const conflicts = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);

// Porcelain v1 -z has one NUL-delimited record per file, plus a source path
// after renames/copies. Never split on newlines or interpret filenames as status.
export function parseGitStatus(output: string): Counts {
	const counts: Counts = { M: 0, A: 0, D: 0, R: 0, C: 0, U: 0, "?": 0 };
	if (!output) return counts;
	if (!output.endsWith("\0")) throw new Error("Incomplete Git status");
	const records = output.split("\0");
	records.pop();
	for (let i = 0; i < records.length; i++) {
		const record = records[i];
		if (!/^[ MADRCUT?!]{2} .+$/s.test(record)) throw new Error("Invalid Git status");
		const xy = record.slice(0, 2);
		if (xy.includes("R") || xy.includes("C")) {
			if (!records[++i]) throw new Error("Missing rename/copy source");
		}
		if (xy === "!!") continue;
		// One category per file even when both index and worktree changed.
		const category: Category | undefined = conflicts.has(xy) ? "U" : xy === "??" ? "?" :
			xy.includes("D") ? "D" : xy.includes("A") ? "A" : xy.includes("R") ? "R" :
			xy.includes("C") ? "C" : /[MT]/.test(xy) ? "M" : undefined;
		if (!category) throw new Error("Unknown Git status");
		counts[category]++;
	}
	return counts;
}

export function formatGitStatus(counts: Counts): string {
	return categories.filter((key) => counts[key] > 0).map((key) => `${key}${counts[key]}`).join(" ") || "✓";
}

export async function readGitStatus(cwd: string, signal?: AbortSignal): Promise<Counts> {
	const { stdout } = await exec("git", [
		"--no-optional-locks", "-c", "core.fsmonitor=false", "-C", cwd, "status", "--porcelain=v1", "-z",
		"--untracked-files=all", "--ignore-submodules=none",
	], { encoding: "utf8", timeout: 1500, maxBuffer: 4 * 1024 * 1024, signal });
	return parseGitStatus(stdout);
}

// Async reads stay out of render(). Coalesce concurrent events, but take another
// snapshot when a tool finishes during an in-flight read. Errors are not "clean".
export function watchGitStatus(options: {
	read: (signal: AbortSignal) => Promise<Counts>;
	onChange: (summary: string) => void;
}) {
	const controller = new AbortController();
	let stopped = false;
	let requested = false;
	let running: Promise<void> | undefined;
	let previous: string | undefined;
	const refresh = (): Promise<void> => {
		if (stopped) return Promise.resolve();
		requested = true;
		if (!running) {
			running = (async () => {
				do {
					requested = false;
					let summary: string;
					try { summary = formatGitStatus(await options.read(controller.signal)); }
					catch { summary = "git ?"; }
					if (stopped) return;
					if (summary !== previous) {
						previous = summary;
						options.onChange(summary);
					}
				} while (requested);
			})().finally(() => { running = undefined; });
		}
		return running;
	};
	const timer = setInterval(() => { void refresh(); }, 2000);
	timer.unref?.();
	return {
		refresh,
		dispose() {
			stopped = true;
			clearInterval(timer);
			controller.abort();
		},
	};
}
