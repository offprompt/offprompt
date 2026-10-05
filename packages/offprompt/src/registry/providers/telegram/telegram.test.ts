import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { botToken } from './bot-token.js'

const LINE = 'the bot id, a colon, then letters, numbers, - and _'

describe('Telegram bot token', () => {
  it('accepts a bot id, a colon and 35 characters of letters, numbers, - and _', () => {
    expect(failures(botToken.rules, `123456789:${'a'.repeat(35)}`)).toEqual([])
    expect(failures(botToken.rules, `7123456789:AA${'Bc_-9'.repeat(7)}`)).toEqual([])
  })

  it('accepts the shape in Telegram documentation, with its dash', () => {
    expect(failures(botToken.rules, '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11')).toEqual([])
  })

  it('refuses a token with no bot id, no colon, or a space in it', () => {
    expect(failures(botToken.rules, `:${'a'.repeat(35)}`)).toEqual([LINE])
    expect(failures(botToken.rules, `123456789${'a'.repeat(35)}`)).toEqual([LINE])
    expect(failures(botToken.rules, `123456789: ${'a'.repeat(34)}`)).toEqual([LINE])
  })

  it('refuses another provider key and a token cut short', () => {
    expect(failures(botToken.rules, `xoxb-${'1'.repeat(40)}`)).toEqual([LINE])
    expect(failures(botToken.rules, `SG.${'a'.repeat(22)}.${'b'.repeat(43)}`)).toEqual([LINE])
    expect(failures(botToken.rules, '123456789:abc')).toEqual(['30 to 100 characters'])
  })
})
