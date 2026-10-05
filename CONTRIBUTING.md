# Contributing

A security problem goes through [SECURITY.md](SECURITY.md), not an issue or a pull request.

## Setup

You need Node 22.13 or later and pnpm 11. The package offprompt builds runs on Node 22, and the
workspace's tools need 22.13.

```sh
pnpm install
pnpm exec turbo run typecheck lint test --concurrency=1
```

That is what CI runs, on Linux, Windows and macOS. The tests build offprompt first and run
against the built bundle, as an agent would start it.

## Browser tests

The page's tests, in Chromium, Firefox and WebKit:

```sh
pnpm --filter offprompt exec playwright install
pnpm test:browser
```

## Agents, end to end

`packages/e2e` runs real agents against offprompt installed in a scratch project. The `hosts`
suite runs the real Claude Code, Codex and Pi against a scripted model, so it needs no account,
and CI runs it on every pull request. To run it locally, with the versions CI pins:

```sh
npm install --global @anthropic-ai/claude-code@2.1.289 @openai/codex@0.159.3
pnpm exec turbo run build --filter offprompt --filter @offprompt/install
pnpm --filter @offprompt/e2e exec playwright install chromium
pnpm --filter @offprompt/e2e hosts
pnpm --filter @offprompt/e2e global                  # with offprompt installed by npx offprompt init -g
E2E_TUNNEL=1 pnpm --filter @offprompt/e2e tunnel     # a page through a real Cloudflare quick tunnel
```

Pi comes through `npx`. `pnpm e2e` runs the same agents with your own logins and real models,
which spends model turns, so CI leaves it out. [packages/e2e/README.md](packages/e2e/README.md)
has both.

## Trying a change by hand

```sh
pnpm agents --project ~/projects/some-project  # installs this checkout into a project, as npx offprompt init does
pnpm preview /tmp/scratch-project              # serves sample requests, to look at the page
pnpm playground                                # makes a project that needs secrets, to try an agent on
pnpm site                                      # offprompt.dev, from apps/site
pnpm docs                                      # docs.offprompt.dev, from apps/docs
```

## Layout

```
packages/offprompt/   the MCP server and its page, built into one bundle
packages/install/     the installer, the plugin directory and its launcher
packages/e2e/         real agents against offprompt in a scratch project
packages/playground/  a project that needs secrets, for trying agents by hand
apps/site/            offprompt.dev, a Next.js app
apps/docs/            docs.offprompt.dev, a Vocs app
```

[DESIGN.md](DESIGN.md) is the design offprompt implements. A change in behaviour updates it, and
the docs page that describes it, in the same pull request.

## Adding a provider

A provider is one folder under `packages/offprompt/src/registry/providers/` and one line in
`registry.ts`. [Adding a provider](https://docs.offprompt.dev/adding-a-provider) walks through
it. If you know the provider but would rather not write it, open a provider request.

## Code

ESLint enforces most of this; `pnpm lint` checks it.

- TypeScript, strict, ES modules. In `packages/`, relative imports end in `.js`.
- Arrow functions, never `function` declarations or classes.
- No `for` loops and no `let`: build values with `map`, `filter`, `flatMap` and `reduce`.
- `type` rather than `interface`, and `readonly` on what a function does not change.
- No `any`, no non-null `!`, and `===` always.
- A comment says why, or what a name cannot, in a full sentence.
- No formatter is set up. Follow the file you are in: two spaces, single quotes, no semicolons.
- Tests use Vitest. A provider's tests sit beside it, the rest in each package's `tests/`.

Messages, results and docs say what happens in plain sentences, as the page does.

## Commits

A type, a scope where one fits, and a lowercase subject that says what is now true:

```
feat(registry): Clerk, Auth0 and WorkOS
fix(install): Codex passes offprompt the variables it reads
docs: how a .env value is quoted, so a shell that sources the file reads what dotenv reads
```

Types are `feat`, `fix`, `docs`, `test`, `refactor`, `ci` and `chore`. Scopes are the part
touched, such as `offprompt`, `page`, `registry`, `install`, `e2e` or `site`. One logical change
per commit.
