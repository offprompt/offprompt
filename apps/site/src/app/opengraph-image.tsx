import { ImageResponse } from 'next/og'

import { SiteCard } from '@/og/cards'
import { cardFonts } from '@/og/fonts'

export const alt = 'offprompt: keep secrets off the prompt. Your agent asks, a page opens on your machine, and the value goes straight into the file.'

export const size = { width: 1200, height: 630 }

export const contentType = 'image/png'

/** The card a link to offprompt.dev unfurls into, made when the site is built. */
const OpenGraphImage = async () => new ImageResponse(<SiteCard />, { ...size, fonts: [...(await cardFonts())] })

export default OpenGraphImage
