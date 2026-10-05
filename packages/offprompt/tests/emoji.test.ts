import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'

import { emojiFrom, namedEmoji } from '../src/core/emoji.js'

const EMOJI_LINE = /^\S+ \S+ \S+ \S+$/u

it('gives four emoji, the same four for the same bytes', () => {
  const bytes = createHash('sha256').update('one write').digest()
  expect(emojiFrom(bytes)).toMatch(EMOJI_LINE)
  expect(emojiFrom(bytes)).toBe(emojiFrom(bytes))
})

it('changes with the bytes', () => {
  const first = emojiFrom(createHash('sha256').update('a').digest())
  const second = emojiFrom(createHash('sha256').update('b').digest())
  expect(first).not.toBe(second)
})

it('reaches every one of the sixty-four from three bytes', () => {
  const seen = new Set(
    Array.from({ length: 64 }, (_, index) => emojiFrom(new Uint8Array([index << 2, 0, 0])).split(' ')[0]),
  )
  expect(seen.size).toBe(64)
})

it('names each of the four', () => {
  expect(namedEmoji('🦊 🌵 🎈 🧭')).toEqual([
    { glyph: '🦊', name: 'fox' },
    { glyph: '🌵', name: 'cactus' },
    { glyph: '🎈', name: 'balloon' },
    { glyph: '🧭', name: 'compass' },
  ])
})
