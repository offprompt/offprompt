import { emojiFrom } from './emoji.js'

const encoder = new TextEncoder()

/** Keeps a fingerprint from ever being mistaken for another use of the same key. */
const PURPOSE = 'offprompt/fingerprint/v1'

/**
 * Four emoji for a set of values: an HMAC of the names and values under a key the page
 * makes for one submission. The page takes it from what the human typed and the server from
 * what the file holds, so the same four on both sides mean the file holds exactly what was
 * typed. The key travels only with the values, sealed when they are, and is kept nowhere, so
 * the four the agent repeats say nothing about the values, however short or guessable one of
 * them is. It runs on WebCrypto, which the page and Node share.
 */
export const fingerprintOf = async ({ key, values }: { key: string; values: readonly (readonly [string, string])[] }) => {
  const secret = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  const mac = await crypto.subtle.sign('HMAC', secret, encoder.encode(`${PURPOSE}\n${JSON.stringify(values)}`))
  return emojiFrom(new Uint8Array(mac))
}
