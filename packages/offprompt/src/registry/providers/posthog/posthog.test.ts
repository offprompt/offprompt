import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { personalApiKey } from './personal-api-key.js'
import { projectToken } from './project-token.js'

const PROJECT = `phc_${'a'.repeat(43)}`

const PERSONAL = `phx_${'a'.repeat(43)}`

describe('PostHog project token', () => {
  it('accepts a project token', () => {
    expect(failures(projectToken.rules, PROJECT)).toEqual([])
    expect(failures(projectToken.rules, `phc_${'B'.repeat(44)}`)).toEqual([])
  })

  it('refuses the personal API key where the project token goes', () => {
    expect(failures(projectToken.rules, PERSONAL)).toEqual(['starts with phc_'])
  })

  it('reports every rule a bad value breaks, one line each', () => {
    expect(failures(projectToken.rules, 'sk_short')).toEqual(['starts with phc_', 'at least 40 characters'])
    expect(failures(projectToken.rules, 'phc_short')).toEqual(['at least 40 characters'])
  })
})

describe('PostHog personal API key', () => {
  it('accepts a personal API key', () => {
    expect(failures(personalApiKey.rules, PERSONAL)).toEqual([])
    expect(failures(personalApiKey.rules, `phx_${'B'.repeat(48)}`)).toEqual([])
  })

  it('refuses the project token, which is public, where the personal key goes', () => {
    expect(failures(personalApiKey.rules, PROJECT)).toEqual(['starts with phx_'])
  })

  it('refuses a Sentry token pasted by mistake', () => {
    expect(failures(personalApiKey.rules, `sntryu_${'a'.repeat(64)}`)).toEqual(['starts with phx_'])
  })
})
