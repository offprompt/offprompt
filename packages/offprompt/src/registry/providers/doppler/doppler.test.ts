import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { serviceToken } from './service-token.js'

const PREFIX = 'starts with dp.st., dp.sa., dp.pt., dp.ct. or dp.said.'

describe('Doppler token', () => {
  it('accepts a service token, with the environment in its name or without', () => {
    expect(failures(serviceToken.rules, `dp.st.dev.${'a'.repeat(44)}`)).toEqual([])
    expect(failures(serviceToken.rules, `dp.st.prd_eu-1.${'a'.repeat(40)}`)).toEqual([])
    expect(failures(serviceToken.rules, `dp.st.${'a'.repeat(40)}`)).toEqual([])
  })

  it('accepts the other tokens DOPPLER_TOKEN takes: personal, CLI, service account and identity', () => {
    expect(failures(serviceToken.rules, `dp.pt.${'a'.repeat(43)}`)).toEqual([])
    expect(failures(serviceToken.rules, `dp.ct.${'a'.repeat(43)}`)).toEqual([])
    expect(failures(serviceToken.rules, `dp.sa.${'a'.repeat(43)}`)).toEqual([])
    expect(failures(serviceToken.rules, `dp.said.${'a'.repeat(43)}`)).toEqual([])
  })

  it('refuses a SCIM or audit token, which cannot read secrets, and another provider token', () => {
    expect(failures(serviceToken.rules, `dp.scim.${'a'.repeat(43)}`)).toEqual([PREFIX])
    expect(failures(serviceToken.rules, `dp.audit.${'a'.repeat(43)}`)).toEqual([PREFIX])
    expect(failures(serviceToken.rules, `ops_${'a'.repeat(60)}`)).toEqual([PREFIX])
  })

  it('refuses a whole export line pasted in, and a token cut short', () => {
    expect(failures(serviceToken.rules, `DOPPLER_TOKEN=dp.st.dev.${'a'.repeat(44)}`)).toEqual([
      PREFIX,
      'letters, numbers, dots, dashes and underscores only',
    ])
    expect(failures(serviceToken.rules, 'dp.st.dev.aaaa')).toEqual(['40 to 128 characters'])
  })
})
