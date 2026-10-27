import * as z from 'zod'

import { LABEL_MAX, onDomains, PARAM_MAX, PARAM_NAME, shapeOf, substituted } from './template.js'

/**
 * The shape of every registry entry. Providers, their credentials and value formats are
 * plain data of these types, and the registry test parses each one against these schemas,
 * the way 1Password's shell-plugins validates each plugin against its SDK schema.
 */

/** Named checks a format rule can call on. Each is implemented in `checks.ts`. */
export const CHECKS = ['email', 'url', 'http_url', 'hostname', 'uuid', 'jwt', 'base64', 'json', 'pem', 'postgres'] as const

/** What a provider is for, as the docs group providers. */
export const CATEGORIES = ['ai', 'payments', 'messaging', 'data', 'auth', 'deploy', 'product', 'stores'] as const

const ENV_NAME = /^[A-Z][A-Z0-9_]*$/

const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/

const message = z.string().min(1)

const compiles = (pattern: string) => {
  try {
    new RegExp(pattern)
    return true
  } catch {
    return false
  }
}

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

const httpsUrl = z.string().refine(isHttpsUrl, 'must be an https URL')

const prefixRule = z.object({ kind: z.literal('prefix'), anyOf: z.array(z.string().min(1)).min(1).readonly(), message })

const lengthRule = z
  .object({ kind: z.literal('length'), min: z.int().min(0), max: z.int().min(1), message })
  .refine(rule => rule.min <= rule.max, 'min must not exceed max')

const charsetRule = z.object({
  kind: z.literal('charset'),
  pattern: z.string().refine(compiles, 'must be a valid regular expression'),
  message,
})

const formatRule = z.object({ kind: z.literal('format'), format: z.enum(CHECKS), message })

/** A rule that is not a choice. */
const singleRule = z.discriminatedUnion('kind', [prefixRule, lengthRule, charsetRule, formatRule])

/** A value passes when it passes every rule of any one option, shown as one line. */
const eitherRule = z.object({
  kind: z.literal('either'),
  options: z.array(z.array(singleRule).min(1).readonly()).min(2).readonly(),
  message,
})

/**
 * A check a value must pass, with the line shown under the field for it. Lines are
 * written by hand and never built from the value.
 */
export const ruleSchema = z.discriminatedUnion('kind', [prefixRule, lengthRule, charsetRule, formatRule, eitherRule])

/** A logo, one path on a 24×24 grid, drawn in the text colour, or white on the provider's colour. */
export const logoSchema = z
  .object({
    path: z.string().regex(/^[MmLlHhVvCcSsQqTtAaZz0-9 .,-]+$/, 'must be one path of plain path commands'),
    /** For paths with holes that the default fill rule would paint over. */
    evenOdd: z.boolean().optional(),
  })
  .readonly()

/**
 * One parameter of a key's templated page. Every value is held to letters, digits, `.`, `_`
 * and `-` before this rule is read, so the rule can narrow that and never widen it.
 */
export const templateParamSchema = z
  .object({
    /** What the value is, inside a sentence the agent reads: "the project ref". */
    label: z.string().min(1),
    /** Where a project usually keeps it, so the agent reads it rather than guessing. */
    found: z.string().min(1),
    /** A narrower shape, such as `^[a-z]{20}$` for a Supabase project ref. */
    pattern: z.string().refine(compiles, 'must be a valid regular expression').optional(),
    /** The shape in words, said when a value does not have it: "20 lowercase letters". */
    message: z.string().min(1).optional(),
    max: z.int().min(1).max(PARAM_MAX),
  })
  .readonly()
  .refine(param => (param.pattern === undefined) === (param.message === undefined), 'a pattern comes with the message that says it')

/**
 * The page where a key is made inside one account, organisation or project, with a parameter
 * for each part of its address that names it: `https://sentry.io/settings/{org}/auth-tokens/`.
 * A parameter is a whole path segment or a whole leading label of the host, and every one has
 * a rule. A host label may only be templated under a domain whose every subdomain the provider
 * runs itself, never one that serves its customers' own pages.
 */
export const templateSchema = z
  .object({
    url: z.string(),
    params: z.record(z.string().regex(PARAM_NAME), templateParamSchema).readonly(),
  })
  .readonly()
  .superRefine((template, context) => {
    const shape = shapeOf(template.url)
    if (!shape.ok) {
      shape.problems.forEach(problem => context.addIssue({ code: 'custom', message: problem }))
      return
    }
    const named = [...shape.value.places.keys()]
    const ruled = Object.keys(template.params)
    named
      .filter(name => !ruled.includes(name))
      .forEach(name => context.addIssue({ code: 'custom', message: `${template.url} has no rule for {${name}}` }))
    ruled
      .filter(name => !named.includes(name))
      .forEach(name => context.addIssue({ code: 'custom', message: `${template.url} never uses its parameter ${name}` }))
    named
      .filter(name => shape.value.places.get(name) === 'host' && (template.params[name]?.max ?? 0) > LABEL_MAX)
      .forEach(name =>
        context.addIssue({ code: 'custom', message: `{${name}} fills a host label, which is ${String(LABEL_MAX)} characters at most` }),
      )
  })

