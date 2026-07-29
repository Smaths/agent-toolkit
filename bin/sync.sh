#!/usr/bin/env bash
set -euo pipefail
SRC="$HOME/.skills"
mkdir -p ~/.claude/skills ~/.codex/skills ~/.pi/agent/prompts
for dir in "$SRC"/*/; do
  name=$(basename "$dir")
  [ "$name" = "bin" ] && continue
  ln -sfn "$dir" ~/.claude/skills/"$name"
  ln -sfn "$dir" ~/.codex/skills/"$name"
  [ -f "$dir/SKILL.md" ] && ln -sfn "$dir/SKILL.md" ~/.pi/agent/prompts/"$name".md
done
