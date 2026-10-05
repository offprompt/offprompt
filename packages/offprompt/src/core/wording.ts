/**
 * A label as it reads inside a sentence: "Secret key" becomes "secret key", while an
 * acronym such as "API key" or "JWT" keeps its capitals.
 */
export const inSentence = (label: string) =>
  /^[A-Z][A-Z]/.test(label) ? label : `${label.charAt(0).toLowerCase()}${label.slice(1)}`

/**
 * Words said with a vowel first: "an OpenAI key", "an Upstash token", "an 8-byte", "an
 * 18-byte", but "a URL" and "a unique".
 */
const VOWEL_SOUND = /^(?:[aeio]|u(?:p|m|n(?!i))|8|1[18](?!\d))/i

/** "a" or "an" before a word, by how it is said: an OpenAI key, a URL, a UUID. */
export const withArticle = (phrase: string) => `${VOWEL_SOUND.test(phrase) ? 'an' : 'a'} ${phrase}`

/** A count in digits, as a label says it: "5 values". */
export const numbered = (count: number, noun: string) => `${String(count)} ${noun}${count === 1 ? '' : 's'}`
