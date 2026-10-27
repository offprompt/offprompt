import './globals.css'

import type { Metadata, Viewport } from 'next'
import { Geist, JetBrains_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

import { Analytics } from '@/components/analytics'
import { DESCRIPTION, TITLE } from '@/lib/metadata'
import { SITE } from '@/lib/site'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' })

/** Each page names its own address and link preview, through pageMetadata; these are for the rest. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
}

export const viewport: Viewport = { themeColor: '#FBFBF9' }

const RootLayout = ({ children }: { readonly children: ReactNode }) => (
  <html lang="en" className={`${geist.variable} ${mono.variable}`}>
    <body className="font-sans">
      {children}
      <Analytics />
    </body>
  </html>
)

export default RootLayout
