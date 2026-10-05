import type { Credential } from '../../schema.js'

export const username: Credential = {
  id: 'username',
  label: 'Username',
  names: ['DOCKERHUB_USERNAME'],
  url: 'https://app.docker.com',
  secret: false,
  rules: [{ kind: 'length', min: 4, max: 30, message: '4 to 30 characters' }],
}
