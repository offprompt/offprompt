import { importLinkKey, seal } from '../../core/sealing.js'

export const MISSING_KEY = 'This link is missing its key. Ask the agent for the link again.'

export const NO_WEBCRYPTO = 'This browser cannot encrypt the values. Open the link in a current browser.'

/** What a plain POST carries, minus the nonce, which stays in the clear for the server to check first. */
export const plaintextFor = ({
  values,
  allowTracked,
  fingerprint,
}: {
  values: ReadonlyMap<string, string>
  allowTracked: boolean
  /** The key the page took the fingerprint with, sealed along with the values. */
  fingerprint?: string | undefined
}) =>
  JSON.stringify({
    values: Object.fromEntries(values),
    allowTracked,
    ...(fingerprint === undefined ? {} : { fingerprint }),
  })

/** The sandbox's public key, from the part of the link no server ever receives. */
const keyIn = (hash: string) => new URLSearchParams(hash.replace(/^#/, '')).get('k') ?? ''

export type Sealer = (plaintext: string) => Promise<string>

/**
 * Reads the key from the link and hands back the means to seal to it, or the line to show
 * when this page cannot seal at all.
 */
export const sealerFor = async ({
  hash,
  token,
  nonce,
}: {
  hash: string
  token: string
  nonce: string
}): Promise<Sealer | string> => {
  // Optional on purpose: the type says WebCrypto is always there, and an old browser disagrees.
  const subtle: SubtleCrypto | undefined = globalThis.crypto?.subtle
  if (subtle === undefined) return NO_WEBCRYPTO
  const encoded = keyIn(hash)
  if (encoded === '') return MISSING_KEY
  return importLinkKey(encoded).then(
    sandboxKey => (plaintext: string) => seal({ sandboxKey, token, nonce, plaintext }),
    () => MISSING_KEY,
  )
}
