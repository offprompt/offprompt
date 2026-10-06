# offprompt

## 0.1.3

### Patch Changes

- 58bc513: From a cloud sandbox, the page's link stays in front of you until you have typed the values. Every wait hands the agent the link again, for whatever it writes to you, its last message included, and the agent waits without doing other work in between. In a Conductor cloud workspace, a link shown once partway through a turn was folded away with the rest of the turn, and the agent went on saying it was waiting. Once a link expires unused, the agent is told to say so and make a new one.

## 0.1.2

### Patch Changes

- c5877eb: The server is a third smaller, 1.2 MB instead of 1.7 MB: it no longer carries zod's error messages in 40 languages it never shows.

## 0.1.1

### Patch Changes

- cdfb2af: From a cloud sandbox, the agent now always gets the page's link to show you, even when its host offers the link in a dialog of its own: in Conductor's cloud workspaces that dialog never appeared, so the link never reached you. On your own machine, a link dialog nobody answers no longer keeps offprompt from opening your browser.

## 0.1.0

The first release.

- `npx offprompt init` puts offprompt into a project for Claude Code, Codex, Cursor and Pi. `init -g` installs it for you, in every project, in those and in every other agent add-mcp knows.
- `collect_secret` asks you for the values a task needs on a page in your browser, with checks for the keys of 65 providers, and writes them to `.env` or another file. The agent gets the names and a four-emoji fingerprint, never the values.
- From a cloud sandbox, the page is reached through a Cloudflare tunnel or the sandbox's port forwarding, and your browser encrypts the values to a key only the sandbox holds. `await_secret` waits for them.
