# AGENTS.md

What an agent working on this repository needs beyond the code. Setup, the test commands, the
layout and the code style are in [CONTRIBUTING.md](CONTRIBUTING.md); read it first.

## What offprompt is

An MCP server a coding agent calls when a task needs a value only the human has: an API key, a
token, a password. offprompt opens a page in the human's browser, checks each value against what
its registry knows of the key, and writes it into the project's `.env` or another file. The agent
gets the key names and a four-emoji fingerprint, never the values. From a cloud sandbox the page
is reached through a Cloudflare tunnel, and the browser seals the values to a key only the sandbox
holds.

The npm package `offprompt` is assembled from two workspace packages: the server
(`packages/offprompt`, built into one bundle, `dist/mcp.mjs`) and the installer
(`packages/install`, the `offprompt` command and the plugin directory). `pnpm package <dir>`
assembles it; the folder it makes is both the npm package and the plugin.

## Before changing behaviour

- [DESIGN.md](DESIGN.md) is the design offprompt implements. Read the section a change touches
  first. A change in behaviour updates DESIGN.md and the docs page that describes it
  (`apps/docs/src/pages`) in the same change.
- What the agent reads is part of the product: the tools' descriptions in
  `packages/offprompt/src/mcp/tools.ts`, the server's instructions in `src/mcp/main.ts`, and
  each result's `note`. Change them with the same care as code; the build writes what the
  launcher answers before the server starts (`dist/handshake/`) from them.
- `packages/e2e` runs the real Claude Code, Codex and Pi against a scripted model. A change to
  how offprompt starts, presents the page or answers a call is checked there:
  `pnpm --filter @offprompt/e2e hosts`.

## Rules that are easy to break

- **Releases.** A change to the source of `packages/offprompt` or `packages/install` comes with a
  changeset (`pnpm changeset`); CI fails a pull request without one. Never edit a version by
  hand, and never publish by hand: merging the "Release offprompt" pull request does both.
- **Pictures of the page are the page.** Every picture of offprompt's page on the site and in
  the docs is rendered from `offprompt/showcase` for a sample request. To change one, change
  its sample (`apps/site/src/lib/samples.ts`, `apps/docs/scripts/samples.mjs`); never draw it.
  The docs' video is recorded from the page too: `pnpm --filter @offprompt/docs video`.
- **Windows keeps working.** CI runs Linux, Windows and macOS. Spawn programs with
  `cross-spawn`, look commands up with `PATHEXT`, and write paths others read with forward
  slashes. The plugin's launcher, `launcher/offprompt-mcp`, is a POSIX shell script, so on
  Windows `init -g` has the plugin start `node dist/mcp.mjs` instead.
- **No `bin/` in the plugin.** Claude Code puts a plugin's top-level `bin/` on the agent's
  `PATH`, and claude.ai refuses a plugin that has one, so the launcher lives in `launcher/`.
- **No real secrets in tests.** Tests use example values, which `exampleFor` makes from a
  key's rules. A test that writes a value writes a made-up one, into a scratch folder.
- **The playground never names offprompt.** `packages/playground/project` is a project an agent
  is dropped into to see whether it reaches for offprompt unprompted, so nothing in it may
  mention offprompt.
- **Never read a written `.env`.** offprompt's own rule for agents holds here too: a value a
  file holds stays out of the transcript.
- **The registry.** A provider is a folder under
  `packages/offprompt/src/registry/providers/` and a line in `registry.ts`. Each key's rules
  must let `exampleFor` make a value that passes them, or the key carries an `example`.

## Writing

Messages, results, docs and comments say what happens, in plain sentences, as the page does.
Commits follow the style in CONTRIBUTING.md: a type, a scope, and a subject saying what is now
true.
