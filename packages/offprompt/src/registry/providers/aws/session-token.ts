import type { Credential } from '../../schema.js'

/** AWS says not to assume a size for it; the examples in its docs run to several hundred characters. */
export const sessionToken: Credential = {
  id: 'session_token',
  label: 'Session token',
  names: ['AWS_SESSION_TOKEN'],
  url: 'https://docs.aws.amazon.com/STS/latest/APIReference/API_GetSessionToken.html',
  rules: [{ kind: 'length', min: 64, max: 8192, message: 'at least 64 characters' }],
}
