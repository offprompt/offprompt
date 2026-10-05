import { fail, ok, type Result } from '../core/result.js'
import type { GeneratedValue, TypedValue } from '../core/store.js'
import { findFormat, type FormatId } from '../registry/formats.js'
import {
  goesBy,
  offersFor,
  referenceOf,
  sourceByReference,
  sourcesNamed,
  sourcesOfProvider,
  type Source,
} from '../registry/registry.js'

/** How the agent asked for one value: generated, from a provider, of a format, or plain. */
export type Ask = {
  readonly name: string
  readonly generate?: Pick<GeneratedValue, 'bytes' | 'encoding'> | undefined
  readonly provider?: string | undefined
  readonly format?: FormatId | undefined
  readonly secret?: boolean | undefined
}

const fromSource = ({ source, secret }: { source: Source; secret: boolean | undefined }): TypedValue => ({
  kind: 'typed',
  rules: source.credential.rules,
  multiline: false,
  masked: secret ?? source.credential.secret ?? true,
  ...(source.credential.placeholder === undefined ? {} : { placeholder: source.credential.placeholder }),
  source,
  offers: [],
})

const fromFormat = ({ id, secret }: { id: FormatId; secret: boolean | undefined }): TypedValue => {
  const format = findFormat(id)
  const multiline = format.multiline ?? false
  return {
    kind: 'typed',
    rules: format.rules,
    multiline,
    masked: !multiline && (secret ?? true),
    format: id,
    ...(format.placeholder === undefined ? {} : { placeholder: format.placeholder }),
    ...(format.label === undefined ? {} : { label: format.label }),
    offers: offersFor(id),
  }
}

const only = <T>(candidates: readonly T[]) => (candidates.length === 1 ? candidates[0] : undefined)

/**
 * A provider's key by reference, or, when the reference names only the provider, the one
 * key it issues or the one the variable name conventionally stands for.
 */
const sourceFor = ({ reference, name }: { reference: string; name: string }): Result<Source> => {
  const offered = sourcesOfProvider(reference)
  const found =
    sourceByReference(reference) ?? only(offered) ?? only(offered.filter(source => goesBy({ source, name })))
  if (found !== undefined) return ok(found)
  return fail(
    `${name}: ${reference} issues several keys and the name does not say which. Name one of ${offered.map(referenceOf).join(', ')}`,
  )
}

/**
 * Resolves what the agent asked for into how the value comes to be. With none of generate,
 * provider or format, a name that one provider's key conventionally goes by is that key, and
 * any other name is plain text.
 */
export const valueFor = (ask: Ask): Result<TypedValue | GeneratedValue> => {
  const ways = [ask.generate, ask.provider, ask.format].filter(way => way !== undefined)
  if (ways.length > 1) return fail(`${ask.name}: give at most one of generate, provider and format`)
  if (ask.generate !== undefined) return ok({ kind: 'generated', ...ask.generate })
  if (ask.provider !== undefined) {
    const source = sourceFor({ reference: ask.provider, name: ask.name })
    return source.ok ? ok(fromSource({ source: source.value, secret: ask.secret })) : source
  }
  if (ask.format !== undefined) return ok(fromFormat({ id: ask.format, secret: ask.secret }))
  const named = only(sourcesNamed(ask.name))
  return ok(named === undefined ? fromFormat({ id: 'text', secret: ask.secret }) : fromSource({ source: named, secret: ask.secret }))
}
