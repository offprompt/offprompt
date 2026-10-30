/**
 * What /compare says about offprompt and two tools people weigh it against. Every line about
 * another tool says only what that tool's own docs, README or source say, checked on the date
 * below, and each tool lists where. Where its docs are silent, the cell says so rather than
 * guessing. Text in backticks is set as code.
 */
import type { Link } from '@/lib/site'

/** When the other tools' docs were last read for this page. */
export const CHECKED = '30 October 2026'

export type Tool = {
  readonly id: 'offprompt' | 'onepassword' | 'infisical'
  readonly name: string
  readonly sources: readonly Link[]
}

export const TOOLS: readonly Tool[] = [
  {
    id: 'offprompt',
    name: 'offprompt',
    sources: [
      { label: 'Docs', href: 'https://docs.offprompt.dev/introduction' },
      { label: 'Threat model', href: 'https://docs.offprompt.dev/security/threat-model' },
      { label: 'GitHub', href: 'https://github.com/offprompt/offprompt' },
    ],
  },
  {
    id: 'onepassword',
    name: '1Password Environments MCP',
    sources: [
      { label: '1Password Environments MCP Server', href: 'https://www.1password.dev/environments/mcp-server' },
      { label: 'Local .env files', href: 'https://www.1password.dev/environments/local-env-file' },
      { label: '1Password Environments', href: 'https://www.1password.dev/environments' },
      { label: '1Password for NVIDIA OpenShell', href: 'https://www.1password.dev/environments/nvidia-openshell' },
      {
        label: 'Claude Code plugin skill',
        href: 'https://github.com/1Password/1password-claude-plugin/blob/main/skills/1password-environments/SKILL.md',
      },
    ],
  },
  {
    id: 'infisical',
    name: 'Infisical MCP',
    sources: [
      { label: 'infisical-mcp-server README', href: 'https://github.com/Infisical/infisical-mcp-server' },
      {
        label: 'Secret validation rules',
        href: 'https://infisical.com/docs/documentation/platform/secret-validation-rules',
      },
      { label: 'Agent Vault', href: 'https://infisical.com/platform/agent-vault' },
      { label: 'Infisical pricing', href: 'https://infisical.com/pricing' },
    ],
  },
]

export type Row = { readonly label: string } & Readonly<Record<Tool['id'], string>>

export const ROWS: readonly Row[] = [
  {
    label: 'What it is',
    offprompt: 'An MCP server the agent calls to ask you for a value, which it writes into the project',
    onepassword: 'An MCP server, part of the 1Password desktop app, that manages 1Password Environments',
    infisical: "Infisical's MCP server, which calls Infisical's API",
  },
  {
    label: 'How a new value gets in',
    offprompt: 'You type or paste it on a page served from `127.0.0.1`. The agent never handles it',
    onepassword:
      'In the 1Password app, or the agent passes values to `append_variables`. Its Claude Code skill imports a `.env` by having the agent read the file',
    infisical: 'The agent passes it as `secretValue` to `create-secret` or `update-secret`',
  },
  {
    label: 'Can its tools return a value to the agent',
    offprompt: 'No. Results carry the key names, the file and a four-emoji fingerprint',
    onepassword: 'No. The docs say it "never returns the secrets stored in your Environments"',
    infisical:
      'Yes, by default, from `get-secret` and `list-secrets`. Since version 0.0.24, `INFISICAL_MASK_SECRET_VALUES=true` replaces them with `<masked>`',
  },
  {
    label: 'Where values live',
    offprompt: "In the project's `.env`, `.env.local` or another file the agent names",
    onepassword:
      'In 1Password. A mounted `.env` is a named pipe on Mac and Linux, read on demand and never stored on disk. Once unlocked, any process can read it',
    infisical: 'In Infisical Cloud or a self-hosted Infisical',
  },
  {
    label: "Checks a key's format",
    offprompt: 'Yes, for 65 providers and 111 kinds of key, such as a prefix and a length, plus 12 formats',
    onepassword: 'Not documented',
    infisical:
      'Not for particular providers. A project can set validation rules, such as a length, a regex or a prefix, that Infisical checks on every write',
  },
  {
    label: 'From a cloud sandbox',
    offprompt:
      'Yes. A link through a Cloudflare quick tunnel, with values encrypted in your browser to a key only the sandbox holds',
    onepassword:
      'The MCP server runs locally in the desktop app, and the docs say remote-only MCP clients are not supported yet. A separate integration, 1Password for NVIDIA OpenShell (beta), gives an agent in an OpenShell sandbox placeholders instead of values',
    infisical:
      "Not documented for the MCP server, which needs Infisical credentials wherever it runs. Infisical's separate Agent Vault (preview) is a proxy that adds the credential to an agent's requests, so the agent never holds it",
  },
  {
    label: 'Account needed',
    offprompt: 'None',
    onepassword: 'A 1Password account and the desktop app',
    infisical: 'An Infisical account, with a machine identity or an access token',
  },
  {
    label: 'Agents named in its docs',
    offprompt: 'Claude Code, Codex, Cursor, Pi, and any agent that speaks MCP',
    onepassword: 'Claude Code, Codex, Cursor, Kiro and OpenCode, and any client that speaks MCP over stdio',
    infisical: 'Claude Desktop, in its configuration example',
  },
  {
    label: 'Setup',
    offprompt: '`npx offprompt init`',
    onepassword:
      'Turn on Integrate with MCP clients under Settings > Developer in the 1Password app, then add `1password-mcp` to the agent or install the Claude Code plugin',
    infisical: '`npx -y @infisical/mcp`, with Infisical credentials in its environment',
  },
  {
    label: 'License and price',
    offprompt: 'MIT, free',
    // 1Password states no license for the MCP server, which ships inside its desktop app.
    onepassword: 'Needs a 1Password subscription. The Claude Code plugin is MIT, and marked beta',
    infisical: 'The MCP server is Apache-2.0. Infisical has a free plan and paid plans',
  },
]

