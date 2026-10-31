# pi-heads-up — on-demand second look

This local fork provides the [`/heads-up` prompt template](prompts/heads-up.md). It replaces the upstream automatic review and widget with a normal conversation turn, invoked only when requested.

Run `/heads-up` to flag one consequential concern that the last task's final reply did not clearly disclose, in at most 40 words. It asks for the concern's basis, distinguishes possible risks from confirmed problems, and returns `NONE` when nothing qualifies. Already-disclosed caveats and minor issues do not qualify. There is no tool-count gate.

This is a second opinion about the conversation, not independent verification of repository state. See the [collection guide](../README.md) for local loading, costs, and limitations. The upstream npm package still contains the automatic extension; it is not this fork.

## License

MIT. Original author and local adaptations are recorded in [SOURCES.md](../../../../SOURCES.md).
