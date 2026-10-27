import { DOCS, INSTALL, NPM, REPO } from '@/lib/site'

export const dynamic = 'force-static'

/**
 * What offprompt is, for a model reading the site, in the llms.txt form (llmstxt.org). The docs
 * serve their own, with every page in it.
 */
const TEXT = `# offprompt

> An MCP server a coding agent calls when a task needs a value only you have: an API key, a token, a password. A page opens in your browser, you type the value there, and offprompt writes it into the project's .env or another file. The agent gets the key names and a four-emoji fingerprint, never the values.

It works with Claude Code, Codex, Cursor, Pi and any other agent that speaks MCP, on your machine or from a cloud sandbox. It is open source under the MIT license. In a project, \`${INSTALL}\` sets it up.

## Docs

- [The docs, for models](${DOCS}/llms.txt): every page of the docs, each with a line saying what it covers
- [Introduction](${DOCS}/introduction): what offprompt does, and how a value gets from you to the project without passing through the agent
- [Installation](${DOCS}/installation): in a project for everyone who works on it, or in every agent you use
- [How to give Claude Code an API key](${DOCS}/guides/claude-code-api-keys): the ways to get a key to an agent, and what each keeps out of the transcript
- [FAQ](${DOCS}/faq): short answers to the questions people ask first
- [Threat model](${DOCS}/security/threat-model): what offprompt protects against, and what it does not

## Source

- [GitHub](${REPO})
- [npm](${NPM})
`

export const GET = () => new Response(TEXT, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
