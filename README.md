# offprompt

[![npm](https://img.shields.io/npm/v/offprompt)](https://www.npmjs.com/package/offprompt)
[![check](https://github.com/offprompt/offprompt/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/offprompt/offprompt/actions/workflows/check.yml)
[![MIT licence](https://img.shields.io/github/license/offprompt/offprompt)](LICENSE)

offprompt lets a coding agent ask you for a secret and have it land where the project needs it,
without the value passing through the model.

Agents need API keys. Paste one into the chat and it goes into the model's context, the
transcript on disk and the provider's logs, and stays there. offprompt gives the agent another
way to ask: a tool call that opens a page in your browser, from which the value goes straight
into the file. The transcript only ever sees the key's name.

## How it works

1. **The agent asks.** It calls `collect_secret` with every key it needs, why it needs them, and
   the file they go in, then waits inside the call.
2. **A page opens** on `127.0.0.1` in your browser. It says which agent is asking, what for, and
   which file it writes to. Each field checks its value as you type, paste or import it, and
   links to where the key is made.
3. **The file is written.** offprompt answers the agent with the key names, the file and a
   four-emoji [fingerprint](https://docs.offprompt.dev/guides/fingerprint), the same four your
   page shows. From then on the agent reads the values from the environment by name.

When the agent runs in a [cloud sandbox](https://docs.offprompt.dev/guides/cloud-sandboxes), it
gives you a link to the page instead. The page reaches you through a Cloudflare tunnel, and your
browser encrypts the values first, to a key only the sandbox holds.

The page itself can be tried at [offprompt.dev/playground](https://offprompt.dev/playground).

## Install

In a project's folder:

```sh
npx offprompt init
```

That puts the server in the project as `tools/offprompt/mcp.mjs`, one file that runs on `node`
alone, and declares it in the project config of each agent found on your machine. Commit those
files together with `tools/offprompt/`, and everyone on the project gets offprompt, as does every
cloud sandbox that clones it.

To have offprompt in every project you open instead, install it for yourself:

```sh
npx offprompt init -g
```

```sh
npx offprompt list        # every agent, whether it was found, and how offprompt reaches it
npx offprompt remove      # out of this project
npx offprompt remove -g   # out of every agent that has it
```

offprompt runs on Node 22 or later. [Installation](https://docs.offprompt.dev/installation) covers
choosing agents with `--agent`, and updating.

## Agents

offprompt is an MCP server, so any agent that speaks MCP can use it. `init` sets these up:

| Agent | In a project | With `-g` |
| --- | --- | --- |
| Claude Code | `.mcp.json` | A plugin |
| Codex | `.codex/config.toml` | A plugin |
| Cursor | `.cursor/mcp.json` | A copy of the plugin in `~/.cursor/plugins/local/` |
| Pi | `.pi/mcp-adapter.json`, through [pi-mcp-adapter](https://www.npmjs.com/package/pi-mcp-adapter) | A server in Pi's agent directory |
| Every other agent [add-mcp](https://github.com/neondatabase/add-mcp) knows, such as Gemini CLI, VS Code, OpenCode, Goose, Kiro CLI, Windsurf and Zed | No | A server in its MCP config |

Claude Code asks once before it starts a server a project declares. Codex and Pi read a
project's config only in a project you trust. [Agents](https://docs.offprompt.dev/guides/agents)
has each one in detail.

## Documentation

[docs.offprompt.dev](https://docs.offprompt.dev) has the rest: what the agent can ask for, the
page, every provider offprompt knows and the checks on its keys, the tools, cloud sandboxes and
troubleshooting. [offprompt.dev](https://offprompt.dev) shows offprompt at work.

## Security

A value goes from your browser to offprompt to the file, and never through the model, the
transcript, or a tool's arguments and results. offprompt does not guard the file once it is
written, or protect against another program running as you: the
[threat model](https://docs.offprompt.dev/security/threat-model) says what it covers, and
[SECURITY.md](SECURITY.md) how to report a problem.

## Development

A pnpm workspace, on Node 22.13 or later. From a checkout, `pnpm install`, then
`pnpm agents --project ~/projects/some-project` installs offprompt into a project the way
`npx offprompt init` does. [CONTRIBUTING.md](CONTRIBUTING.md) has the tests, the layout and how
to add a provider.

## Licence

MIT, for everything in this repository. The parts that are other people's work keep their
own terms, listed in `packages/offprompt/THIRD_PARTY_NOTICES.md` for the server, the
packages bundled into it and the page it serves, in `apps/site/THIRD_PARTY_NOTICES.md` for
offprompt.dev and in `apps/docs/public/third-party-notices.txt` for docs.offprompt.dev.
