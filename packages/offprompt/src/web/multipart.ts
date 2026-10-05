export type MultipartField = {
  readonly name: string
  readonly filename?: string
  readonly value: string
}

const CRLF = '\r\n'

const HEADER_END = `${CRLF}${CRLF}`

/** The boundary of a `multipart/form-data` content type, quoted or bare. */
export const boundaryOf = (contentType: string) =>
  /;\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType)?.slice(1).find(group => group !== undefined)

const parsePart = (raw: string): MultipartField | undefined => {
  const split = raw.indexOf(HEADER_END)
  if (split === -1) return undefined
  const disposition = raw
    .slice(0, split)
    .split(CRLF)
    .find(header => /^content-disposition:/i.test(header))
  if (disposition === undefined) return undefined
  const name = /;\s*name="([^"]*)"/i.exec(disposition)?.[1]
  if (name === undefined) return undefined
  const value = Buffer.from(raw.slice(split + HEADER_END.length), 'latin1').toString('utf8')
  const filename = /;\s*filename="([^"]*)"/i.exec(disposition)?.[1]
  return filename === undefined ? { name, value } : { name, filename, value }
}

/**
 * Parses a `multipart/form-data` body. Parts are sliced as bytes and only decoded as
 * UTF-8 once, so a value never round-trips through a lossy encoding.
 */
export const parseMultipart = ({ body, boundary }: { body: Buffer; boundary: string }) => {
  const [, ...segments] = body.toString('latin1').split(`--${boundary}`)
  return segments
    .filter(segment => !segment.startsWith('--'))
    .map(segment => segment.replace(/^\r\n/, '').replace(/\r\n$/, ''))
    .map(parsePart)
    .filter((field): field is MultipartField => field !== undefined)
}

/** Value submitted under `name`, or `undefined` when the part is absent. */
export const fieldValue = (fields: readonly MultipartField[], name: string) =>
  fields.find(field => field.name === name)?.value
