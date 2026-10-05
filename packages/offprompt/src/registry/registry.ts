import { algolia } from './providers/algolia/provider.js'
import { anthropic } from './providers/anthropic/provider.js'
import { auth0 } from './providers/auth0/provider.js'
import { aws } from './providers/aws/provider.js'
import { axiom } from './providers/axiom/provider.js'
import { clerk } from './providers/clerk/provider.js'
import { cloudflare } from './providers/cloudflare/provider.js'
import { cloudinary } from './providers/cloudinary/provider.js'
import { cohere } from './providers/cohere/provider.js'
import { convex } from './providers/convex/provider.js'
import { datadog } from './providers/datadog/provider.js'
import { deepseek } from './providers/deepseek/provider.js'
import { digitalocean } from './providers/digitalocean/provider.js'
import { discord } from './providers/discord/provider.js'
import { docker } from './providers/docker/provider.js'
import { doppler } from './providers/doppler/provider.js'
import { elevenlabs } from './providers/elevenlabs/provider.js'
import { fireworks } from './providers/fireworks/provider.js'
import { fly } from './providers/fly/provider.js'
import { gemini } from './providers/gemini/provider.js'
import { github } from './providers/github/provider.js'
import { gitlab } from './providers/gitlab/provider.js'
import { groq } from './providers/groq/provider.js'
import { huggingface } from './providers/huggingface/provider.js'
import { infisical } from './providers/infisical/provider.js'
import { lemonsqueezy } from './providers/lemonsqueezy/provider.js'
import { linear } from './providers/linear/provider.js'
import { mailgun } from './providers/mailgun/provider.js'
import { mapbox } from './providers/mapbox/provider.js'
import { mistral } from './providers/mistral/provider.js'
import { mongodb } from './providers/mongodb/provider.js'
import { neon } from './providers/neon/provider.js'
import { netlify } from './providers/netlify/provider.js'
import { notion } from './providers/notion/provider.js'
import { npm } from './providers/npm/provider.js'
import { onepassword } from './providers/onepassword/provider.js'
import { openai } from './providers/openai/provider.js'
import { openrouter } from './providers/openrouter/provider.js'
import { paddle } from './providers/paddle/provider.js'
import { perplexity } from './providers/perplexity/provider.js'
import { pinecone } from './providers/pinecone/provider.js'
import { planetscale } from './providers/planetscale/provider.js'
import { polar } from './providers/polar/provider.js'
import { posthog } from './providers/posthog/provider.js'
import { postmark } from './providers/postmark/provider.js'
import { railway } from './providers/railway/provider.js'
import { render } from './providers/render/provider.js'
import { replicate } from './providers/replicate/provider.js'
import { resend } from './providers/resend/provider.js'
import { sendgrid } from './providers/sendgrid/provider.js'
import { sentry } from './providers/sentry/provider.js'
import { shopify } from './providers/shopify/provider.js'
import { slack } from './providers/slack/provider.js'
import { stripe } from './providers/stripe/provider.js'
import { supabase } from './providers/supabase/provider.js'
import { telegram } from './providers/telegram/provider.js'
import { together } from './providers/together/provider.js'
import { turso } from './providers/turso/provider.js'
import { twilio } from './providers/twilio/provider.js'
import { uploadthing } from './providers/uploadthing/provider.js'
import { upstash } from './providers/upstash/provider.js'
import { vercel } from './providers/vercel/provider.js'
import { voyage } from './providers/voyage/provider.js'
import { workos } from './providers/workos/provider.js'
import { xai } from './providers/xai/provider.js'
import type { Category, Credential, Provider } from './schema.js'

/** Every provider in the registry. Adding one is a folder under `providers/` and a line here. */
export const providers: readonly Provider[] = [
  algolia,
  anthropic,
  auth0,
  aws,
  axiom,
  clerk,
  cloudflare,
  cloudinary,
  cohere,
  convex,
  datadog,
  deepseek,
  digitalocean,
  discord,
  docker,
  doppler,
  elevenlabs,
  fireworks,
  fly,
  gemini,
  github,
  gitlab,
  groq,
  huggingface,
  infisical,
  lemonsqueezy,
  linear,
  mailgun,
  mapbox,
  mistral,
  mongodb,
  neon,
  netlify,
  notion,
  npm,
  onepassword,
  openai,
  openrouter,
  paddle,
  perplexity,
  pinecone,
  planetscale,
  polar,
  posthog,
  postmark,
  railway,
  render,
  replicate,
  resend,
  sendgrid,
  sentry,
  shopify,
  slack,
  stripe,
  supabase,
  telegram,
  together,
  turso,
  twilio,
  uploadthing,
  upstash,
  vercel,
  voyage,
  workos,
  xai,
]

/** Each category's heading, in the order the docs list them. */
export const categoryLabels: Readonly<Record<Category, string>> = {
  ai: 'AI',
  payments: 'Payments',
  messaging: 'Email and messaging',
  data: 'Data and storage',
  auth: 'Auth',
  deploy: 'Cloud and dev tools',
  product: 'Observability and product',
  stores: 'Secret stores',
}

/** One provider's credential, which is what a field that names a provider is bound to. */
export type Source = { readonly provider: Provider; readonly credential: Credential }

/** Framework prefixes that expose a variable to the browser, dropped before names are matched. */
const PUBLIC_PREFIXES = ['NEXT_PUBLIC_', 'NUXT_PUBLIC_', 'EXPO_PUBLIC_', 'REACT_APP_', 'GATSBY_', 'VITE_', 'PUBLIC_']

/** A name without every framework prefix in front of it, so VITE_PUBLIC_POSTHOG_KEY reads as POSTHOG_KEY. */
const bareName = (name: string): string => {
  const prefix = PUBLIC_PREFIXES.find(candidate => name.startsWith(candidate))
  return prefix === undefined ? name : bareName(name.slice(prefix.length))
}

const allSources = providers.flatMap(provider =>
  provider.credentials.map((credential): Source => ({ provider, credential })),
)

/** A credential as the tool names it: `provider/credential`. */
export const referenceOf = ({ provider, credential }: Source) => `${provider.id}/${credential.id}`

/**
 * Every value the tool's `provider` field accepts: a provider that issues keys, and each key of
 * one that issues several, by reference. A provider with one key is named alone.
 */
export const providerRefs = [
  ...providers.filter(provider => provider.credentials.length > 0).map(provider => provider.id),
  ...allSources.filter(source => source.provider.credentials.length > 1).map(referenceOf),
]

export const sourceByReference = (reference: string) => allSources.find(source => referenceOf(source) === reference)

export const sourcesOfProvider = (id: string) => allSources.filter(source => source.provider.id === id)

/** Whether a variable name is one this credential conventionally goes by. */
export const goesBy = ({ source, name }: { source: Source; name: string }) =>
  source.credential.names.includes(bareName(name))

/** The credentials that conventionally go by this name. */
export const sourcesNamed = (name: string) => allSources.filter(source => goesBy({ source, name }))

/** Providers that can create a value of this format, with where to do it. */
export const offersFor = (format: string) =>
  providers.flatMap(provider =>
    provider.offers.filter(offer => offer.format === format).map(offer => ({ provider, url: offer.url })),
  )
