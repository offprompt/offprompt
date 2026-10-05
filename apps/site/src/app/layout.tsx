import './globals.css'

import type { Metadata, Viewport } from 'next'
import { Geist, JetBrains_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

import { SITE } from '@/lib/site'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' })

const DESCRIPTION =
  'Agents need API keys. Paste one into the chat and it lives in the transcript for good. offprompt opens a page in your browser instead, and the value goes straight into the file.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'offprompt: keep secrets off the prompt',
  description: DESCRIPTION,
  openGraph: {
    title: 'Keep secrets off the prompt.',
    description: DESCRIPTION,
    url: '/',
    siteName: 'offprompt',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Keep secrets off the prompt.', description: DESCRIPTION },
}

export const viewport: Viewport = { themeColor: '#FBFBF9' }

const RootLayout = ({ children }: { readonly children: ReactNode }) => (
  <html lang="en" className={`${geist.variable} ${mono.variable}`}>
    <body className="font-sans">{children}</body>
  </html>
)

export default RootLayout
