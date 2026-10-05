import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { publishableKey } from './publishable-key.js'
import { secretKey } from './secret-key.js'
import { webhookSecret } from './webhook-secret.js'

const SECRET = `sk_live_${'a'.repeat(40)}`

describe('Stripe keys', () => {
  it('accepts a live or test secret key, and a restricted one', () => {
    expect(failures(secretKey.rules, SECRET)).toEqual([])
    expect(failures(secretKey.rules, `rk_test_${'a'.repeat(40)}`)).toEqual([])
  })

  it('refuses the publishable key where the secret one goes', () => {
    expect(failures(secretKey.rules, `pk_live_${'a'.repeat(40)}`)).toEqual([
      'starts with sk_live_, sk_test_, rk_live_ or rk_test_',
    ])
  })

  it('accepts a publishable key and refuses the secret one there', () => {
    expect(failures(publishableKey.rules, `pk_test_${'a'.repeat(40)}`)).toEqual([])
    expect(failures(publishableKey.rules, SECRET)).toEqual(['starts with pk_live_ or pk_test_'])
  })

  it('accepts a webhook signing secret', () => {
    expect(failures(webhookSecret.rules, `whsec_${'a'.repeat(32)}`)).toEqual([])
    expect(failures(webhookSecret.rules, SECRET)).toEqual(['starts with whsec_'])
  })
})
