import { z } from 'zod'

/**
 * The shape of every registry entry. Providers, their credentials and value formats are
 * plain data of these types, and the registry test parses each one against these schemas,
 * the way 1Password's shell-plugins validates each plugin against its SDK schema.
 */

/** Named checks a format rule can call on. Each is implemented in `checks.ts`. */
export const CHECKS = ['email', 'url', 'hostname', 'uuid', 'jwt', 'base64', 'json', 'pem', 'postgres'] as const

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

const onDomains = ({ url, domains }: { url: string; domains: readonly string[] }) => {
  const { hostname } = new URL(url)
  return domains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))
}

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
      .filter(url => isHttpsUrl(url) && !onDomains({ url, domains: provider.domains }))
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
export type Offer = z.infer<typeof offerSchema>
export type Provider = z.infer<typeof providerSchema>
export type Format = z.infer<typeof formatSchema>
