import type { Credential } from '../../schema.js'

// Notion moved new tokens from secret_ to ntn_ in September 2024 and says old ones keep working.
// It also says the format may change again, so a token is taken on its length alone; the
// prefixes only let the page recognise a Notion token pasted somewhere else.
// An internal integration's secret and a personal access token are both made on the developer
// portal and read from the same names: the quickstart uses NOTION_API_KEY, the JavaScript SDK
// and the MCP server NOTION_TOKEN, and the ntn CLI NOTION_API_TOKEN.
export const apiToken: Credential = {
  id: 'api_token',
  label: 'API token',
  names: ['NOTION_API_KEY', 'NOTION_TOKEN', 'NOTION_API_TOKEN'],
  url: 'https://www.notion.so/developers/tokens',
  placeholder: 'ntn_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['ntn_', 'secret_'], message: 'starts with ntn_ or secret_' },
          { kind: 'length', min: 30, max: 256, message: 'at least 30 characters' },
        ],
        [{ kind: 'length', min: 30, max: 256, message: 'at least 30 characters' }],
      ],
      message: 'at least 30 characters',
    },
  ],
}
