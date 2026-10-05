import { describe, expect, it } from 'vitest'

import { fieldFailures, fieldRules } from '../src/core/rules.js'
import { MAX_VALUE_LENGTH } from '../src/registry/checks.js'
import { providers } from '../src/registry/registry.js'
import { apiKey } from '../src/registry/providers/resend/api-key.js'

describe('the rules a field is checked against', () => {
  it('follow the value’s own rules with the quiet ones, and check a .env destination can hold it', () => {
    expect(fieldRules({ rules: apiKey.rules, sinkKind: 'dotenv' }).map(rule => rule.message)).toEqual([
      'starts with re_',
      '20 to 80 characters',
      `no more than ${String(MAX_VALUE_LENGTH)} characters`,
      'cannot be stored in a .env file: it mixes single and double quotes, or a single quote and a backslash',
    ])
  })

  it('are all quiet beyond the value’s own, and leave out the .env check for a plain file', () => {
    const rules = fieldRules({ rules: [], sinkKind: 'file' })
    expect(rules).toEqual([expect.objectContaining({ kind: 'length', quiet: true })])
    expect(fieldFailures(rules, 'x'.repeat(MAX_VALUE_LENGTH + 1))).toEqual([
      `no more than ${String(MAX_VALUE_LENGTH)} characters`,
    ])
  })

  it('refuse a value a .env file cannot hold, only when it is going to one', () => {
    const message = 'cannot be stored in a .env file: it mixes single and double quotes, or a single quote and a backslash'
    expect(fieldFailures(fieldRules({ rules: [], sinkKind: 'dotenv' }), `"it's`)).toEqual([message])
    expect(fieldFailures(fieldRules({ rules: [], sinkKind: 'file' }), `"it's`)).toEqual([])
  })

  it('never put the submitted value in a message', () => {
    const submitted = 'leak_me_please_0123456789'
    const messages = providers.flatMap(provider =>
      provider.credentials.flatMap(key => fieldFailures(fieldRules({ rules: key.rules, sinkKind: 'dotenv' }), submitted)),
    )
    expect(messages.filter(message => message.includes(submitted))).toEqual([])
  })
})
