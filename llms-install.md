# Installing offprompt (for AI agents such as Cline)

offprompt is a local stdio MCP server, published on npm as `offprompt`. It needs Node.js 22 or
later on the machine the agent runs on. It needs no API key, account or environment variable of
its own.

## Option A: add it to the MCP settings directly

Add this entry to the client's MCP settings file (for Cline: `cline_mcp_settings.json`).

```json
{
  "mcpServers": {
    "offprompt": {
      "command": "npx",
      "args": ["-y", "offprompt", "mcp"],
      "cwd": "/absolute/path/to/the/project",
      "timeout": 330
    }
  }
}
```

- **`cwd`** is the project offprompt writes into. Replace it with the absolute path of the
  project open in the editor. Cline's settings are global and Cline names no workspace to the
  server, so without `cwd` offprompt can't tell which project it is in and refuses with "no
  project to write to". When you switch projects, change `cwd` to the new one.
- **`timeout`** is in seconds. `collect_secret` waits while the human fills in the page, for up
  to five minutes, and Cline stops a tool call after 60 seconds unless told otherwise.

For other clients, the same `command` and `args` work. Clients that start the server in the
project's folder, or name the project as an MCP root, need no `cwd`. Give the client a tool
timeout of at least 330 seconds where it has one.

## Option B: let offprompt install itself

For Claude Code, Codex, Cursor and Pi, in the project's folder:

```sh
npx offprompt init        # this project, for each of those four found on the machine
npx offprompt init -g     # every project, for this user, in every agent found on the machine
npx offprompt list        # every agent offprompt knows, whether it was found, and how it reaches it
```

`init -g` sets up Cline too (`--agent cline` for the VS Code extension, `--agent cline-cli` for
the CLI), but it writes neither `cwd` nor `timeout` for it. For Cline, use Option A.

## Check that it works

The server exposes three tools: `collect_secret`, `await_secret` and `cancel_secret`.

Ask the agent to "add a STRIPE_SECRET_KEY to .env.local with offprompt". A page should open in
the browser on `127.0.0.1`. Paste a value and press the write button. The agent gets back the key
name, the file and a four-emoji fingerprint, never the value. Do not open, read or print the
file afterwards: that would put the value into the transcript.

Docs: https://docs.offprompt.dev
