import type { Credential } from '../../schema.js'

// A dataset is named by whoever creates it, so this is configuration rather than a secret.
// Axiom's docs say a name is 1 to 128 characters of letters, digits and hyphens. Only the length
// is checked, so that a name made under an older rule is not blocked by a charset gone stale.
export const dataset: Credential = {
  id: 'dataset',
  label: 'Dataset name',
  names: ['AXIOM_DATASET'],
  url: 'https://app.axiom.co/datasets',
  secret: false,
  rules: [{ kind: 'length', min: 1, max: 128, message: '1 to 128 characters' }],
}
