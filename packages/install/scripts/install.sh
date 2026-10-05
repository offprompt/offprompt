#!/usr/bin/env bash
# Builds offprompt from this checkout and makes it available to every Claude Code session
# of this user. For a machine that has the repository but no published plugin to install
# from, such as a cloud sandbox image.
set -euo pipefail

here=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repository=$(CDPATH= cd -- "$here/../.." && pwd)
target="${1:-$HOME/.local/share/offprompt}"

# The version the repository pins, fetched on the spot where pnpm is not installed.
if command -v pnpm >/dev/null 2>&1; then
  pnpm=(pnpm)
else
  pnpm=(npx --yes "$(node -p "require('$repository/package.json').packageManager")")
fi

cd "$repository"
"${pnpm[@]}" install --frozen-lockfile
"${pnpm[@]}" package "$target"
# As a plugin, or where the claude CLI is not on PATH yet, as a server in ~/.claude.json.
"${pnpm[@]}" agents add -g --from "$target" --agent claude-code
