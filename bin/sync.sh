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

remove_owned_link() {
  local source="$1" destination="$2" target
  [[ -L "$destination" ]] || return 0
  if [[ "$destination" -ef "$source" ]]; then
    rm -- "$destination"
    return 0
  fi
  target="$(readlink "$destination")"
  if [[ "${target%/}" == "${source%/}" ]]; then
    rm -- "$destination"
  fi
}

# Remove owned links for renamed skills; preserve separate installations.
for old in docs-reality-sync commit-conventional; do
  remove_owned_link "$SRC/$old" "$skills_home/.agents/skills/$old"
  remove_owned_link "$SRC/$old" "$skills_home/.claude/skills/$old"
  remove_owned_link "$SRC/$old" "$skills_home/.codex/skills/$old"
  remove_owned_link "$SRC/$old/SKILL.md" "$skills_home/.pi/agent/prompts/$old.md"
done

mkdir -p "$skills_home/.agents/skills" "$skills_home/.claude/skills"
for dir in "$SRC"/*/; do
  [[ -f "$dir/SKILL.md" ]] || continue
  dir="${dir%/}"
  name="${dir##*/}"
  link_skill "$dir" "$skills_home/.agents/skills/$name"
  link_skill "$dir" "$skills_home/.claude/skills/$name"

  # Remove only redundant links to this skill, never separate installations.
  legacy="$skills_home/.codex/skills/$name"
  remove_owned_link "$dir" "$legacy"

  prompt="$skills_home/.pi/agent/prompts/$name.md"
  remove_owned_link "$dir/SKILL.md" "$prompt"
done

# Claude mods are plugins, not agent skills. Install only plugin directories.
for dir in "$SRC"/claude-mods/*/; do
  [[ -f "$dir/.claude-plugin/plugin.json" ]] || continue
  dir="${dir%/}"
  name="${dir##*/}"
  link_skill "$dir" "$skills_home/.claude/skills/$name"
done
