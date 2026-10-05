import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { formatList } from './formats.js'
import { providerRefs, providers } from './registry.js'
import { formatSchema, providerSchema } from './schema.js'

const here = dirname(fileURLToPath(import.meta.url))

const problemsOf = (result: { success: boolean; error?: { issues: readonly { message: string }[] } | undefined }) =>
  result.success ? [] : (result.error?.issues ?? []).map(issue => issue.message)

const duplicates = (values: readonly string[]) => values.filter((value, index) => values.indexOf(value) !== index)

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? sourceFiles(join(directory, entry.name)) : entry.name.endsWith('.ts') ? [join(directory, entry.name)] : [],
  )

describe('every entry follows the schema', () => {
  it.each(providers.map(provider => [provider.id, provider] as const))('provider %s', (_id, provider) => {
    expect(problemsOf(providerSchema.safeParse(provider))).toEqual([])
  })

  it.each(formatList.map(format => [format.id, format] as const))('format %s', (_id, format) => {
    expect(problemsOf(formatSchema.safeParse(format))).toEqual([])
  })
})

describe('the registry as a whole', () => {
  it('gives every provider, key and format a name of its own', () => {
    expect(duplicates(providers.map(provider => provider.id))).toEqual([])
    expect(duplicates(providerRefs)).toEqual([])
    expect(duplicates(formatList.map(format => format.id))).toEqual([])
  })

  it('never lets two keys go by the same env name, so a name points at one key', () => {
    expect(duplicates(providers.flatMap(provider => provider.credentials.flatMap(key => key.names)))).toEqual([])
  })

  it('only offers formats that exist', () => {
    const ids = new Set<string>(formatList.map(format => format.id))
    expect(providers.flatMap(provider => provider.offers.filter(offer => !ids.has(offer.format)))).toEqual([])
  })

  it('accepts a provider that issues keys on the tool, and each key of one that issues several', () => {
    expect(providerRefs).toEqual(expect.arrayContaining(['stripe', 'stripe/webhook_secret', 'resend']))
    expect(providerRefs).not.toContain('resend/api_key')
    expect(providerRefs).not.toContain('neon')
  })

  it('imports nothing from outside its own folder, so it can move to a repository of its own', () => {
    const outside = sourceFiles(here).flatMap(file =>
      [...readFileSync(file, 'utf8').matchAll(/from '(\.[^']+)'/g)]
        .map(match => resolve(dirname(file), match[1] ?? ''))
        .filter(target => relative(here, target).startsWith('..'))
        .map(target => `${relative(here, file)} imports ${target}`),
    )
    expect(outside).toEqual([])
  })
})
