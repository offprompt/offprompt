import { allOk, ok, type Result } from '../core/result.js'
import { sinkHolds, type ResolvedSink } from '../core/sinks.js'
import type { GeneratedValue, RequestedSecret, TypedValue } from '../core/store.js'
import { linkFor, type AskedLink } from './links.js'
import { valueFor, type Ask } from './resolve.js'

/** One entry of the tool's `secrets`: how the value comes to be, an optional caption, and an optional link. */
export type AskedSecret = Ask & { readonly caption?: string | undefined; readonly link?: AskedLink | undefined }

/** The record of one key, from what the agent asked and what its value resolved to. */
const requestedSecret = ({
  ask,
  value,
  overwrites,
}: {
  ask: AskedSecret
  value: TypedValue | GeneratedValue
  overwrites: boolean
}): RequestedSecret => {
  const link = linkFor({ name: ask.name, link: ask.link, value })
  return {
    name: ask.name,
    value,
    overwrites,
    ...(ask.caption === undefined ? {} : { caption: ask.caption }),
    ...(link === undefined ? {} : { link }),
  }
}

/**
 * The secrets a request records for what the agent asked: how each value comes to be, and
 * whether the sink already holds its key. The first key that cannot be resolved refuses
 * the whole request, with a message naming it. A link that cannot be used refuses nothing.
 */
export const requestedSecrets = async ({
  sink,
  asks,
}: {
  sink: ResolvedSink
  asks: readonly AskedSecret[]
}): Promise<Result<readonly RequestedSecret[]>> => {
  const resolved = allOk(
    asks.map(ask => {
      const value = valueFor(ask)
      return value.ok ? ok({ ask, value: value.value }) : value
    }),
  )
  if (!resolved.ok) return resolved
  return ok(
    await Promise.all(
      resolved.value.map(async ({ ask, value }) =>
        requestedSecret({ ask, value, overwrites: await sinkHolds({ sink, name: ask.name }) }),
      ),
    ),
  )
}
