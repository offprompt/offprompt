import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parse } from 'dotenv'
import { describe, expect, it } from 'vitest'

import { dotenvCanHold, dotenvHasKey, parseDotenv, upsertDotenv } from '../src/core/dotenv.js'

const upsert = (contents: string, name: string, value: string) => upsertDotenv({ contents, name, value })

describe('upsertDotenv', () => {
  it('appends a key to an empty file', () => {
    const result = upsert('', 'RESEND_API_KEY', 're_abc123')
    expect(result).toEqual({ ok: true, value: { contents: 'RESEND_API_KEY=re_abc123\n', overwrote: false } })
  })

  it('appends a key and leaves every other line byte-identical', () => {
    const existing = '# comment\nPORT=3000\n\nexport OTHER="a b"\n'
    const result = upsert(existing, 'NEW_KEY', 'value')
    expect(result.ok).toBe(true)
    expect(result.ok && result.value.contents).toBe(`${existing}NEW_KEY=value\n`)
  })

  it('updates an existing key in place and reports the overwrite', () => {
    const result = upsert('A=1\nTOKEN=old\nB=2\n', 'TOKEN', 'new')
    expect(result.ok && result.value).toEqual({ contents: 'A=1\nTOKEN=new\nB=2\n', overwrote: true })
  })

  it('keeps the export prefix and indentation of the line it replaces', () => {
    const result = upsert('  export TOKEN=old\n', 'TOKEN', 'new')
    expect(result.ok && result.value.contents).toBe('  export TOKEN=new\n')
  })

  it('drops later duplicates so no parser resolves the previous value', () => {
    const existing = 'TOKEN=first\nOTHER=keep\nTOKEN=second\n'
    expect(dotenvHasKey(existing, 'TOKEN')).toBe(true)
    const result = upsert(existing, 'TOKEN', 'new')
    expect(result.ok && result.value.contents).toBe('TOKEN=new\nOTHER=keep\n')
    expect(result.ok && result.value.contents).not.toContain('second')
  })

  it('leaves a simple value unquoted', () => {
    const result = upsert('', 'K', 'sk-abc_123.xyz')
    expect(result.ok && result.value.contents).toBe('K=sk-abc_123.xyz\n')
  })

  it('single-quotes a value carrying a comment character', () => {
    const result = upsert('', 'K', 'a#b')
    expect(result.ok && result.value.contents).toBe("K='a#b'\n")
  })

  it('single-quotes a value with trailing whitespace so a reader that trims keeps it', () => {
    const result = upsert('', 'K', 'value ')
    expect(result.ok && result.value.contents).toBe("K='value '\n")
  })

  it('single-quotes a value with a double quote inside, which a shell would read differently bare', () => {
    const result = upsert('', 'K', 'say "hi"')
    expect(result.ok && result.value.contents).toBe(`K='say "hi"'\n`)
  })

  it('single-quotes a connection string whose query a shell would cut at the &', () => {
    const url = 'postgresql://app:pw@ep-cool.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    const result = upsert('', 'DATABASE_URL', url)
    expect(result.ok && result.value.contents).toBe(`DATABASE_URL='${url}'\n`)
  })

  it('double-quotes a value that opens with a single quote', () => {
    const result = upsert('', 'K', "'hello'")
    expect(result.ok && result.value.contents).toBe('K="\'hello\'"\n')
  })

  it('escapes newlines so a PEM stays on one line', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----'
    const result = upsert('', 'KEY', pem)
    expect(result.ok && result.value.contents).toBe(
      'KEY="-----BEGIN PRIVATE KEY-----\\nMIIB\\n-----END PRIVATE KEY-----"\n',
    )
  })

  it('refuses a value that opens with a quote and mixes both kinds', () => {
    const result = upsert('', 'K', `"it's`)
    expect(result).toEqual({
      ok: false,
      message: 'that value mixes quote characters and cannot be stored in a .env file',
    })
  })

  it('writes an empty value as an empty quoted string', () => {
    const result = upsert('', 'K', '')
    expect(result.ok && result.value.contents).toBe("K=''\n")
  })
})

describe('dotenvHasKey', () => {
  it('ignores a key that only appears inside a value', () => {
    expect(dotenvHasKey('OTHER=TOKEN=x\n', 'TOKEN')).toBe(false)
  })

  it('finds a key written with an export prefix', () => {
    expect(dotenvHasKey('export TOKEN=x\n', 'TOKEN')).toBe(true)
  })

  it('does not match a key that merely shares a prefix', () => {
    expect(dotenvHasKey('TOKEN_ID=x\n', 'TOKEN')).toBe(false)
  })
})

