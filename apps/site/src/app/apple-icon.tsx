import { ImageResponse } from 'next/og'

import { SquareLogo } from '@/og/cards'

export const size = { width: 180, height: 180 }

export const contentType = 'image/png'

/** The icon a home screen shows, full bleed: the device rounds its corners. */
const AppleIcon = () => new ImageResponse(<SquareLogo size={180} />, size)

export default AppleIcon
