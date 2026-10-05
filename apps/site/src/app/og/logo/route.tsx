import { ImageResponse } from 'next/og'

import { SquareLogo } from '@/og/cards'

export const dynamic = 'force-static'

/** The square logo directories list offprompt with, 512×512 and full bleed. */
export const GET = () => new ImageResponse(<SquareLogo size={512} />, { width: 512, height: 512 })