describe('round trip through the dotenv parser', () => {
  const cases = [
    ['a plain key', 'sk-abc_123.xyz'],
    ['a value with spaces', 'hello there'],
    ['a value with a comment character', 'pa#ss'],
    ['a value with trailing whitespace', 'value '],
    ['a value with leading whitespace', ' value'],
    ['a value opening with a single quote', "'quoted'"],
    ['a value with a double quote inside', 'say "hi"'],
    ['a value with a backslash', String.raw`C:\keys\id`],
    ['a PEM block', '-----BEGIN PRIVATE KEY-----\nMIIBabc\n-----END PRIVATE KEY-----'],
    ['a connection string', 'postgres://user:p%40ss@host:5432/db?sslmode=require'],
    ['an empty value', ''],
  ] as const

  it.each(cases)('reads back %s exactly as it was written', (_label, value) => {
    const written = upsert('PRIOR=keep\n', 'SECRET', value)
    expect(written.ok).toBe(true)
    const parsed = parse(written.ok ? written.value.contents : '')
    expect(parsed.SECRET).toBe(value)
    expect(parsed.PRIOR).toBe('keep')
  })
})

describe('upserting over a value that spans several lines', () => {
  const existing = 'PORT=3000\nTLS_CERT="-----BEGIN CERT-----\nMIIBsecretsecretsecret\n-----END CERT-----"\nNEXT=1\n'

  it('replaces every line of the old value and orphans none of it', () => {
    const result = upsert(existing, 'TLS_CERT', 'newcert')
    expect(result.ok && result.value.contents).toBe('PORT=3000\nTLS_CERT=newcert\nNEXT=1\n')
    expect(result.ok && result.value.contents).not.toContain('MIIBsecretsecretsecret')
  })

  it('leaves the multi-line value alone when a different key is written', () => {
    const result = upsert(existing, 'OTHER', 'x')
    expect(result.ok && result.value.contents).toBe(`${existing}OTHER=x\n`)
  })

  it('reads back a JSON document written to a dotenv file', () => {
    const document = '{\n  "type": "service_account",\n  "private_key": "-----BEGIN KEY-----"\n}'
    const written = upsert('PRIOR=keep\n', 'GCP_SA', document)
    expect(written.ok).toBe(true)
    const parsed = parse(written.ok ? written.value.contents : '')
    expect(parsed.GCP_SA).toBe(document)
    expect(parsed.PRIOR).toBe('keep')
  })

  it('still refuses a value that mixes both quote characters', () => {
    const result = upsert('', 'K', `{"a": "it's"}\nmore`)
    expect(result).toEqual({
      ok: false,
      message: 'that value mixes quote characters and cannot be stored in a .env file',
    })
  })
})

describe('parseDotenv', () => {
  it('reads a bare assignment and drops a trailing comment', () => {
    expect(parseDotenv('PORT=3000 # the port\n')).toMatchObject([{ key: 'PORT', value: '3000' }])
  })

  it('reads a quoted value without its quotes', () => {
    expect(parseDotenv(`A="one two"\nB='three'\n`)).toMatchObject([
      { key: 'A', value: 'one two' },
      { key: 'B', value: 'three' },
    ])
  })

  it('returns an unterminated quoted value rather than losing the rest of the file', () => {
    const contents = 'BROKEN="oops\nAPI_KEY=re_aaaaaaaaaaaaaaaaaaaa\nTOKEN=ghp_bbbbbbbbbbbbbbbbbbbb\n'
    expect(parseDotenv(contents)).toMatchObject([{ key: 'BROKEN', firstLine: 0, lastLine: 3 }])
    expect(parseDotenv(contents)[0]?.value).toContain('re_aaaaaaaaaaaaaaaaaaaa')
  })

  it('stops a double-quoted value at a quote that is not escaped, and keeps the backslash as dotenv does', () => {
    const line = 'PASSWORD="ab\\"cdefghijklmnopqrs"\n'
    expect(parseDotenv(line)).toMatchObject([{ key: 'PASSWORD', value: 'ab\\"cdefghijklmnopqrs' }])
  })

  it('reads a single-quoted value literally, to the next single quote', () => {
    expect(parseDotenv("PASSWORD='pa#ss\\\\word'\nNEXT='x#y\\'\nAFTER=1\n")).toMatchObject([
      { key: 'PASSWORD', value: 'pa#ss\\\\word' },
      { key: 'NEXT', value: 'x#y\\' },
      { key: 'AFTER', value: '1' },
    ])
  })

  it('expands the escapes a dotenv reader expands', () => {
    expect(parseDotenv(String.raw`KEY="one
two"` + '\n')).toMatchObject([{ key: 'KEY', value: 'one\ntwo' }])
    expect(parseDotenv(String.raw`KEY='one
two'` + '\n')).toMatchObject([{ key: 'KEY', value: String.raw`one
two` }])
  })

  it('folds a quoted value that runs over several lines', () => {
    const contents = 'KEY="-----BEGIN PRIVATE KEY-----\nMIIBabc\n-----END PRIVATE KEY-----"\nAFTER=1\n'
    expect(parseDotenv(contents)).toMatchObject([
      {
        key: 'KEY',
        value: '-----BEGIN PRIVATE KEY-----\nMIIBabc\n-----END PRIVATE KEY-----',
        firstLine: 0,
        lastLine: 2,
      },
      { key: 'AFTER', value: '1', firstLine: 3, lastLine: 3 },
    ])
  })

  it('ignores comments and blank lines', () => {
    expect(parseDotenv('# a comment\n\n   \nA=1\n')).toMatchObject([{ key: 'A', value: '1' }])
  })

  it('keeps the export prefix so a redacted line can be rebuilt', () => {
    expect(parseDotenv('  export A=1\n')).toMatchObject([{ key: 'A', prefix: '  export A=' }])
  })
})

