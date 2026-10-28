import { describe, expect, it } from 'vitest'

import { providerSchema, type Provider, type Template } from './schema.js'
import { fill, shapeOf } from './template.js'

const SENTRY = ['sentry.io']

const inPath: Template = {
  url: 'https://service.example/org/{org}/tokens?tab=new',
  params: { org: { label: 'the organisation', found: 'org in service.toml', max: 40 } },
}

const inHost: Template = {
  url: 'https://{org}.sentry.io/settings/auth-tokens/',
  params: { org: { label: 'the organization slug', found: '.sentryclirc', max: 63 } },
}

const shaped: Template = {
  url: 'https://service.example/project/{project}/keys',
  params: {
    project: { label: 'the project ref', found: 'SERVICE_URL', pattern: '^[a-z]{20}$', message: '20 lowercase letters', max: 20 },
  },
}

const filled = (template: Template, values: Readonly<Record<string, string>>, domains = ['service.example']) =>
  fill({ template, values, domains })

const problemsOf = (result: ReturnType<typeof fill>) => (result.ok ? [] : result.problems)

describe('filling a template', () => {
  it('puts a value into its one path segment', () => {
    expect(filled(inPath, { org: 'acme' })).toEqual({
      ok: true,
      value: { url: 'https://service.example/org/acme/tokens?tab=new', ignored: [] },
    })
  })

  it('puts a value into its one host label, in lower case', () => {
    expect(filled(inHost, { org: 'Acme-Inc' }, SENTRY)).toEqual({
      ok: true,
      value: { url: 'https://acme-inc.sentry.io/settings/auth-tokens/', ignored: [] },
    })
  })

  it('takes letters, digits, dots, underscores and hyphens in a path segment', () => {
    expect(filled(inPath, { org: 'Acme_Inc.v2-eu' }).ok).toBe(true)
  })

  it('never lets a value add a path, a query, a fragment or another host', () => {
    const tries = ['acme/../../admin', 'acme?next=evil', 'acme#x', 'evil.example@acme', 'acme%2F..', 'acme\\x', 'a b', 'ac:me']
    tries.forEach(value => {
      expect(problemsOf(filled(inPath, { org: value }))).toEqual([
        'org takes letters, digits, ., _ and - only, starting with a letter or a digit',
      ])
    })
  })

  it('refuses a value that a browser would read as a step through the path', () => {
    expect(problemsOf(filled(inPath, { org: '..' }))[0]).toContain('starting with a letter or a digit')
    expect(problemsOf(filled(inPath, { org: '.' }))[0]).toContain('starting with a letter or a digit')
    expect(problemsOf(filled(inPath, { org: '.hidden' }))[0]).toContain('starting with a letter or a digit')
  })

  it('keeps a host value to one label, so it cannot add a level to the host', () => {
    expect(problemsOf(filled(inHost, { org: 'evil.example' }, SENTRY))).toEqual([
      'org takes letters, digits and hyphens only, as one part of a host name',
    ])
    expect(problemsOf(filled(inHost, { org: 'acme_inc' }, SENTRY))[0]).toContain('one part of a host name')
    expect(problemsOf(filled(inHost, { org: '-acme' }, SENTRY))[0]).toContain('one part of a host name')
  })

  it('refuses letters outside ASCII, which could spell a lookalike', () => {
    expect(problemsOf(filled(inPath, { org: 'аcme' }))[0]).toContain('letters, digits')
    expect(problemsOf(filled(inHost, { org: 'аcme' }, SENTRY))[0]).toContain('letters, digits')
  })

  it('holds a value to its parameter’s length and shape', () => {
    expect(problemsOf(filled(inPath, { org: 'a'.repeat(41) }))).toEqual(['org is longer than 40 characters'])
    expect(problemsOf(filled(shaped, { project: 'my-app' }))).toEqual(['project must be 20 lowercase letters'])
    expect(filled(shaped, { project: 'abcdefghijklmnopqrst' }).ok).toBe(true)
  })

  it('fills nothing when a parameter is missing or empty', () => {
    expect(problemsOf(filled(inPath, {}))).toEqual(['org is missing'])
    expect(problemsOf(filled(inPath, { org: '' }))).toEqual(['org is empty'])
  })

  it('names the parameters it was given that the page does not take, and changes nothing for them', () => {
    expect(filled(inPath, { org: 'acme', team: 'core' })).toEqual({
      ok: true,
      value: { url: 'https://service.example/org/acme/tokens?tab=new', ignored: ['team'] },
    })
  })

  it('refuses an address that leaves the domains it is held to', () => {
    expect(problemsOf(filled(inPath, { org: 'acme' }, ['other.example']))).toEqual([
      'the filled address left the page its key links to',
    ])
  })
})