/** The address a template makes with a stand-in for each parameter, to be checked like any plain link. */
export const standInFor = (url: string) => {
  const shape = shapeOf(url)
  return shape.ok ? substituted({ url, values: new Map([...shape.value.places.keys()].map(name => [name, 'a'])) }) : url
}

/** A key, token or signing secret a provider issues, and where a person gets one. */
export const credentialSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_]*$/),
    /** What the provider calls it, such as "Secret key". */
    label: z.string().min(1),
    /** The env names projects conventionally give it, without a framework prefix. */
    names: z.array(z.string().regex(ENV_NAME)).min(1).readonly(),
    /** The page where it is created or copied. */
    url: httpsUrl,
    /**
     * The same page inside the account, organisation or project the agent names, where the
     * address says which. Without every parameter, the key links to `url`.
     */
    template: templateSchema.optional(),
    placeholder: z.string().min(1).optional(),
    /** False for a key meant to be public, such as a publishable key. True when absent. */
    secret: z.boolean().optional(),
    rules: z.array(ruleSchema).readonly(),
    /**
     * A value its rules pass, plainly an example, for where offprompt's page is shown rather than
     * used. Only for a key whose rules cannot make one, such as a Telegram bot token's digits,
     * colon and letters.
     */
    example: z.string().min(1).optional(),
  })
  .readonly()

/** Where someone who has no value of a format yet can create one with the provider. */
export const offerSchema = z.object({ format: z.string().min(1), url: httpsUrl }).readonly()

const linkOnDomains = ({ url, domains }: { url: string; domains: readonly string[] }) =>
  onDomains({ hostname: new URL(url).hostname, domains })

export const providerSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    name: z.string().min(1),
    category: z.enum(CATEGORIES),
    homepage: httpsUrl,
    /** From Simple Icons or lobe-icons. A brand neither draws has none, and its initial stands in. */
    logo: logoSchema.optional(),
    /** A brand colour for the logo's tile, the logo drawn white on it. Without one the logo is drawn in the text colour. */
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/, 'must be a hex colour such as #635BFF')
      .optional(),
    /** Every link in the entry points at one of these, or at a subdomain of one. */
    domains: z.array(z.string().regex(DOMAIN)).min(1).readonly(),
    credentials: z.array(credentialSchema).readonly(),
    offers: z.array(offerSchema).readonly(),
  })
  .readonly()
  .superRefine((provider, context) => {
    const links = [provider.homepage, ...provider.credentials.map(key => key.url), ...provider.offers.map(offer => offer.url)]
    links
      .filter(url => isHttpsUrl(url) && !linkOnDomains({ url, domains: provider.domains }))
      .forEach(url => context.addIssue({ code: 'custom', message: `${url} is not on ${provider.name}'s domains` }))
    // A template's fixed part is checked as a plain link is: https, on the provider's domains.
    // Its host without the labels parameters fill must be on them too, so no value can pick
    // which domain the link is on.
    const templates = provider.credentials.flatMap(key => (key.template === undefined ? [] : [key.template.url]))
    templates
      .filter(url => {
        const shape = shapeOf(url)
        if (!shape.ok) return false
        const standIn = standInFor(url)
        return (
          !isHttpsUrl(standIn) ||
          !linkOnDomains({ url: standIn, domains: provider.domains }) ||
          !onDomains({ hostname: shape.value.fixedHost, domains: provider.domains })
        )
      })
      .forEach(url => context.addIssue({ code: 'custom', message: `${url} is not on ${provider.name}'s domains` }))
    const ids = provider.credentials.map(key => key.id)
    ids
      .filter((id, index) => ids.indexOf(id) !== index)
      .forEach(id => context.addIssue({ code: 'custom', message: `${provider.id} lists ${id} twice` }))
  })

/** A kind of value no single provider owns: plain text, a whole number, a Postgres connection string. */
export const formatSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_]*$/),
    /**
     * What the value is, as it reads inside a sentence, such as "email address" or "Postgres
     * connection string": said beside the field and once the value checks out.
     */
    label: z.string().min(1).optional(),
    placeholder: z.string().min(1).optional(),
    /** A taller field with a file picker, shown in the clear. */
    multiline: z.boolean().optional(),
    rules: z.array(ruleSchema).readonly(),
  })
  .readonly()

export type CheckName = (typeof CHECKS)[number]
export type Category = (typeof CATEGORIES)[number]
export type Rule = z.infer<typeof ruleSchema>
export type Logo = z.infer<typeof logoSchema>
export type Credential = z.infer<typeof credentialSchema>
export type Template = z.infer<typeof templateSchema>
export type Offer = z.infer<typeof offerSchema>
export type Provider = z.infer<typeof providerSchema>
export type Format = z.infer<typeof formatSchema>
