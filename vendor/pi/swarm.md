# Standalone Pi worker path

Pi 1.4 has no built-in subagent tool. If a trusted parallel subagent extension is already available, use its documented interface. Otherwise Pi's supported [print mode](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli-integration.md) can run independent one-shot worker processes without an extension or configuration change. For the CLI contract, see the installed Pi `docs/cli-integration.md` and `pi --help`; this file does not assume a particular model or provider.

From each worker's intended workspace, write its self-contained brief to a private temporary file outside the repository. Start a bounded number of `pi --print --no-session` invocations concurrently, feeding one brief to each through stdin and redirecting each process's stdout and stderr to separate private files. Record each PID and `wait` for **every** PID, recording its exit code; on interruption, stop only the processes you started. Pi print mode exits nonzero on an error, abort, or output-length cutoff. A zero exit means the invocation finished, not that the task passed: inspect the result, changed files, and check evidence. Keep output until reviewed, redact secrets before reporting, and remove private temporary files afterward.

For example, with two prepared brief files in a private `$run_dir`:

```bash
pids=(); names=()
stop_children() {
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || :; done
  for pid in "${pids[@]}"; do wait "$pid" 2>/dev/null || :; done
}
trap 'stop_children; exit 130' INT TERM
for name in 1 2; do
  pi --print --no-session "Complete the delegated task in stdin; report revision, checks, results, and gaps." <"$run_dir/brief-$name.md" >"$run_dir/$name.out" 2>"$run_dir/$name.err" &
  pids+=("$!"); names+=("$name")
done
for i in "${!pids[@]}"; do
  if wait "${pids[$i]}"; then status=0; else status=$?; fi
  printf '%s exit %s\n' "${names[$i]}" "$status"
done
trap - INT TERM
```

Each Pi child uses its own context but inherits the working directory and loads its configured default model and resources, **not necessarily the parent's active model**. If project trust or credentials block startup, stop and escalate rather than adding approval flags or copying secrets. No workspace isolation is implied. Run read-only slices together or assign nonconflicting files and shared resources explicitly; for overlapping code edits or races, first provide distinct accessible workspaces or report the isolation blocker. Do not create worktrees, change configuration, or install an extension merely to make this fallback run. A stopped or unobservable child is a gap, never a reason to launch a duplicate blindly.
