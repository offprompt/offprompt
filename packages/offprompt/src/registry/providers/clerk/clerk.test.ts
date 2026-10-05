import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { publishableKey } from './publishable-key.js'
import { secretKey } from './secret-key.js'

const SECRET = `sk_live_${'a'.repeat(40)}`
const PUBLISHABLE = `pk_test_${'a'.repeat(40)}`

describe('Clerk secret key', () => {
  it('accepts a live or test key', () => {
    expect(failures(secretKey.rules, SECRET)).toEqual([])
    expect(failures(secretKey.rules, `sk_test_${'a'.repeat(40)}`)).toEqual([])
  })

  it('refuses the publishable key where the secret one goes', () => {
    expect(failures(secretKey.rules, PUBLISHABLE)).toEqual(['starts with sk_live_ or sk_test_'])
  })

  it('reports a key cut short', () => {
    expect(failures(secretKey.rules, 'sk_test_short')).toEqual(['at least 20 characters'])
  })
})

describe('Clerk publishable key', () => {
  it('accepts a live or test key, and is meant to be public', () => {
    expect(failures(publishableKey.rules, PUBLISHABLE)).toEqual([])
    expect(failures(publishableKey.rules, `pk_live_${'a'.repeat(40)}`)).toEqual([])
    expect(publishableKey.secret).toBe(false)
  })

  it('refuses the secret key there', () => {
    expect(failures(publishableKey.rules, SECRET)).toEqual(['starts with pk_live_ or pk_test_'])
  })
})
