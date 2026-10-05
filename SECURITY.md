# Security policy

## Supported versions

Fixes go into the latest release only. Before you report, check that the problem is still
there after `npx offprompt@latest init`, or `npx offprompt@latest init -g` if you installed
offprompt for yourself.

## Reporting a problem

Report it privately, through GitHub's private vulnerability reporting:

https://github.com/offprompt/offprompt/security/advisories/new

or by email to [info@offprompt.dev](mailto:info@offprompt.dev), with "security" in the subject.

Only the maintainers see the report. Please do not open a public issue, pull request or
discussion about it.

## What to include

- What an attacker can do, and what they need first: a link, a page in another tab, a prompt
  the agent reads, a program running on the same machine.
- The steps to reproduce it, or a proof of concept.
- The offprompt version, the agent and its version, and the operating system.
- Whether it happens on your own machine, from a cloud sandbox, or both.
- What offprompt wrote to stderr, on lines that start with `offprompt:`.

Never send a real secret. offprompt's checks only look at a value's shape, so a made-up value
in the right shape shows the same thing.

## What happens next

- You get a reply within a week saying the report has been read.
- We tell you whether we can reproduce it, and keep you posted while we work on it.
- A confirmed problem is fixed in a new release, with a GitHub security advisory that credits
  you, unless you would rather not be named. We aim to release a fix for a serious problem
  within 30 days; a minor one may wait for the next regular release.

These are targets, not guarantees. Please keep the report private until the fix is released. If
that takes longer than 90 days, tell us when you plan to publish and we will work to that.

## Scope

The [threat model](https://docs.offprompt.dev/security/threat-model) says what offprompt
protects against and what it does not. The most useful report shows offprompt doing worse than
that page says. What the page already lists as unprotected, such as another program running as
you reading the written file, or the agent opening the `.env` itself, is a known limit rather
than a vulnerability. A new way around one of those limits is still worth reporting.

In scope: everything in this repository, which is the server and its page, the installer, the
plugin, and the code behind offprompt.dev and docs.offprompt.dev. A problem in an agent itself,
or in Cloudflare's tunnels, belongs with its vendor.
