#!/usr/bin/env bash
set -euo pipefail

# Optional home directory supports testing without changing the user's setup.
skills_home="${1:-$HOME}"
SRC="$skills_home/.skills"

link_skill() {
  local source="$1" destination="$2"
  if [[ -L "$destination" && "$destination" -ef "$source" ]]; then
    return 0
  fi
  if [[ -e "$destination" || -L "$destination" ]]; then
    printf 'Refusing to replace existing path: %s\n' "$destination" >&2
    return 1
  fi
  ln -s "$source" "$destination"
}

mkdir -p "$skills_home/.agents/skills" "$skills_home/.claude/skills" "$skills_home/.pi/agent/prompts"
for dir in "$SRC"/*/; do
  [[ -f "$dir/SKILL.md" ]] || continue
  dir="${dir%/}"
  name="${dir##*/}"
  link_skill "$dir" "$skills_home/.agents/skills/$name"
  link_skill "$dir" "$skills_home/.claude/skills/$name"
  link_skill "$dir/SKILL.md" "$skills_home/.pi/agent/prompts/$name.md"

  # Remove only a redundant symlink to this skill, never a separate installation.
  legacy="$skills_home/.codex/skills/$name"
  if [[ -L "$legacy" && "$legacy" -ef "$dir" ]]; then
    rm -- "$legacy"
  fi
done