describe('the shape of a template', () => {
  const refusals = (url: string) => {
    const shape = shapeOf(url)
    return shape.ok ? [] : shape.problems
  }

  it('finds where each parameter sits, and the host its fixed labels make', () => {
    const shape = shapeOf('https://{org}.sentry.io/settings/projects/{project}/keys/')
    expect(shape.ok && [...shape.value.places]).toEqual([
      ['org', 'host'],
      ['project', 'path'],
    ])
    expect(shape.ok && shape.value.fixedHost).toBe('sentry.io')
  })

  it('refuses a parameter anywhere but a whole path segment or a leading host label', () => {
    expect(refusals('http://service.example/{org}')[0]).toContain('must start with https://')
    expect(refusals('https://service.example/tokens?org={org}')[0]).toContain('query or fragment')
    expect(refusals('https://service.example/tokens#{org}')[0]).toContain('query or fragment')
    expect(refusals('https://service.example/org-{org}/tokens')[0]).toContain('the whole segment')
    expect(refusals('https://app-{org}.service.example/')[0]).toContain('the whole label')
    expect(refusals('https://app.{org}.service.example/')[0]).toContain('host parameters only lead the host')
    expect(refusals('https://{org}/tokens')[0]).toContain('no fixed part to its host')
    expect(refusals('https://{org}@service.example/')[0]).toContain('names a user or a port')
    expect(refusals('https://service.example/{org}/{org}')[0]).toContain('more than once')
  })
})

const provider = (template: Template): Provider => ({
  id: 'service',
  name: 'Service',
  category: 'deploy',
  homepage: 'https://service.example',
  domains: ['service.example'],
  credentials: [
    { id: 'token', label: 'Token', names: ['SERVICE_TOKEN'], url: 'https://service.example/tokens', template, rules: [] },
  ],
  offers: [],
})

const schemaProblems = (template: Template) => {
  const result = providerSchema.safeParse(provider(template))
  return result.success ? [] : result.error.issues.map(issue => issue.message)
}

describe('a template in the registry', () => {
  it('passes when its fixed part is https on the provider’s domains and every parameter has a rule', () => {
    expect(schemaProblems(inPath)).toEqual([])
    expect(schemaProblems({ ...inPath, url: 'https://{org}.service.example/tokens' })).toEqual([])
  })

  it('is held to the provider’s domains as a plain link is', () => {
    expect(schemaProblems({ ...inPath, url: 'https://elsewhere.example/org/{org}/tokens' })).toEqual([
      "https://elsewhere.example/org/{org}/tokens is not on Service's domains",
    ])
  })

  it('never lets a host parameter decide the domain', () => {
    expect(schemaProblems({ ...inPath, url: 'https://{org}.example/tokens' })).toEqual([
      "https://{org}.example/tokens is not on Service's domains",
    ])
  })

  it('needs a rule for every parameter, and a use for every rule', () => {
    expect(schemaProblems({ ...inPath, params: {} })).toEqual(['https://service.example/org/{org}/tokens?tab=new has no rule for {org}'])
    expect(
      schemaProblems({ ...inPath, params: { ...inPath.params, team: { label: 'the team', found: 'anywhere', max: 10 } } }),
    ).toEqual(['https://service.example/org/{org}/tokens?tab=new never uses its parameter team'])
  })

  it('keeps a host parameter to the length of a host label', () => {
    expect(
      schemaProblems({ url: 'https://{org}.service.example/', params: { org: { label: 'the org', found: 'here', max: 64 } } }),
    ).toEqual(['{org} fills a host label, which is 63 characters at most'])
  })

  it('gives a narrower shape the words that say it', () => {
    expect(
      schemaProblems({ ...inPath, params: { org: { label: 'the org', found: 'here', pattern: '^[a-z]+$', max: 10 } } }),
    ).toEqual(['a pattern comes with the message that says it'])
  })
})
