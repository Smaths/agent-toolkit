#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s [--dry-run] [--with-orca] [home]\n' "$0" >&2
  exit 2
}

mode=apply
with_orca=0
skills_home=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) mode=preview ;;
    --with-orca) with_orca=1 ;;
    -*) usage ;;
    *)
      [[ -z "$skills_home" ]] || usage
      skills_home="$arg"
      ;;
  esac
done
skills_home="${skills_home:-$HOME}"
if [[ ! -d "$skills_home" ]]; then
  printf 'Home directory does not exist: %s\n' "$skills_home" >&2
  exit 1
fi
skills_home="$(cd "$skills_home" && pwd -P)"
# The checkout is the parent of this script's directory, independent of HOME or cwd.
SRC="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"

if [[ ! -f "$SRC/README.md" || ! -f "$SRC/bin/sync.sh" || ! -d "$SRC/skills" ]]; then
  printf 'Missing toolkit contents at %s (expected README.md, bin/sync.sh, and skills/).\n' "$SRC" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  printf 'Python 3 is required to identify owned links.\n' >&2
  exit 1
fi

skills=()
for dir in "$SRC"/skills/*/; do
  [[ -f "$dir/SKILL.md" ]] || continue
  skills+=("${dir%/}")
done
if (( ${#skills[@]} == 0 )); then
  printf 'No portable skills found in %s/skills/.\n' "$SRC" >&2
  exit 1
fi
if (( with_orca )); then
  orca_count=0
  for dir in "$SRC"/vendor/orca/skills/*/; do
    [[ -f "$dir/SKILL.md" ]] || continue
    skills+=("${dir%/}")
    ((orca_count+=1))
  done
  if (( orca_count == 0 )); then
    printf 'No Orca skills found in %s/vendor/orca/skills/.\n' "$SRC" >&2
    exit 1
  fi
fi

link_target() {
  python3 -c 'import os, sys
p = sys.argv[1]
print(os.path.abspath(os.path.join(os.path.dirname(p), os.readlink(p))))' "$1"
}

is_old_checkout_link() {
  local source="$1" destination="$2" target old
  [[ "$source" == "$SRC/"* && -L "$destination" ]] || return 1
  target="$(link_target "$destination")"
  for old in "$skills_home/.skills" "$skills_home/.agent-toolkit"; do
    if [[ "$old" != "$SRC" && "${target%/}" == "$old/${source#"$SRC/"}" ]]; then
      return 0
    fi
  done
  return 1
}

is_owned_link() {
  local source="$1" destination="$2" target
  [[ -L "$destination" ]] || return 1
  if [[ "$destination" -ef "$source" ]]; then
    return 0
  fi
  # Normalize even broken relative links left by a repository move.
  target="$(link_target "$destination")"
  [[ "${target%/}" == "${source%/}" ]] || is_old_checkout_link "$source" "$destination"
}

report() {
  [[ "$mode" == check ]] || printf '%s %s\n' "$1" "$2"
}

# The portable swarm replaces the former Orca-only source.
moved_source() {
  if [[ "$1" == "$SRC/skills/swarm" ]]; then
    printf '%s' "$SRC/vendor/orca/skills/swarm"
  fi
}

link_skill() {
  local source="$1" destination="$2" previous="${3:-}" moved="${4:-}"
  if is_old_checkout_link "$source" "$destination"; then
    report MIGRATE "$destination"
    if [[ "$mode" == apply ]]; then
      rm -- "$destination"
      ln -s "$source" "$destination"
    fi
    return 0
  fi
  if is_owned_link "$source" "$destination"; then
    report KEEP "$destination"
    return 0
  fi
  if { [[ -n "$previous" ]] && is_owned_link "$previous" "$destination"; } ||
     { [[ -n "$moved" ]] && is_owned_link "$moved" "$destination"; }; then
    report MIGRATE "$destination"
    if [[ "$mode" == apply ]]; then
      rm -- "$destination"
      ln -s "$source" "$destination"
    fi
    return 0
  fi
  if [[ -e "$destination" || -L "$destination" ]]; then
    printf 'Refusing to replace existing path: %s\n' "$destination" >&2
    return 1
  fi
  report LINK "$destination"
  if [[ "$mode" == apply ]]; then
    ln -s "$source" "$destination"
  fi
}