describe('a value written and read back', () => {
  /**
   * Characters that each change how a value has to be quoted, and ordinary ones between them.
   * No carriage return: the page and the server turn every line ending into a newline first.
   */
  const PIECES = ['a', 'Z', '9', ' ', '#', "'", '"', '`', '\\', '\\n', 'n', '=', '$', '\n', '\t', 'é', '🔑']

  /** A reproducible spread of tricky values, from a small seeded generator rather than a library. */
  const values = Array.from({ length: 4000 }, (_, index) => {
    const seed = (index * 2654435761) >>> 0
    const length = 1 + (seed % 9)
    return Array.from({ length }, (_, position) => PIECES[(seed >>> (position * 3)) % PIECES.length] ?? '').join('')
  })

  it('comes back exactly, in offprompt and in dotenv, whenever offprompt agrees to write it', () => {
    const held = values.filter(dotenvCanHold)
    const mismatches = held.filter(value => {
      const written = upsertDotenv({ contents: 'BEFORE=1\n', name: 'KEY', value })
      if (!written.ok) return true
      const contents = `${written.value.contents}AFTER=2\n`
      const ours = parseDotenv(contents)
      const theirs = parse(contents)
      return (
        ours.find(entry => entry.key === 'KEY')?.value !== value ||
        ours.find(entry => entry.key === 'AFTER')?.value !== '2' ||
        theirs.KEY !== value ||
        theirs.AFTER !== '2'
      )
    })
    expect(held.length).toBeGreaterThan(1000)
    expect(mismatches.slice(0, 5)).toEqual([])
  })
})

describe('a file a shell sources', () => {
  /**
   * Values that a shell reads differently from a dotenv reader when they are bare: the end of
   * a command, a pipe, an expansion, a subshell, a redirect, a glob, a home directory, a space.
   */
  const VALUES = [
    'postgresql://app:pw@host/db?sslmode=require&channel_binding=require',
    'a;b',
    'a|b',
    '$HOME',
    '${HOME}',
    '`id`',
    '$(id)',
    '(a)',
    'a>b',
    'a<b',
    '*',
    '~/key',
    'two words',
    'a#b',
    'say "hi"',
    'it\\s',
    ' leading',
    'trailing ',
    "it's plain",
    'sk_test_EXAMPLE0ffpr0mpt',
    '',
  ]

  /** What a shell holds for each key once it has sourced the contents, read by a child it starts. */
  const sourced = (contents: string) => {
    const folder = mkdtempSync(join(tmpdir(), 'offprompt-dotenv-'))
    try {
      const file = join(folder, '.env')
      writeFileSync(file, contents)
      const printer = "process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('SOURCED_')))))"
      const output = execFileSync('sh', ['-c', 'set -a; . "$1"; exec "$2" -e "$3"', 'sh', file, process.execPath, printer], {
        encoding: 'utf8',
        env: { PATH: process.env.PATH ?? '' },
        // Where a value the shell took for a redirect would write, should quoting ever slip again.
        cwd: folder,
      })
      return JSON.parse(output) as Record<string, string>
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  }

  it('gives the shell the same values dotenv reads', () => {
    const contents = VALUES.reduce((file, value, index) => {
      const written = upsertDotenv({ contents: file, name: `SOURCED_${String(index)}`, value })
      if (!written.ok) throw new Error(written.message)
      return written.value.contents
    }, '')
    const shell = sourced(contents)
    const mismatches = VALUES.filter((value, index) => shell[`SOURCED_${String(index)}`] !== value)
    expect(mismatches).toEqual([])
    expect(parse(contents)).toEqual(shell)
  })
})
