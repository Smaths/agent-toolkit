# Worker runtimes

Use the host's documented native subagent or coordination facility. Confirm that it can start independent workers concurrently and retrieve their outcomes. Use configured defaults unless the user selected a model. Follow the host's completion and cleanup procedure.

In an Orca-managed session, load the installed `orchestration` skill and its version-matched guide before worker operations. Use it for the entire supervised lifecycle.

For standalone Pi without a subagent tool, use the [Pi CLI path](../../../vendor/pi/swarm.md). It describes concurrent one-shot processes, private outputs, exit handling, and workspace limits. Consult it before launching Pi workers.

If no concurrent worker path is usable, report that limitation. Serial work does not satisfy a swarm request.
