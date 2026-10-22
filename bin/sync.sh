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

# Remove links created before docs-reality-sync was renamed to sync-docs.
remove_owned_link "$SRC/docs-reality-sync" "$skills_home/.agents/skills/docs-reality-sync"
remove_owned_link "$SRC/docs-reality-sync" "$skills_home/.claude/skills/docs-reality-sync"
remove_owned_link "$SRC/docs-reality-sync" "$skills_home/.codex/skills/docs-reality-sync"
remove_owned_link "$SRC/docs-reality-sync/SKILL.md" "$skills_home/.pi/agent/prompts/docs-reality-sync.md"

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
