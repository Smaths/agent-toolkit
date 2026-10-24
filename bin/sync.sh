#!/usr/bin/env bash
set -euo pipefail

# Optional home directory supports testing without changing the user's setup.
skills_home="${1:-$HOME}"
SRC="$skills_home/.skills"

is_owned_link() {
  local source="$1" destination="$2" target
  [[ -L "$destination" ]] || return 1
  if [[ "$destination" -ef "$source" ]]; then
    return 0
  fi
  # Normalize even broken relative links left by a repository move.
  target="$(python3 -c 'import os, sys
p = sys.argv[1]
print(os.path.abspath(os.path.join(os.path.dirname(p), os.readlink(p))))' "$destination")"
  [[ "${target%/}" == "${source%/}" ]]
}

can_link_skill() {
  local source="$1" destination="$2" previous="${3:-}"
  if is_owned_link "$source" "$destination" ||
     { [[ -n "$previous" ]] && is_owned_link "$previous" "$destination"; }; then
    return 0
  fi
  if [[ -e "$destination" || -L "$destination" ]]; then
    printf 'Refusing to replace existing path: %s\n' "$destination" >&2
    return 1
  fi
}

link_skill() {
  local source="$1" destination="$2" previous="${3:-}"
  if [[ -n "$previous" ]]; then
    remove_owned_link "$previous" "$destination"
  fi
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
  local source="$1" destination="$2"
  if is_owned_link "$source" "$destination"; then
    rm -- "$destination"
  fi
}

# Check every destination before changing links, including renamed ones.
conflicts=0
for dir in "$SRC"/skills/*/ "$SRC"/vendor/orca/skills/*/; do
  [[ -f "$dir/SKILL.md" ]] || continue
  dir="${dir%/}"
  name="${dir##*/}"
  can_link_skill "$dir" "$skills_home/.agents/skills/$name" "$SRC/$name" || conflicts=1
  can_link_skill "$dir" "$skills_home/.claude/skills/$name" "$SRC/$name" || conflicts=1
done
for dir in "$SRC"/vendor/claude/mods/*/; do
  [[ -f "$dir/.claude-plugin/plugin.json" ]] || continue
  dir="${dir%/}"
  name="${dir##*/}"
  can_link_skill "$dir" "$skills_home/.claude/skills/$name" "$SRC/claude-mods/$name" || conflicts=1
done
if (( conflicts )); then
  exit 1
fi

# Remove owned links for renamed skills; preserve separate installations.
for old in docs-reality-sync commit-conventional; do
  remove_owned_link "$SRC/$old" "$skills_home/.agents/skills/$old"
  remove_owned_link "$SRC/$old" "$skills_home/.claude/skills/$old"
  remove_owned_link "$SRC/$old" "$skills_home/.codex/skills/$old"
  remove_owned_link "$SRC/$old/SKILL.md" "$skills_home/.pi/agent/prompts/$old.md"
done

mkdir -p "$skills_home/.agents/skills" "$skills_home/.claude/skills"
for dir in "$SRC"/skills/*/ "$SRC"/vendor/orca/skills/*/; do
  [[ -f "$dir/SKILL.md" ]] || continue
  dir="${dir%/}"
  name="${dir##*/}"
  link_skill "$dir" "$skills_home/.agents/skills/$name" "$SRC/$name"
  link_skill "$dir" "$skills_home/.claude/skills/$name" "$SRC/$name"

  # Remove only redundant links to this skill, never separate installations.
  legacy="$skills_home/.codex/skills/$name"
  remove_owned_link "$dir" "$legacy"
  remove_owned_link "$SRC/$name" "$legacy"

  prompt="$skills_home/.pi/agent/prompts/$name.md"
  remove_owned_link "$dir/SKILL.md" "$prompt"
  remove_owned_link "$SRC/$name/SKILL.md" "$prompt"
done

# Claude mods are plugins, not agent skills. Install only plugin directories.
for dir in "$SRC"/vendor/claude/mods/*/; do
  [[ -f "$dir/.claude-plugin/plugin.json" ]] || continue
  dir="${dir%/}"
  name="${dir##*/}"
  link_skill "$dir" "$skills_home/.claude/skills/$name" "$SRC/claude-mods/$name"
done
