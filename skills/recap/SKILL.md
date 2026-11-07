---
name: recap
description: Summarize the current conversation when the user asks for a session recap or to be caught up on this session.
compatibility: Requires access to the current conversation; no tools or external dependencies required.
---

# Recap

Give the user a concise snapshot of this session, not a handoff or a new work plan. Produce only the recap. Use the conversation already available, including recorded tool results; do not inspect other sessions, refresh external state, write files, or resume work.

## Review and select

Review the available session for its goal, latest outcome, completed work, meaningful issues or discoveries, and eligible next steps. Later corrections and results supersede earlier claims. Distinguish proposed, attempted, completed, and verified work; report checks only as recorded, not as fresh verification. If earlier context is unavailable, briefly state that limitation.

Group related work by outcome rather than narrating tool calls. Research and decisions can be completed work; describe them as such rather than implying implementation. Include issues that affected the outcome, explain an important decision, or remain consequential, and say whether they were resolved or remain open. Preserve material verification gaps, blockers, and security concerns ahead of incidental detail. Exclude secrets and repetitive troubleshooting history.

Include a next step only when it is unfinished work from the agreed plan, or a concrete recommendation supported by a discovery in this session that would provide high value or address a security vulnerability. For a new recommendation, make its connection to the discovery clear and distinguish it from agreed work. Generic improvement suggestions do not qualify. Suggestions do not authorize execution.

## Write

Open with one sentence describing the goal and outcome. Follow with short bullets under the applicable headings:

- **Completed** — actual outcomes, including verification status when material.
- **Issues & discoveries** — consequential findings and their resolution or remaining uncertainty.
- **Next steps** — only actions that pass the gate above.

Omit empty sections. For a discussion-only session, summarize conclusions without inventing accomplishments. Use plain language, no nested lists, and no repeated points across sections.

Keep the entire recap within **200 words**, including headings and notes. This is a ceiling, not a target. If complexity forces useful detail out, include this note within the limit:

> This session was complex; this recap covers the essentials. You can ask for more detail.

Use the note only when useful detail was omitted, not as a routine footer. Missing context is a separate limitation, not evidence of complexity.

Before responding, check that every completion claim is supported, each next step qualifies, material unresolved risks remain visible, and the whole response fits the word limit. Compress or remove lower-value detail until it does.
