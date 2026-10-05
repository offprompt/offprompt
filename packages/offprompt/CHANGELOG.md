# offprompt

## 0.1.0

The first release.

- `npx offprompt init` puts offprompt into a project for Claude Code, Codex, Cursor and Pi. `init -g` installs it for you, in every project, in those and in every other agent add-mcp knows.
- `collect_secret` asks you for the values a task needs on a page in your browser, with checks for the keys of 65 providers, and writes them to `.env` or another file. The agent gets the names and a four-emoji fingerprint, never the values.
- From a cloud sandbox, the page is reached through a Cloudflare tunnel or the sandbox's port forwarding, and your browser encrypts the values to a key only the sandbox holds. `await_secret` waits for them.
