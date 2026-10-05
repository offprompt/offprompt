import { expect, it, vi } from 'vitest'

import { createReachability } from '../src/mcp/reach.js'

const TUNNEL = 'https://some-words.trycloudflare.com'

const dnsError = (code: string) => Object.assign(new Error(code), { code })

const setupTest = ({
  answers,
  status = 404,
  nameservers = true,
}: {
  /** What the zone's nameservers say, call by call. The last answer repeats. */
  answers: readonly (string | Error)[]
  /** What the GET answers with, or 'nothing' when it does not answer. */
  status?: number | 'nothing'
  nameservers?: boolean
}) => {
  const now = { ms: 0 }
  const queue = [...answers]
  const resolve4 = vi.fn<(host: string) => Promise<string[]>>(() => {
    const next = queue.length > 1 ? queue.shift() : queue[0]
    if (next === undefined || next instanceof Error) return Promise.reject(next ?? dnsError('ENOTFOUND'))
    return Promise.resolve([next])
  })
  const authoritative = vi.fn<(zone: string) => Promise<{ resolve4: typeof resolve4 }>>(() =>
    nameservers ? Promise.resolve({ resolve4 }) : Promise.reject(dnsError('ETIMEOUT')),
  )
  const getStatus = vi.fn<(target: { url: string; address?: string }) => Promise<number | undefined>>(() =>
    Promise.resolve(status === 'nothing' ? undefined : status),
  )
  const reaches = createReachability({ clock: () => now.ms, settleMs: 8_000, authoritative, getStatus })
  return { reaches, now, resolve4, authoritative, getStatus }
}

it('asks the zone\'s own nameservers, and sends nothing while the name is not there yet', async () => {
  const { reaches, authoritative, getStatus } = setupTest({ answers: [dnsError('ENOTFOUND')] })

  expect(await reaches(TUNNEL)).toBe(false)
  expect(authoritative).toHaveBeenCalledWith('trycloudflare.com')
  expect(getStatus).not.toHaveBeenCalled()
})

it('pins the GET to the address the nameservers give, once they give one', async () => {
  const { reaches, getStatus, authoritative } = setupTest({ answers: [dnsError('ENOTFOUND'), '104.16.230.132'] })

  expect(await reaches(TUNNEL)).toBe(false)
  expect(await reaches(TUNNEL)).toBe(true)
  expect(getStatus).toHaveBeenCalledWith({ url: TUNNEL, address: '104.16.230.132' })
  expect(authoritative).toHaveBeenCalledTimes(1)
})

it('takes only its own server\'s 404 for an answer', async () => {
  expect(await setupTest({ answers: ['104.16.230.132'], status: 530 }).reaches(TUNNEL)).toBe(false)
  expect(await setupTest({ answers: ['104.16.230.132'], status: 'nothing' }).reaches(TUNNEL)).toBe(false)
})

it.each([
  ['the nameservers cannot be found', { answers: [], nameservers: false }],
  ['the nameservers do not answer', { answers: [dnsError('ETIMEOUT')] }],
])('leaves the system resolver alone until the record has had time to appear, when %s', async (_, options) => {
  const { reaches, now, getStatus } = setupTest(options)

  expect(await reaches(TUNNEL)).toBe(false)
  now.ms = 7_999
  expect(await reaches(TUNNEL)).toBe(false)
  expect(getStatus).not.toHaveBeenCalled()

  now.ms = 8_000
  expect(await reaches(TUNNEL)).toBe(true)
  expect(getStatus).toHaveBeenCalledWith({ url: TUNNEL })
})
