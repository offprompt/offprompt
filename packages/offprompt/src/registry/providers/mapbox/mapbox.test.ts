import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { publicToken } from './public-token.js'
import { secretToken } from './secret-token.js'

const PUBLIC = `pk.${'a'.repeat(100)}.${'b'.repeat(22)}`

const SECRET = `sk.${'a'.repeat(100)}.${'b'.repeat(22)}`

describe('Mapbox public access token', () => {
  it('accepts a public token', () => {
    expect(failures(publicToken.rules, PUBLIC)).toEqual([])
  })

  it('refuses the secret token where the public one goes', () => {
    expect(failures(publicToken.rules, SECRET)).toEqual(['starts with pk.'])
  })

  it('reports every rule a bad value breaks, one line each', () => {
    expect(failures(publicToken.rules, 'secret')).toEqual(['starts with pk.', 'at least 40 characters'])
    expect(failures(publicToken.rules, 'pk.short')).toEqual(['at least 40 characters'])
  })
})

describe('Mapbox secret access token', () => {
  it('accepts a secret token', () => {
    expect(failures(secretToken.rules, SECRET)).toEqual([])
  })

  it('refuses the public token, and a temporary one, where the secret token goes', () => {
    expect(failures(secretToken.rules, PUBLIC)).toEqual(['starts with sk.'])
    expect(failures(secretToken.rules, `tk.${'a'.repeat(100)}.${'b'.repeat(22)}`)).toEqual(['starts with sk.'])
  })

  it('refuses a Stripe key pasted by mistake', () => {
    expect(failures(secretToken.rules, `sk_live_${'a'.repeat(40)}`)).toEqual(['starts with sk.'])
  })
})
