# Curated Pi extensions

The [status-line](status-line/README.md) is the only package on this branch. It is a local fork of Thomas van Dongen's [pi-extensions](https://github.com/Pringled/pi-extensions), pinned and attributed in [SOURCES.md](../../../SOURCES.md). Its MIT license and Pi package manifest are alongside the source.

It offers a compact context gauge, model/branch, and session cost. The local fork handles unknown usage after compaction, totals all recorded session costs (including compaction and cache warming), and keeps extension status text. It replaces Pi's built-in footer, so the default cwd/session name, cache counters, auto-compaction indicator, and virtual-model route are not shown. On narrow terminals it drops branch and model before truncating the context/cost display.

**Not enabled by this repository:** `bin/sync.sh` does not install Pi extensions, and importing source does not load it into Pi. An explicit, separate request is required to change Pi configuration. For a manual one-invocation trial, see [the package README](status-line/README.md#local-trial).

The other imported packages are isolated in an experimental Orca worktree/branch rather than loaded by default. The three helper candidates (`pi-away`, `pi-next-prompt`, `pi-heads-up`) make extra full-context model calls; they remain experimental and need UI/cost evaluation before permanent enablement.