remove_owned_link() {
  local source="$1" destination="$2"
  if is_owned_link "$source" "$destination"; then
    report REMOVE "$destination"
    if [[ "$mode" == apply ]]; then
      rm -- "$destination"
    fi
  fi
}

# A collision between source names or a symlinked skills root is not a safe install.
for (( i=0; i<${#skills[@]}; i++ )); do
  for (( j=0; j<i; j++ )); do
    if [[ "${skills[i]##*/}" == "${skills[j]##*/}" ]]; then
      printf 'Duplicate skill name: %s\n' "${skills[i]##*/}" >&2
      exit 1
    fi
  done
done
for agent in .agents .claude; do
  destination="$skills_home/$agent/skills"
  if [[ -L "$destination" || ( -e "$destination" && ! -d "$destination" ) ]]; then
    printf 'Refusing non-directory or symlinked skills root: %s\n' "$destination" >&2
    exit 1
  fi
done

# Check all destinations before making any changes.
requested_mode="$mode"
if [[ "$mode" != preview ]]; then
  mode=check
fi
conflicts=0
for dir in "${skills[@]}"; do
  name="${dir##*/}"
  moved="$(moved_source "$dir")"
  link_skill "$dir" "$skills_home/.agents/skills/$name" "$SRC/$name" "$moved" || conflicts=1
  link_skill "$dir" "$skills_home/.claude/skills/$name" "$SRC/$name" "$moved" || conflicts=1
done
if (( conflicts )); then
  exit 1
fi
mode="$requested_mode"

# Remove only owned links for renamed skills and the former plugin-as-skill link.
for old in docs-reality-sync commit-conventional; do
  remove_owned_link "$SRC/$old" "$skills_home/.agents/skills/$old"
  remove_owned_link "$SRC/$old" "$skills_home/.claude/skills/$old"
  remove_owned_link "$SRC/$old" "$skills_home/.codex/skills/$old"
  remove_owned_link "$SRC/$old/SKILL.md" "$skills_home/.pi/agent/prompts/$old.md"
done
for dir in "$SRC"/vendor/claude/mods/*/; do
  [[ -f "$dir/.claude-plugin/plugin.json" ]] || continue
  dir="${dir%/}"
  name="${dir##*/}"
  remove_owned_link "$dir" "$skills_home/.claude/skills/$name"
  remove_owned_link "$SRC/claude-mods/$name" "$skills_home/.claude/skills/$name"
done

# An omitted Orca skill is not enabled. Remove only links this repository owns.
if (( ! with_orca )); then
  for dir in "$SRC"/vendor/orca/skills/*/; do
    [[ -f "$dir/SKILL.md" ]] || continue
    dir="${dir%/}"
    name="${dir##*/}"
    for agent in .agents .claude .codex; do
      destination="$skills_home/$agent/skills/$name"
      remove_owned_link "$dir" "$destination"
      remove_owned_link "$SRC/$name" "$destination"
    done
    prompt="$skills_home/.pi/agent/prompts/$name.md"
    remove_owned_link "$dir/SKILL.md" "$prompt"
    remove_owned_link "$SRC/$name/SKILL.md" "$prompt"
  done
fi

if [[ "$mode" == apply ]]; then
  mkdir -p "$skills_home/.agents/skills" "$skills_home/.claude/skills"
fi
for dir in "${skills[@]}"; do
  name="${dir##*/}"
  moved="$(moved_source "$dir")"
  if [[ "$mode" == apply ]]; then
    link_skill "$dir" "$skills_home/.agents/skills/$name" "$SRC/$name" "$moved"
    link_skill "$dir" "$skills_home/.claude/skills/$name" "$SRC/$name" "$moved"
  fi

  # Remove only redundant links to this skill, never separate installations.
  legacy="$skills_home/.codex/skills/$name"
  remove_owned_link "$dir" "$legacy"
  remove_owned_link "$SRC/$name" "$legacy"
  if [[ -n "$moved" ]]; then remove_owned_link "$moved" "$legacy"; fi

  prompt="$skills_home/.pi/agent/prompts/$name.md"
  remove_owned_link "$dir/SKILL.md" "$prompt"
  remove_owned_link "$SRC/$name/SKILL.md" "$prompt"
  if [[ -n "$moved" ]]; then remove_owned_link "$moved/SKILL.md" "$prompt"; fi
done
