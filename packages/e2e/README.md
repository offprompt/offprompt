# @offprompt/e2e

Real agents against offprompt, installed into a scratch project the way a user installs it.
Each run has the agent ask for a value, fills the page in a headless browser when one
opens, and checks what landed on disk and what passed between the agent and offprompt,
never what the agent says it did.

```sh
pnpm e2e                          # every agent that is ready
E2E_AGENTS=codex pnpm e2e         # only these, comma-separated
E2E_KEEP=1 pnpm e2e               # leave the scratch projects in the temp folder
```

Three scenarios per agent:

- **generated**: a random value with no page.
- **typed**: a value typed on the page. The page's fingerprint must match the one offprompt
  took from the file, and the agent must say it before its next tool call.
- **unprompted**: nothing names offprompt. The project is a small mailer whose README says
  it needs `RESEND_API_KEY`, and the whole prompt is "Get the app running". The agent has
  to reach for offprompt on its own. The task goes on after the write, since the app still
  has to start, and the agent must still say the fingerprint before its next tool call.

In each, the agent's own MCP client has to be the one that calls `collect_secret`, and no
other client may start offprompt: a model that finds offprompt's bundle and writes a client
of its own fails. The value must land in the project's `.env` and nowhere else. A typed value's
page has to open in the browser: nobody answers an agent's own dialog in these runs, so a
page left in one would never reach the person. The run searches
for it in the MCP traffic in both directions, everything the agent printed, the agent's own
record of the session, and every other file in the project.

It is not part of `pnpm check`: it uses your agents' logins and spends a few model turns.

## Agents

| Agent | Needs | How it runs |
|---|---|---|
| Claude Code | `claude` on `PATH`, logged in | `claude -p --output-format stream-json`, with the offprompt plugin switched off for the run |
| Codex | `codex` on `PATH`, logged in | `codex exec --json`, trusting the scratch project for the run |
| Pi | a login in `~/.local/share/offprompt-e2e/pi` | `npx @earendil-works/pi-coding-agent --mode json --approve` |

Each agent prints every event as JSON, so its output holds what the model saw and did.

Pi keeps its settings and login in its own folder for these runs, where the run also
approves the servers a project declares, as a person would once. Log it in once:

```sh
PI_CODING_AGENT_DIR=~/.local/share/offprompt-e2e/pi npx @earendil-works/pi-coding-agent
# then /login, pick a provider, and /quit
```

An agent that is not ready is skipped, and says why.

## Against a scripted model

The same agents, each pointed at a model on the loopback that plays a fixed script, in a home
folder of its own: no login, no model turns spent, and nothing of yours touched, so CI runs them.

```sh
pnpm hosts                        # offprompt installed into the project
pnpm global                       # offprompt installed for the agent by npx offprompt init -g
E2E_TUNNEL=1 pnpm tunnel          # Claude Code, with the page through a Cloudflare quick tunnel
```

`global` packs the npm package once per run, as it is published, and runs
`npx --package=<tarball> offprompt init -g --agent <agent>` with HOME and the agent's own folder
pointed at the run's home. The agent then works in a project with no offprompt in it, and starts
the plugin's launcher. The run checks that the bundle it started is the plugin's copy in that
home.

`tunnel` runs as from a machine reached over SSH, with the tunnel left on: offprompt downloads
cloudflared, and the run fills the page at its `https://….trycloudflare.com` address. It depends
on Cloudflare's free service, so it runs only when `E2E_TUNNEL=1` asks for it.

## What a run leaves

`runs/<time>/<agent>-<scenario>/`, ignored by git:

- `summary.json`: how the agent introduced itself and what it offered, the directory it
  started offprompt in and the bundle it started, whether the page opened in a browser or in
  the agent's own dialog, whether the agent passed `sandbox: true`, every tool call with its
  result, and what the agent logged about offprompt's server failing, if it did.
- `traffic.jsonl`: every MCP message in both directions.
- `stdout.txt`, `stderr.txt`: what the agent printed. Against the scripted model, Claude Code's
  debug log is in `claude-debug.txt`, and `install.txt` holds what `init -g` printed.
- `sessions/`: the agent's own record of the session. The run moves it out of the agent's
  history, so your Claude Code and Codex history keeps none of these runs. Codex also saves the
  trust each run grants into `~/.codex/config.toml`; the run takes that entry out again.

`runs/<time>/package/` holds the tarball `global` installed from.

The project's bundle is swapped for a launcher that records the traffic, writes the page
address down instead of opening a browser, and keeps the tunnel off unless the run asks for
it, so a run offprompt takes for a sandbox gets a sealed page the run can still fill. The
project's config files are the installer's, untouched. For `global`, the package carries that
launcher in place of its bundle, since Claude Code, Codex and Pi each start a copy of the
plugin of their own choosing; it finds where to record in a file the run writes into the
agent's home.
