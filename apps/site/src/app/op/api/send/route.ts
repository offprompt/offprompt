import { createUmamiProxy } from '@/lib/umami-proxy'

/** Where the Umami tracker posts its events, to be relayed to Umami Cloud. */
export const POST = createUmamiProxy()
