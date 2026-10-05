import { describe, expect, it } from 'vitest'

import { failures } from './checks.js'
import { exampleFor, exampleOf } from './examples.js'
import { formatList } from './formats.js'
import { providers } from './registry.js'

const credentials = providers.flatMap(provider =>
  provider.credentials.map(credential => ({ name: `${provider.id}/${credential.id}`, credential })),
)

describe('examples', () => {
  it.each(credentials)('has one for $name that passes its rules', ({ credential }) => {
    expect(failures(credential.rules, exampleFor(credential))).toEqual([])
  })

  it.each(formatList.map(format => ({ name: format.id, rules: format.rules })))(
    'makes one for the $name format that passes its rules',
    ({ rules }) => {
      expect(failures(rules, exampleOf(rules))).toEqual([])
    },
  )

  it('picks a test key over a live one where a provider issues both', () => {
    expect(exampleOf(providers.find(provider => provider.id === 'stripe')?.credentials[0]?.rules ?? [])).toMatch(
      /^sk_test_/,
    )
  })

  it('keeps a key’s own example, for rules no example can be made from', () => {
    const rules = [{ kind: 'charset', pattern: '^[0-9]+:[A-Za-z]+$', message: 'digits, a colon, then letters' }] as const
    expect(exampleFor({ rules, example: '123456:EXAMPLE' })).toBe('123456:EXAMPLE')
    expect(exampleFor({ rules: [] })).toContain('EXAMPLE')
  })

  it('says it is an example where the rules leave room for it', () => {
    expect(exampleOf([{ kind: 'prefix', anyOf: ['re_'], message: 'starts with re_' }])).toContain('EXAMPLE')
  })
})
