import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

/**
 * The notices that travel with offprompt: beside the server in a project, in the plugin and in
 * the npm package. Its sections written by hand cover what the page carries besides code; each
 * build writes the code its bundle carries between markers of its own.
 */
const NOTICES = resolve(import.meta.dirname, '../THIRD_PARTY_NOTICES.md')

/**
 * Licences, by SPDX id, that let offprompt pass code on inside its bundles as long as their
 * text goes with it. A bundled package under any other fails the build, since every copy of
 * the bundle would carry its terms.
 */
const PERMISSIVE = new Set([
  '0BSD',
  'Apache-2.0',
  'BlueOak-1.0.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BSL-1.0',
  'CC-BY-4.0',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  'Python-2.0',
  'Unlicense',
  'Zlib',
])

/** The files a package keeps its licence in, and the notice the Apache licence asks to pass on. */
const LICENCE_FILE = /^(licen[cs]e|copying|notice)([-._].*)?$/i

/** The folder of the npm package an esbuild input came from, or nothing for offprompt's own source. */
const packageFolder = input => /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(input)?.[1]

/** A package.json's licence as an SPDX expression, from the field as it is now or as it once was. */
const licenceOf = ({ license, licenses }) => {
  if (typeof license === 'string') return license
  if (typeof license?.type === 'string') return license.type
  return Array.isArray(licenses) ? licenses.map(({ type }) => type).join(' OR ') : undefined
}

/** Whether an SPDX id is on the permissive list; a trailing `+`, for "or later", changes nothing. */
const permissiveId = id => PERMISSIVE.has(id.replace(/\+$/, ''))

/**
 * Whether an SPDX expression lets offprompt take the code under permissive terms: one of its
 * OR choices has every licence it joins with AND on the list. An exception added with WITH only
 * grants more. In the rare expression that nests parentheses, every licence it names has to be
 * on the list.
 */
const permissive = expression => {
  const bare = expression.replace(/\s+WITH\s+[^\s()]+/g, '').replace(/^\((.*)\)$/, '$1').trim()
  return bare.includes('(')
    ? (bare.match(/[^\s()]+/g) ?? []).filter(word => word !== 'AND' && word !== 'OR').every(permissiveId)
    : bare.split(/\s+OR\s+/).some(choice => choice.split(/\s+AND\s+/).every(permissiveId))
}

/** What a bundled package says of itself, and its licence files as text with Unix line endings. */
const describe = async folder => {
  const manifest = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'))
  const entries = await readdir(folder, { withFileTypes: true })
  const files = entries.filter(entry => entry.isFile() && LICENCE_FILE.test(entry.name)).map(({ name }) => name)
  const texts = await Promise.all(
    files.toSorted().map(async file => (await readFile(join(folder, file), 'utf8')).replace(/\r\n?/g, '\n').trim()),
  )
  const author = typeof manifest.author === 'string' ? manifest.author : manifest.author?.name
  return { name: manifest.name, version: manifest.version, licence: licenceOf(manifest), author, texts }
}

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

/** A fenced block holding text, its fence longer than any run of backticks inside it. */
const fenced = text => {
  const fence = '`'.repeat(Math.max(2, ...(text.match(/`+/g) ?? []).map(run => run.length)) + 1)
  return `${fence}\n${text}\n${fence}`
}

/**
 * One package's notice: its name, version and licence, then each of its licence files in full.
 * A package that ships none gets the licence and its author's copyright line from package.json.
 */
const notice = ({ name, version, licence, author, texts }) =>
  [
    `### ${name} ${version}`,
    `Licence: ${licence}`,
    ...(texts.length > 0
      ? texts.map(fenced)
      : [
          'The package ships no licence file, so this is what its `package.json` says.',
          fenced([...(author === undefined ? [] : [`Copyright (c) ${author}`]), `SPDX-License-Identifier: ${licence}`].join('\n\n')),
        ]),
  ].join('\n\n')

/**
 * Writes the licences of the npm packages esbuild put into `artifact`, read off the metafiles
 * of the builds that went into it, between that artifact's markers in THIRD_PARTY_NOTICES.md,
 * and leaves the rest of the file as it is. Fails, naming the package, when a licence is not on
 * the permissive list, and says which packages ship no licence file.
 */
export const writeNotices = async (artifact, metafiles, workingDir) => {
  const folders = new Set(
    metafiles
      .flatMap(({ inputs }) => Object.keys(inputs).map(packageFolder))
      .filter(folder => folder !== undefined)
      .map(folder => resolve(workingDir, folder)),
  )
  const described = await Promise.all([...folders].map(describe))
  const packages = [...new Map(described.map(found => [`${found.name}@${found.version}`, found])).values()].toSorted(
    (a, b) => compare(a.name, b.name) || compare(a.version, b.version),
  )

  const refused = packages.filter(({ licence }) => licence === undefined || !permissive(licence))
  if (refused.length > 0) {
    const named = refused.map(({ name, version, licence }) => `${name} ${version} (${licence ?? 'no licence given'})`)
    throw new Error(`${artifact} bundles code under a licence that is not on the permissive list in scripts/notices.mjs: ${named.join(', ')}`)
  }
  packages
    .filter(({ texts }) => texts.length === 0)
    .forEach(({ name, version }) => console.warn(`${artifact}: ${name} ${version} ships no licence file; its notice gives the licence and author from its package.json`))

  const begin = `<!-- BEGIN bundled code in ${artifact}: the build writes what lies between these markers. -->`
  const end = `<!-- END bundled code in ${artifact} -->`
  const sections = [
    `## Bundled code in ${artifact}`,
    `\`${artifact}\` carries the code of these npm packages inside it.\nEach is under the licence named with it, whose text follows.`,
    ...packages.map(notice),
  ]
  const region = packages.length === 0 ? '\n' : `\n\n${sections.join('\n\n')}\n\n`

  const text = await readFile(NOTICES, 'utf8')
  const start = text.indexOf(begin)
  const stop = text.indexOf(end, start)
  if (start === -1 || stop === -1) throw new Error(`THIRD_PARTY_NOTICES.md has no markers for ${artifact}; add these two lines to it:\n${begin}\n${end}`)
  const written = `${text.slice(0, start + begin.length)}${region}${text.slice(stop)}`
  if (written !== text) await writeFile(NOTICES, written)
}
