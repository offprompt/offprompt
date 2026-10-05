import { describe, expect, it } from 'vitest'

import { boundaryOf, fieldValue, parseMultipart } from '../src/web/multipart.js'

const BOUNDARY = '----offpromptBoundary'

const bodyOf = (parts: readonly string[]) =>
  Buffer.from(`${parts.map(part => `--${BOUNDARY}\r\n${part}\r\n`).join('')}--${BOUNDARY}--\r\n`, 'latin1')

describe('boundaryOf', () => {
  it('reads a bare boundary', () => {
    expect(boundaryOf(`multipart/form-data; boundary=${BOUNDARY}`)).toBe(BOUNDARY)
  })

  it('reads a quoted boundary', () => {
    expect(boundaryOf(`multipart/form-data; boundary="${BOUNDARY}"`)).toBe(BOUNDARY)
  })

  it('reads a boundary that is not the last parameter', () => {
    expect(boundaryOf(`multipart/form-data; boundary=${BOUNDARY}; charset=utf-8`)).toBe(BOUNDARY)
  })

  it('returns nothing when there is no boundary', () => {
    expect(boundaryOf('multipart/form-data')).toBeUndefined()
  })
})

describe('parseMultipart', () => {
  it('reads a plain field', () => {
    const body = bodyOf(['Content-Disposition: form-data; name="nonce"\r\n\r\nabc123'])
    expect(parseMultipart({ body, boundary: BOUNDARY })).toEqual([{ name: 'nonce', value: 'abc123' }])
  })

  it('reads a file field and keeps its filename', () => {
    const body = bodyOf([
      'Content-Disposition: form-data; name="valueFile"; filename="id.pem"\r\nContent-Type: application/x-pem-file\r\n\r\nBODY',
    ])
    expect(parseMultipart({ body, boundary: BOUNDARY })).toEqual([
      { name: 'valueFile', filename: 'id.pem', value: 'BODY' },
    ])
  })

  it('keeps a multi-line value intact', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\r\nMIIB\r\n-----END PRIVATE KEY-----'
    const body = bodyOf([`Content-Disposition: form-data; name="value"\r\n\r\n${pem}`])
    expect(fieldValue(parseMultipart({ body, boundary: BOUNDARY }), 'value')).toBe(pem)
  })

  it('decodes a value as UTF-8 exactly once', () => {
    const value = 'päßwörd — with em dash'
    const raw = Buffer.concat([
      Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="value"\r\n\r\n`, 'latin1'),
      Buffer.from(value, 'utf8'),
      Buffer.from(`\r\n--${BOUNDARY}--\r\n`, 'latin1'),
    ])
    expect(fieldValue(parseMultipart({ body: raw, boundary: BOUNDARY }), 'value')).toBe(value)
  })

  it('reads several fields in order', () => {
    const body = bodyOf([
      'Content-Disposition: form-data; name="nonce"\r\n\r\nn1',
      'Content-Disposition: form-data; name="value"\r\n\r\nv1',
      'Content-Disposition: form-data; name="allowTracked"\r\n\r\nyes',
    ])
    const fields = parseMultipart({ body, boundary: BOUNDARY })
    expect(fields.map(field => field.name)).toEqual(['nonce', 'value', 'allowTracked'])
    expect(fieldValue(fields, 'allowTracked')).toBe('yes')
  })

  it('skips a part with no content disposition', () => {
    const body = bodyOf(['X-Other: 1\r\n\r\nignored'])
    expect(parseMultipart({ body, boundary: BOUNDARY })).toEqual([])
  })

  it('returns nothing for a body with no parts', () => {
    expect(parseMultipart({ body: Buffer.from(`--${BOUNDARY}--\r\n`), boundary: BOUNDARY })).toEqual([])
  })
})

describe('fieldValue', () => {
  it('returns nothing for a field that was not submitted', () => {
    expect(fieldValue([], 'value')).toBeUndefined()
  })
})
