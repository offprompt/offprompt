import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiToken } from './api-token.js'
import { dataset } from './dataset.js'

const UUID = '123e4567-e89b-12d3-a456-426614174000'

describe('Axiom API token', () => {
  it('accepts an API token and a personal access token', () => {
    expect(failures(apiToken.rules, `xaat-${UUID}`)).toEqual([])
    expect(failures(apiToken.rules, `xapt-${UUID}`)).toEqual([])
  })

  it('refuses a Sentry token and a bare UUID pasted by mistake', () => {
    expect(failures(apiToken.rules, `sntryu_${'a'.repeat(64)}`)).toEqual(['starts with xaat- or xapt-'])
    expect(failures(apiToken.rules, UUID)).toEqual(['starts with xaat- or xapt-'])
  })

  it('reports every rule a bad value breaks, one line each', () => {
    expect(failures(apiToken.rules, 'secret')).toEqual(['starts with xaat- or xapt-', 'at least 30 characters'])
    expect(failures(apiToken.rules, 'xaat-short')).toEqual(['at least 30 characters'])
  })
})

describe('Axiom dataset name', () => {
  it('accepts a name of up to 128 characters', () => {
    expect(failures(dataset.rules, 'my-app-logs')).toEqual([])
    expect(failures(dataset.rules, 'a'.repeat(128))).toEqual([])
  })

  it('refuses an empty name and one that is too long', () => {
    expect(failures(dataset.rules, '')).toEqual(['1 to 128 characters'])
    expect(failures(dataset.rules, 'a'.repeat(129))).toEqual(['1 to 128 characters'])
  })
})