export type Question = { readonly question: string; readonly answer: string }

export const FAQ: readonly Question[] = [
  {
    question: "What is the difference between offprompt and a secrets manager's MCP server?",
    answer:
      "A secrets manager's MCP server lets the agent work with a store you already keep: list it, add to it, and with some, read values from it. offprompt keeps no store. It is for the moment a task needs a key the project does not have yet: the agent asks for it by name, you type it on a page in your browser, offprompt writes it to the project's .env, and the agent gets back only the key's name.",
  },
  {
    question: "Which of these keep secret values out of the agent's context?",
    answer:
      "offprompt returns key names and a fingerprint, never values. 1Password's docs say its MCP server never returns the secrets stored in your Environments, though its Claude Code skill imports an existing .env by having the agent read the file. Infisical's MCP server returns values from get-secret and list-secrets unless INFISICAL_MASK_SECRET_VALUES is set to true. Both also offer a separate way for an agent to use a key it never sees: 1Password for NVIDIA OpenShell (beta) gives the agent placeholders and swaps in the real values at a gateway, and Infisical's Agent Vault (preview) adds the real credential to the agent's requests at a proxy.",
  },
  {
    question: 'Does offprompt replace 1Password or Infisical?',
    answer:
      "No. offprompt does not store, share or rotate secrets. It gets a value from you into the project's file without the chat. A team that keeps its secrets in 1Password, Infisical, Doppler or Vercel can use their command line to write a file on the laptop and drop it on offprompt's page, which takes only the keys the agent asked for.",
  },
  {
    question: 'Does offprompt work in cloud sandboxes?',
    answer:
      "Yes. From Claude Code on the web, a Cursor Cloud Agent, Codex cloud, a codespace or an SSH session, the agent passes you a link to offprompt's page through a Cloudflare quick tunnel. Your browser encrypts the values to a key only the sandbox holds before they leave it, so the tunnel carries ciphertext, and the sandbox needs no login to a secrets store.",
  },
  {
    question: 'Can the agent read the .env file offprompt writes?',
    answer:
      "It can, if it opens it: the file is on disk, and offprompt does not watch what the agent reads. Every result tells the agent not to open the file and lists the keys it holds, so the agent has no reason to, and a deny rule in Claude Code or .cursorignore in Cursor closes the agent's file tools to it.",
  },
  {
    question: 'How do I install offprompt?',
    answer:
      'Run npx offprompt init in the project. It adds offprompt to Claude Code, Codex, Cursor and Pi, and the project carries it, so everyone who works on it gets it too. npx offprompt init -g installs it for you, in every project. It is open source under the MIT license.',
  },
]
