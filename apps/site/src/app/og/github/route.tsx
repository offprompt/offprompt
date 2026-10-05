import { ImageResponse } from 'next/og'

import { GitHubCard } from '@/og/cards'
import { cardFonts } from '@/og/fonts'

export const dynamic = 'force-static'

/** GitHub's social preview for the repository, 1280×640, uploaded by hand in its settings. */
export const GET = async () => new ImageResponse(<GitHubCard />, { width: 1280, height: 640, fonts: [...(await cardFonts())] })
