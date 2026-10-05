/**
 * What the page and the server share to seal a submission and open it again. Everything
 * here is WebCrypto and plain strings, so the same code runs in the browser and in Node.
 */

export const SEAL_VERSION = 'v1'

const CURVE = { name: 'ECDH', namedCurve: 'P-256' } as const

const HKDF_INFO = 'offprompt/v1/seal'

const IV_BYTES = 12

const utf8 = (text: string) => new TextEncoder().encode(text)

export const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

/** Throws on anything that is not base64url, as `atob` does. */
export const fromBase64Url = (encoded: string) => {
  if (!/^[A-Za-z0-9_-]*$/.test(encoded)) throw new Error('not base64url')
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g) ?? [], pair => Number.parseInt(pair, 16))

/** Ties a sealed value to one request: the token and the page nonce are both the request's own. */
const additionalData = ({ token, nonce }: { token: string; nonce: string }) =>
  utf8(`offprompt/${SEAL_VERSION}|${token}|${nonce}`)

/** Async so that a key that is not base64url rejects, like one that is not a point. */
const importPublicKey = async (encoded: string) =>
  crypto.subtle.importKey('raw', fromBase64Url(encoded), CURVE, false, [])

/** The AES key both sides reach: ECDH, then HKDF salted with the request token's bytes. */
const aesKeyFrom = async ({
  privateKey,
  publicKey,
  token,
}: {
  privateKey: CryptoKey
  publicKey: CryptoKey
  token: string
}) => {
  const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256)
  const material = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: fromHex(token), info: utf8(HKDF_INFO) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** A request's own key pair. The private half cannot be exported, so it only ever lives in memory. */
export const newSealPair = async () => {
  const pair = await crypto.subtle.generateKey(CURVE, false, ['deriveBits'])
  const exported = await crypto.subtle.exportKey('raw', pair.publicKey)
  return { sealKey: pair.privateKey, publicKey: toBase64Url(new Uint8Array(exported)) }
}

/** The key a link carries after `#k=`, or a rejection when it is not a P-256 point. */
export const importLinkKey = importPublicKey

/** Seals `plaintext` to the sandbox's key: `v1.<page public key>.<iv>.<ciphertext>`. */
export const seal = async ({
  sandboxKey,
  token,
  nonce,
  plaintext,
}: {
  sandboxKey: CryptoKey
  token: string
  nonce: string
  plaintext: string
}) => {
  const pair = await crypto.subtle.generateKey(CURVE, false, ['deriveBits'])
  const key = await aesKeyFrom({ privateKey: pair.privateKey, publicKey: sandboxKey, token })
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalData({ token, nonce }) },
    key,
    utf8(plaintext),
  )
  const pagePublic = await crypto.subtle.exportKey('raw', pair.publicKey)
  const parts = [new Uint8Array(pagePublic), iv, new Uint8Array(ciphertext)].map(toBase64Url)
  return [SEAL_VERSION, ...parts].join('.')
}

/** Opens a sealed value, or rejects. The caller never learns which part failed. */
export const open = async ({
  sealed,
  sealKey,
  token,
  nonce,
}: {
  sealed: string
  sealKey: CryptoKey
  token: string
  nonce: string
}) => {
  const [version, pagePublic, iv, ciphertext, ...rest] = sealed.split('.')
  if (version !== SEAL_VERSION || pagePublic === undefined || iv === undefined || ciphertext === undefined) {
    throw new Error('not a sealed value')
  }
  if (rest.length > 0) throw new Error('not a sealed value')
  const key = await aesKeyFrom({ privateKey: sealKey, publicKey: await importPublicKey(pagePublic), token })
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64Url(iv), additionalData: additionalData({ token, nonce }) },
    key,
    fromBase64Url(ciphertext),
  )
  return new TextDecoder('utf-8', { fatal: true }).decode(plaintext)
}
