# Research behind swarm

These primary sources support the workflow. They do not establish universal context percentages, agent counts, or rankings for local agent profiles.

## Keep delegation conditional

Anthropic's [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) recommends starting with the simplest solution. It distinguishes routing, independent parallel tasks, and an orchestrator that discovers subtasks as work proceeds.

Swarm uses a planning pass to discover boundaries. It permits a single task when coordination would add cost without useful parallelism.

## Bound each worker's task

Anthropic's [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) reports that vague delegation caused duplicated work and gaps. Its worker descriptions specify an objective, output format, tools and sources, and task boundaries. It also describes separate context windows and parallel exploration.

The article warns that coding often has fewer independent tasks than research. Its reported token cost of roughly 15 times a chat interaction belongs to that system's data, not a general cost estimate for swarm.

Swarm therefore requires owned outputs, stable inputs, checks for shared state, an integration owner, and bounded result summaries. Separate worktrees do not resolve incompatible contracts or shared external resources.

## Reserve context and retain evidence outside the conversation

Anthropic's [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) describes degraded retrieval as context grows, selective context loading, persistent notes, and focused subagents that return condensed summaries.

Swarm budgets each worker's full session and the coordinator's context. It gives workers selected source material instead of complete parent transcripts and records task state for later sessions. Its 70% headroom target and 50% minimum come from the user's requested policy. None of the cited sources proves those numbers are optimal or guarantees that a task will fit. Estimates need calibration against the actual model, runtime, and task class.

## Match model capability to demonstrated need

OpenAI's [A practical guide to building AI agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/) recommends establishing a capable-model performance baseline, then trying smaller models against the same evaluations. It also recommends explicit instructions, exit conditions, bounded retries, and human intervention for high-risk actions.

Anthropic's [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) describes routing easy tasks to cheaper models and hard tasks to more capable models.

Swarm uses those principles for model routing. Soul, Astra, and Luna are user-supplied names whose mappings require local verification. Opus and Haiku still require a configured model ID and verified availability. This research does not establish a price or capability comparison among those five names.

## Calibrate task sizes and specify dependency inputs

Poteto's [orchestration playbook](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/orchestrate.md) sends one representative unit through the workflow before wider execution. It uses the pilot to check the brief, verification method, and unit size. It also treats a dependency as information the downstream worker must receive, not just an ordering constraint.

Swarm adopts that pilot step for unfamiliar or repeated work without comparable measurements. It records observed context use and revises the remaining tasks before wider execution. Each dependency names the accepted input and how the consumer accesses it. One pilot does not prove that every later task will fit. Poteto's 70% elapsed-time cutoff is unrelated to swarm's 70% context-headroom target.

## Establish verification before changes

Poteto's [figure-it-out skill](https://github.com/cursor/plugins/blob/main/pstack/skills/figure-it-out/SKILL.md) tackles risky unknowns first, establishes verification before implementation, and captures the pre-change baseline. It distinguishes inconclusive results from verified results.

Swarm checks that each task's verification method and environment are available. Missing verification becomes a prerequisite rather than a surprise at the end of implementation. Baselines apply when acceptance requires a comparison, not as a requirement for unrelated documentation or new behavior.

## Evaluate plans rather than self-reports

Poteto's [evaluation playbook](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md) uses the same request for each candidate, withholds the scoring rubric, and hides candidate identities from the judge. It checks outputs and available execution records rather than relying on candidates' claims.

Swarm's evaluation cases apply those ideas to plan quality. They do not require Cursor-specific tools or authorize launching workers. A written case or manual walkthrough is not a completed model evaluation.

## Keep the skill portable

The [Agent Skills specification](https://agentskills.io/specification) defines a skill directory with `SKILL.md`, required name and description fields, and optional references. It recommends keeping the main file below 500 lines and loading references when needed.

Swarm keeps its planning rules in `SKILL.md` and templates in a separate reference. Execution uses the installed orchestration skill rather than copying version-sensitive commands.

## Local defaults to evaluate

The three-worker concurrency cap and one-correction limit are conservative starting policies, not results from the sources. Adjust them to observed capacity, cost constraints, and task risk. More agents increase total context use even when each worker stays within its own budget.

Evaluate the skill on real plans by recording missed dependencies, shared-write conflicts, acceptance failures, context overruns, coordination cost, and incorrect cheap-model assignments. Use the review scenarios before changing defaults. Static checks and self-review cannot establish live worker reliability.
