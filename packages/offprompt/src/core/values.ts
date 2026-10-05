import { randomBytes } from 'node:crypto'

import { encodeBytes } from './generated.js'
import type { NamedValue } from './sinks.js'
import type { GeneratedValue, RequestedSecret } from './store.js'

const generate = ({ bytes, encoding }: GeneratedValue) => encodeBytes(randomBytes(bytes), encoding)

/**
 * The values one write carries, in the order they were asked for: what the human typed,
 * and for each generated key the sink did not already hold, what the page made or the human
 * pasted, or a fresh random value when the field came back empty. A key it held is left
 * alone, because replacing a signing or encryption secret signs everyone out or leaves
 * stored data unreadable.
 */
export const valuesToWrite = ({
  secrets,
  typed,
}: {
  secrets: readonly RequestedSecret[]
  typed: ReadonlyMap<number, string>
}): readonly NamedValue[] =>
  secrets.flatMap((secret, index) => {
    if (secret.value.kind === 'generated') {
      if (secret.overwrites) return []
      const given = typed.get(index)
      return [{ name: secret.name, value: given === undefined || given === '' ? generate(secret.value) : given }]
    }
    const value = typed.get(index)
    return value === undefined ? [] : [{ name: secret.name, value }]
  })

/** Generated keys the sink already held, which the write leaves as they are. */
export const keptNames = (secrets: readonly RequestedSecret[]) =>
  secrets.filter(secret => secret.value.kind === 'generated' && secret.overwrites).map(secret => secret.name)

export const isTyped = (secret: RequestedSecret) => secret.value.kind === 'typed'
