import { describe, expect, it, vi } from 'vitest'

import { createUmamiProxy, UMAMI_SEND_URL } from '../src/lib/umami-proxy'

const SEND_URL = 'https://offprompt.dev/op/api/send'

const event = JSON.stringify({ type: 'event', payload: { name: 'pageview' } })

const tracked = (headers: Record<string, string>, body = event) =>
  new Request(SEND_URL, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body })

const setupTest = () => {
  const send = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify({ cache: 'abc' }), { status: 200, headers: { 'content-type': 'application/json' } }),
  )
  const sentInit = (call = 0) => send.mock.calls[call]?.[1]
  const sentHeaders = (call = 0) => new Headers(sentInit(call)?.headers)
  const sentBody = (call = 0) => {
    const body = sentInit(call)?.body
    if (typeof body !== 'string') throw new Error('The relay sent no text to Umami.')
    return body
  }
  const sentPayload = (call = 0): unknown => (JSON.parse(sentBody(call)) as { payload: unknown }).payload
  return { send, proxy: createUmamiProxy(send), sentHeaders, sentBody, sentPayload }
}

describe('the Umami relay', () => {
  it('hands the event to Umami Cloud untouched when there is no address to add', async () => {
    const { proxy, send } = setupTest()
    await proxy(tracked({}))
    expect(send).toHaveBeenCalledExactlyOnceWith(UMAMI_SEND_URL, expect.objectContaining({ method: 'POST', body: event }))
  })

  it("writes the visitor's address into the event, which Umami trusts over its own edge", async () => {
    const { proxy, sentPayload } = setupTest()
    await proxy(tracked({ 'x-real-ip': '198.51.100.4' }))
    expect(sentPayload()).toEqual({ name: 'pageview', ip: '198.51.100.4' })
  })

  it('never lets the page choose the address itself', async () => {
    const { proxy, sentPayload } = setupTest()
    const claimed = JSON.stringify({ type: 'event', payload: { name: 'pageview', ip: '1.1.1.1' } })
    await proxy(tracked({ 'x-real-ip': '198.51.100.4' }, claimed))
    await proxy(tracked({}, claimed))
    expect(sentPayload(0)).toEqual({ name: 'pageview', ip: '198.51.100.4' })
    expect(sentPayload(1)).toEqual({ name: 'pageview' })
  })

  it('passes on what is not an event as it came, for Umami to refuse', async () => {
    const { proxy, sentBody } = setupTest()
    await proxy(tracked({ 'x-real-ip': '198.51.100.4' }, 'not json'))
    expect(sentBody()).toBe('not json')
  })

  it('tells Umami which browser and address the visit came from', async () => {
    const { proxy, sentHeaders } = setupTest()
    await proxy(tracked({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'user-agent': 'Mozilla/5.0 (iPhone)' }))
    expect(sentHeaders().get('x-forwarded-for')).toBe('203.0.113.7')
    expect(sentHeaders().get('user-agent')).toBe('Mozilla/5.0 (iPhone)')
  })

  it('prefers the address Vercel reports as the real one', async () => {
    const { proxy, sentHeaders } = setupTest()
    await proxy(tracked({ 'x-real-ip': '198.51.100.4', 'x-forwarded-for': '203.0.113.7' }))
    expect(sentHeaders().get('x-forwarded-for')).toBe('198.51.100.4')
  })

  it("passes on the tracker's own headers, and never the visitor's cookies", async () => {
    const { proxy, sentHeaders } = setupTest()
    await proxy(tracked({ 'x-umami-website-id': 'site', 'x-umami-cache': 'token', cookie: 'theme=dark' }))
    expect(sentHeaders().get('x-umami-website-id')).toBe('site')
    expect(sentHeaders().get('x-umami-cache')).toBe('token')
    expect(sentHeaders().get('cookie')).toBeNull()
  })

  it('answers with what Umami said, which the tracker reads its cache token from', async () => {
    const { proxy } = setupTest()
    const response = await proxy(tracked({}))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ cache: 'abc' })
  })

  it("fails quietly when Umami can't be reached", async () => {
    const { proxy, send } = setupTest()
    send.mockRejectedValue(new Error('network down'))
    expect((await proxy(tracked({}))).status).toBe(502)
  })
})
