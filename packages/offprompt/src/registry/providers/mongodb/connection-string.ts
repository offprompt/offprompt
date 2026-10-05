import type { Credential } from '../../schema.js'

export const connectionString: Credential = {
  id: 'connection_string',
  label: 'Connection string',
  names: ['MONGODB_URI'],
  url: 'https://cloud.mongodb.com',
  placeholder: 'mongodb+srv://…',
  rules: [
    { kind: 'prefix', anyOf: ['mongodb+srv://', 'mongodb://'], message: 'starts with mongodb+srv:// or mongodb://' },
    { kind: 'length', min: 12, max: 4096, message: 'at least 12 characters' },
    { kind: 'charset', pattern: '^(?!.*<(db_)?(password|username)>)', message: 'no <db_password> placeholder left' },
  ],
}
