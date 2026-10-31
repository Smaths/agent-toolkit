# pi-next-prompt — unsupported experiment

Retained as imported source for reference, **not recommended for enablement**. The implementation is unchanged; it is no longer a recommended helper trial. See the [collection guide](../README.md) for the on-demand alternatives.

The extension predicts a short next message after a reply and inserts grey text into an empty editor. Tab or right-arrow accepts it; Enter still submits it.

## Known limitations

- Awaits an extra full-context model request inside `agent_end`, before Pi's final settlement boundary.
- Inherits the session's thinking level. `maxTokens: 2000` is not a universal total-token ceiling; provider-specific thinking budgets may increase it. Returned usage is not recorded in normal session totals.
- Attempts prompt-prefix reuse, but request transformations and provider behavior mean cache reuse is not guaranteed.
- Does not abort on session shutdown or on typing while a request is pending; a late suggestion can appear after a draft is cleared.
- Patches the editor's rendered second line and intercepts Tab/right-arrow. Compatibility with other editor extensions and layouts is unverified.

These issues are intentionally not being expanded into a maintained autocomplete subsystem. Its manifest still exposes executable code if explicitly loaded. Nothing in this collection enables it automatically.

## License

MIT. Attribution is recorded in [SOURCES.md](../../../../SOURCES.md).
