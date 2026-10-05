import type { Credential } from '../../schema.js'

// The application ID names the app in every request URL and is sent in the clear from the
// browser, so it is public. Algolia's docs do not state its format; IDs seen in practice are ten
// letters and digits, so the range is wide around that. It stops well below the 32 characters of
// a key, so that a key pasted here is caught.
export const applicationId: Credential = {
  id: 'application_id',
  label: 'Application ID',
  names: ['ALGOLIA_APPLICATION_ID', 'ALGOLIA_APP_ID'],
  url: 'https://dashboard.algolia.com/account/api-keys',
  secret: false,
  rules: [{ kind: 'length', min: 6, max: 20, message: '6 to 20 characters' }],
}
