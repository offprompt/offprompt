import type { Credential } from '../../schema.js'

export const serviceToken: Credential = {
  id: 'service_token',
  label: 'Service token',
  names: ['DOPPLER_TOKEN'],
  url: 'https://dashboard.doppler.com',
  placeholder: 'dp.st.…',
  rules: [
    {
      kind: 'prefix',
      anyOf: ['dp.st.', 'dp.sa.', 'dp.pt.', 'dp.ct.', 'dp.said.'],
      message: 'starts with dp.st., dp.sa., dp.pt., dp.ct. or dp.said.',
    },
    { kind: 'length', min: 40, max: 128, message: '40 to 128 characters' },
    {
      kind: 'charset',
      pattern: '^[A-Za-z0-9._-]*$',
      message: 'letters, numbers, dots, dashes and underscores only',
    },
  ],
}
