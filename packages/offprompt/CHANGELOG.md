# offprompt

## 0.3.1

### Patch Changes

- f7774c4: Each GitHub release carries offprompt as an MCP Bundle, `offprompt-<version>.mcpb`, which Smithery and other hosts that install bundles take as it is. It holds the same server as the npm package, started with `node`.
- 67d3076: The MCP Bundle lists each tool with its input schema, which Smithery needs to take the bundle.

## 0.3.0

### Minor Changes

- c2c475b: "Get it" can open the page for your own project. An agent can give each key a `link`: the project, account or organization it is for, read from the project, and "Get it" opens that one's page instead of one that asks which. To start with that is Supabase's secret and publishable keys (the project ref), Cloudflare's R2 keys (the account ID) and Sentry's auth token (the organization slug). For a key offprompt does not know, such as an internal tool's token, the agent can give the https address where it is made. The page shows it as the agent's suggestion with its whole host, apart from offprompt's own links, and opens it only once you confirm that host. The agent hears which links were used, and why any was dropped.

### Patch Changes

- b3bcd2c: The plugin carries an icon for Anthropic's plugin directory, and when its server is missing, the launcher points at the installation docs instead of naming a command to run.

## 0.2.0

### Minor Changes

- 0745122: A value its checks refuse can be written anyway. Providers change their key formats, and until offprompt catches up a working key could not be written. Once a value breaks only its own field's checks, a box under it reads "Write it anyway"; ticked, the field counts as ready and its broken checks stay in view. The agent hears which keys were written anyway, under `written_anyway`, so it knows where to look if the service refuses one. offprompt's own checks of the file, its length cap and whether a `.env` can hold the value, still hold.

### Patch Changes

- 0745122: From a cloud sandbox, an agent whose host lets it ask you a question, as Conductor and Claude Code do, puts the page's link in a question as well as in its message. A question stays in front of you until you answer it; in a Conductor cloud workspace the agent's messages with the link were folded away under the waits that followed them. The link also comes with a short line saying what it is for, rather than alone.
- 0745122: A value asked for as a URL may use any scheme followed by a host, such as `wss://` for a websocket or `redis://`, where only `http://` and `https://` passed before. A provider's URL that is always a web address, such as a Sentry DSN, still has to start with `http://` or `https://`.
- 0745122: A Vercel token passes its checks in the form Vercel has issued since February 2026, `vcp_` followed by letters, numbers and underscores, as well as the older tokens of 24 letters and numbers. Until now only the older form passed, so a new token could not be written.

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
