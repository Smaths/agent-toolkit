# pi-away — on-demand recap

This local fork provides the [`/recap` prompt template](prompts/recap.md). It replaces the upstream idle timer and widget with a normal conversation turn, invoked only when requested.

Run `/recap` to summarize the current goal, progress, and next step in at most 40 words. It asks the model to use existing conversation context, distinguish reported progress from verified results, and acknowledge missing context. It works without a minimum message count, including after one long task or in a resumed session.

See the [collection guide](../README.md) for local loading, costs, and limitations. The upstream npm package still contains the automatic extension; it is not this fork.

## License

MIT. Original author and local adaptations are recorded in [SOURCES.md](../../../../SOURCES.md).
