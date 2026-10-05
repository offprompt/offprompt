/**
 * Writes what the docs take from the offprompt they build against, so it is always that
 * version's: its page to try and each provider's fields, as its showcase renders them, into
 * public/ for the docs to show in a frame, and a page per provider under reference/providers/.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { DEMO, exampleFor, formats, providers, samplePage } from 'offprompt/showcase'

const samples = new URL('../public/samples/', import.meta.url)
const fields = new URL('providers/', samples)
const pages = new URL('../src/pages/reference/providers/', import.meta.url)

/** The env name a project reads a value of this format under, when a provider only offers to make one. */
const FORMAT_KEYS = { postgres_url: 'DATABASE_URL' }

/** Each field a provider's page shows: one per key, or the format it offers to make. */
const asksOf = provider => {
  if (provider.credentials.length > 0) {
    return provider.credentials.map(credential => ({
      ask: { name: credential.names[0], provider: `${provider.id}/${credential.id}` },
      example: exampleFor(credential),
    }))
  }
  return provider.offers.flatMap(offer => {
    const format = formats.find(candidate => candidate.id === offer.format)
    if (format === undefined) return []
    return [{ ask: { name: FORMAT_KEYS[format.id] ?? format.id.toUpperCase(), format: format.id }, example: exampleFor(format) }]
  })
}

/** A provider's fields alone, each filled with an example its checks pass, to change and watch the checks. */
const fieldsOf = provider => {
  const asks = asksOf(provider)
  return samplePage({
    asks: asks.map(({ ask }) => ask),
    reason: `${provider.name}'s keys, as offprompt's page draws them.`,
    file: { kind: 'dotenv', path: '.env', holds: [] },
    project: 'acme-api',
    asker: 'claude-code',
    revealed: true,
    view: 'fields',
    demo: { filled: asks.map(({ ask, example }) => [ask.name, example]) },
  })
}

const pageOf = provider => `---
title: ${provider.name}
description: ${provider.name} in offprompt's registry, the keys it issues, where each is made, and the checks each has to pass.
---

{/* Written by scripts/samples.mjs from offprompt's registry. */}

import { FieldPreview } from '../../../components/field-preview'
import { ProviderHeader } from '../../../components/provider-header'

# ${provider.name}

<ProviderHeader id="${provider.id}" />

::provider-ask{id="${provider.id}"}

<FieldPreview id="${provider.id}" name="${provider.name}" />

::provider-keys{id="${provider.id}"}
`

await Promise.all([rm(fields, { recursive: true, force: true }), rm(pages, { recursive: true, force: true })])
await Promise.all([mkdir(fields, { recursive: true }), mkdir(pages, { recursive: true })])
await Promise.all([
  writeFile(new URL('try.html', samples), samplePage(DEMO)),
  ...providers.map(provider => writeFile(new URL(`${provider.id}.html`, fields), fieldsOf(provider))),
  ...providers.map(provider => writeFile(new URL(`${provider.id}.mdx`, pages), pageOf(provider))),
])
