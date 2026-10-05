import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Geist and JetBrains Mono for the social cards, from Fontsource 5.3.0's static Latin files:
 * the renderer behind ImageResponse reads WOFF but neither WOFF2 nor a variable font, which is
 * all next/font and the docs carry. It also measures a word letter by letter and draws it
 * whole, so a pair the font kerns or joins left a gap after words such as "offprompt"; the
 * files keep only the features that place accents, made with fontTools:
 *
 *   pyftsubset <file> --unicodes='*' --layout-features='ccmp,locl,mark,mkmk' --flavor=woff
 *
 * Each path is spelled out so the build traces the file.
 */
export const cardFonts = async () => {
  const [geist, geistMedium, mono, monoMedium, monoSemibold] = await Promise.all([
    readFile(join(process.cwd(), 'src/og/fonts/geist-400.woff')),
    readFile(join(process.cwd(), 'src/og/fonts/geist-500.woff')),
    readFile(join(process.cwd(), 'src/og/fonts/jetbrains-mono-400.woff')),
    readFile(join(process.cwd(), 'src/og/fonts/jetbrains-mono-500.woff')),
    readFile(join(process.cwd(), 'src/og/fonts/jetbrains-mono-600.woff')),
  ])
  return [
    { name: 'Geist', data: geist, weight: 400, style: 'normal' },
    { name: 'Geist', data: geistMedium, weight: 500, style: 'normal' },
    { name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' },
    { name: 'JetBrains Mono', data: monoMedium, weight: 500, style: 'normal' },
    { name: 'JetBrains Mono', data: monoSemibold, weight: 600, style: 'normal' },
  ] as const
}
