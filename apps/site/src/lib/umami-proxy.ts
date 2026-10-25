/** Where Umami Cloud takes events. Left to itself, the tracker posts here from the browser, which ad blockers stop. */
export const UMAMI_SEND_URL = 'https://gateway.umami.is/api/send'

// The headers Umami's tracker sends that its gateway needs back.
const FORWARDED = ['content-type', 'x-umami-website-id', 'x-umami-hostname', 'x-umami-cache']

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

// The visitor's address, as Vercel's edge saw it. Vercel overwrites X-Forwarded-For with the
// client it was connected to, so it can't be spoofed from outside; x-real-ip is the same address.
const clientIp = (request: Request) =>
  request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined

// The tracker's own headers, the visitor's browser and address, and nothing else: no cookie leaves the site.
const relayedHeaders = (request: Request, ip: string | undefined) =>
  new Headers({
    ...Object.fromEntries(
      FORWARDED.flatMap((name): [string, string][] => {
        const value = request.headers.get(name)
        return value ? [[name, value]] : []
      }),
    ),
    'user-agent': request.headers.get('user-agent') ?? '',
    ...(ip ? { 'x-forwarded-for': ip } : {}),
  })

// The event with the visitor's address written into it. Umami's edge stamps every request with
// where it saw the caller come from, which outranks any X-Forwarded-For we send, and the caller
// here is our server: everyone would land in our Vercel region, and visitors sharing a browser
// would merge into one. An `ip` in the payload wins over all of that, so Umami looks the address
// up itself. Whatever `ip` the page sent is replaced, so a visitor can't pick their own country.
// A body that isn't an event goes on as it came, for Umami to refuse.
const withVisitorIp = (body: string, ip: string | undefined) => {
  const event = parseJson(body)
  if (!isRecord(event) || !isRecord(event.payload)) return body
  const payload = Object.fromEntries(Object.entries(event.payload).filter(([key]) => key !== 'ip'))
  return JSON.stringify({ ...event, payload: ip ? { ...payload, ip } : payload })
}

/**
 * Relays the tracker's events to Umami Cloud from the site's own origin, which ad blockers leave
 * alone. A plain rewrite would relay them too, but Umami would then see our server as the visitor
 * and place everyone in its region: this hands on the visitor's address and browser instead.
 */
export const createUmamiProxy =
  (send: typeof fetch = fetch) =>
  async (request: Request) => {
    const ip = clientIp(request)
    try {
      const answer = await send(UMAMI_SEND_URL, {
        method: 'POST',
        headers: relayedHeaders(request, ip),
        body: withVisitorIp(await request.text(), ip),
        cache: 'no-store',
      })
      return new Response(await answer.text(), {
        status: answer.status,
        headers: {
          'content-type': answer.headers.get('content-type') ?? 'application/json',
          'cache-control': 'no-store',
        },
      })
    } catch {
      // Umami being down is no reason to fail anything; the tracker ignores errors anyway.
      return new Response(null, { status: 502 })
    }
  }
