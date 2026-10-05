/**
 * Four emoji drawn from the first bytes of a hash, easy to compare at a glance and to read
 * out. `fingerprint.ts` draws them from the values of one write; see there.
 */

/** Sixty-four single-codepoint emoji, each easy to tell apart and to name out loud. */
const EMOJI = [
  ['🍎', 'apple'], ['🍋', 'lemon'], ['🍇', 'grapes'], ['🍓', 'strawberry'],
  ['🍒', 'cherries'], ['🥝', 'kiwi'], ['🍑', 'peach'], ['🥕', 'carrot'],
  ['🌽', 'corn'], ['🍄', 'mushroom'], ['🥐', 'croissant'], ['🧀', 'cheese'],
  ['🍕', 'pizza'], ['🍔', 'burger'], ['🌮', 'taco'], ['🍣', 'sushi'],
  ['🍩', 'donut'], ['🍪', 'cookie'], ['🎂', 'cake'], ['🍿', 'popcorn'],
  ['☕', 'coffee'], ['🧊', 'ice'], ['🦊', 'fox'], ['🦉', 'owl'],
  ['🐙', 'octopus'], ['🐢', 'turtle'], ['🐧', 'penguin'], ['🦋', 'butterfly'],
  ['⚽', 'football'], ['🏀', 'basketball'], ['🎾', 'tennis'], ['🎳', 'bowling'],
  ['🎯', 'target'], ['🎲', 'dice'], ['🎸', 'guitar'], ['🎺', 'trumpet'],
  ['🎻', 'violin'], ['🥁', 'drum'], ['🎨', 'palette'], ['🎬', 'clapper'],
  ['🎤', 'microphone'], ['🎧', 'headphones'], ['📷', 'camera'], ['🔭', 'telescope'],
  ['🔬', 'microscope'], ['💡', 'bulb'], ['🔑', 'key'], ['🔒', 'lock'],
  ['🧭', 'compass'], ['⏰', 'alarm'], ['⌛', 'hourglass'], ['🧲', 'magnet'],
  ['🚀', 'rocket'], ['🛸', 'saucer'], ['🚲', 'bicycle'], ['🚂', 'train'],
  ['⛵', 'sailboat'], ['🎈', 'balloon'], ['🪁', 'kite'], ['🧩', 'puzzle'],
  ['🌈', 'rainbow'], ['🌙', 'moon'], ['🌵', 'cactus'], ['🌻', 'sunflower'],
] as const

const COUNT = 4

const glyphAt = (index: number) => EMOJI[index]?.[0] ?? EMOJI[0][0]

/** Four emoji from the first three bytes: six bits each, so every one of the sixty-four can appear. */
export const emojiFrom = (bytes: Uint8Array) => {
  const [a = 0, b = 0, c = 0] = bytes
  const packed = (a << 16) | (b << 8) | c
  return Array.from({ length: COUNT }, (_, index) => glyphAt((packed >> (18 - index * 6)) & 0x3f)).join(' ')
}

const NAMES: ReadonlyMap<string, string> = new Map(EMOJI.map(([glyph, name]) => [glyph, name]))

/** Each of the four with the word it is read as, so the human can say which four they see. */
export const namedEmoji = (emoji: string) =>
  emoji
    .split(' ')
    .filter(glyph => glyph !== '')
    .map(glyph => ({ glyph, name: NAMES.get(glyph) ?? '' }))
