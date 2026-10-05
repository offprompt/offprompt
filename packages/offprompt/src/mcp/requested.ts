import { allOk, ok, type Result } from '../core/result.js'
import { sinkHolds, type ResolvedSink } from '../core/sinks.js'
import type { RequestedSecret } from '../core/store.js'
import { valueFor, type Ask } from './resolve.js'

/** One entry of the tool's `secrets`: how the value comes to be, and an optional caption. */
export type AskedSecret = Ask & { readonly caption?: string | undefined }

/**
 * The secrets a request records for what the agent asked: how each value comes to be, and
 * whether the sink already holds its key. The first key that cannot be resolved refuses
 * the whole request, with a message naming it.
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
      resolved.value.map(
        async ({ ask, value }): Promise<RequestedSecret> => ({
          name: ask.name,
          value,
          overwrites: await sinkHolds({ sink, name: ask.name }),
          ...(ask.caption === undefined ? {} : { caption: ask.caption }),
        }),
      ),
    ),
  )
}
