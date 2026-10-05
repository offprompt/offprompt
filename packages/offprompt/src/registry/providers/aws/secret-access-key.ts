import type { Credential } from '../../schema.js'

export const secretAccessKey: Credential = {
  id: 'secret_access_key',
  label: 'Secret access key',
  names: ['AWS_SECRET_ACCESS_KEY'],
  url: 'https://console.aws.amazon.com/iam/home#/security_credentials',
  rules: [{ kind: 'length', min: 40, max: 128, message: 'at least 40 characters' }],
}
