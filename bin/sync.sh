#!/usr/bin/env bash
set -euo pipefail
SRC="$HOME/.skills"
mkdir -p ~/.claude/skills ~/.codex/skills
for dir in "$SRC"/*/; do
  name=$(basename "$dir")
  [ "$name" = "bin" ] && continue
  ln -sfn "$dir" ~/.claude/skills/"$name"
  ln -sfn "$dir" ~/.codex/skills/"$name"
done
