import { samplePage } from 'offprompt/showcase'

import { isSampleName, SAMPLES } from '@/lib/samples'

export const dynamic = 'force-static'

export const dynamicParams = false

export const generateStaticParams = () => Object.keys(SAMPLES).map(name => ({ name }))

/** offprompt's page for one sample, which the landing page shows in a sandboxed frame. */
export const GET = async (_request: Request, { params }: { params: Promise<{ name: string }> }) => {
  const { name } = await params
  if (!isSampleName(name)) return new Response('Not found', { status: 404 })
  return new Response(samplePage(SAMPLES[name]), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' },
  })
}
