import { Resolver } from 'node:dns/promises'
import { request as httpsRequest } from 'node:https'
import type { LookupFunction } from 'node:net'

const QUERY_TIMEOUT_MS = 1_500

const GET_TIMEOUT_MS = 3_000

/** How long a fresh address is left alone before the system resolver is asked about it. */
const SETTLE_MS = 8_000

const NOT_THERE_YET = new Set(['ENOTFOUND', 'ENODATA'])

const codeOf = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined

/** The zone a tunnel's hostname is a record of: `trycloudflare.com` for `some-words.trycloudflare.com`. */
const zoneOf = (host: string) => host.split('.').slice(-2).join('.')

/** A resolver that asks the zone's own nameservers, which answer from the zone and cache nothing. */
const authoritativeFor = async (zone: string) => {
  const system = new Resolver({ timeout: QUERY_TIMEOUT_MS, tries: 1 })
  const names = await system.resolveNs(zone)
  const addresses = (await Promise.all(names.map(name => system.resolve4(name)))).flat()
  if (addresses.length === 0) throw new Error(`${zone} has no nameserver to ask`)
  const resolver = new Resolver({ timeout: QUERY_TIMEOUT_MS, tries: 1 })
  resolver.setServers(addresses)
  return resolver
}

type Looked = { readonly address: string } | 'not-there-yet' | 'cannot-ask'

/** The one question asked of a zone's nameservers. */
type AddressSource = { resolve4: (host: string) => Promise<string[]> }

const lookUp = ({ resolver, host }: { resolver: AddressSource; host: string }): Promise<Looked> =>
  resolver.resolve4(host).then(
    ([address]): Looked => (address === undefined ? 'not-there-yet' : { address }),
    (error: unknown): Looked => (NOT_THERE_YET.has(codeOf(error) ?? '') ? 'not-there-yet' : 'cannot-ask'),
  )

/** Answers with the one address it was given, so the system resolver is never asked. */
const pinnedTo =
  (address: string): LookupFunction =>
  (_hostname, options, callback) => {
    if (options.all === true) callback(null, [{ address, family: 4 }])
    else callback(null, address, 4)
  }

/** The status a GET to `url` answers with, or nothing when it does not answer. */
const statusOf = ({ url, address }: { url: string; address?: string }) =>
  new Promise<number | undefined>(resolve => {
    const outgoing = httpsRequest(
      url,
      { method: 'GET', timeout: GET_TIMEOUT_MS, ...(address === undefined ? {} : { lookup: pinnedTo(address) }) },
      incoming => {
        incoming.resume()
        resolve(incoming.statusCode)
      },
    )
    outgoing.once('timeout', () => outgoing.destroy())
    outgoing.once('error', () => resolve(undefined))
    outgoing.end()
  })

/**
 * Whether a GET through a fresh tunnel reaches this process's own server, which answers
 * 404 off a token path.
 *
 * A quick tunnel's DNS record appears a few seconds after its address is announced. A
 * resolver asked before that caches the "no such name" and keeps saying it long after the
 * record exists. So the name is looked up at the zone's own nameservers, which cache
 * nothing, and the GET is pinned to the address they give. Where those cannot be asked,
 * the system resolver is, but only once the record has had time to appear.
 */
export const createReachability = ({
  clock = Date.now,
  settleMs = SETTLE_MS,
  authoritative = authoritativeFor,
  getStatus = statusOf,
}: {
  clock?: () => number
  settleMs?: number
  authoritative?: (zone: string) => Promise<AddressSource>
  /** The status a GET answers with, pinned to `address` when one is given. */
  getStatus?: (target: { url: string; address?: string }) => Promise<number | undefined>
} = {}) => {
  const firstAsked = new Map<string, number>()
  const resolvers = new Map<string, Promise<AddressSource | undefined>>()

  const resolverFor = (zone: string) => {
    const existing = resolvers.get(zone)
    if (existing !== undefined) return existing
    const created = authoritative(zone).catch(() => undefined)
    resolvers.set(zone, created)
    return created
  }

  const settled = (host: string) => {
    const since = firstAsked.get(host) ?? clock()
    firstAsked.set(host, since)
    return clock() - since >= settleMs
  }

  return async (url: string) => {
    const { host } = new URL(url)
    const hasSettled = settled(host)
    const resolver = await resolverFor(zoneOf(host))
    const looked = resolver === undefined ? 'cannot-ask' : await lookUp({ resolver, host })
    if (looked === 'not-there-yet') return false
    if (looked === 'cannot-ask') return hasSettled && (await getStatus({ url })) === 404
    return (await getStatus({ url, address: looked.address })) === 404
  }
}
