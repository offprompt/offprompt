import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { NAME } from './target.js'

type Json = Readonly<Record<string, unknown>>

export const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  )

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isUnknownArray = (value: unknown): value is readonly unknown[] => Array.isArray(value)

export const isMissing = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'

/** A file's text, or nothing when there is no file. */
export const readIfPresent = (path: string) =>
  readFile(path, 'utf8').catch((error: unknown) => {
    if (isMissing(error)) return undefined
    throw error
  })

/** A JSON config as it stands, so whatever else it declares is kept; empty when there is none. */
const readJson = async (path: string): Promise<Json> => {
  const text = await readIfPresent(path)
  if (text === undefined) return {}
  const parsed: unknown = JSON.parse(text)
  if (!isRecord(parsed)) throw new Error(`${path} does not hold a JSON object`)
  return parsed
}

export const writeText = async (path: string, text: string) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
}

const writeJson = (path: string, value: Json) => writeText(path, `${JSON.stringify(value, null, 2)}\n`)

/** Changes one JSON config, keeping the rest of it. */
export const updateJson = async (path: string, update: (config: Json) => Json) =>
  writeJson(path, update(await readJson(path)))

const serversOf = (config: Json) => (isRecord(config.mcpServers) ? config.mcpServers : {})

/** Has offprompt's server in a manifest start with another command, keeping all else it declares. */
export const startServerWith = (path: string, start: { readonly command: string; readonly args: readonly string[] }) =>
  updateJson(path, config => {
    const servers = serversOf(config)
    const server = servers[NAME]
    if (!isRecord(server)) throw new Error(`${path} declares no ${NAME} server`)
    return { ...config, mcpServers: { ...servers, [NAME]: { ...server, command: start.command, args: [...start.args] } } }
  })

/** Declares offprompt under `mcpServers`, beside whatever servers the file already has. */
export const declareServer = (path: string, server: Json) =>
  updateJson(path, config => ({ ...config, mcpServers: { ...serversOf(config), [NAME]: server } }))

/**
 * Takes offprompt out of `mcpServers` and says whether it was there. A file left declaring
 * nothing at all goes too.
 */
export const undeclareServer = async (path: string) => {
  const config = await readJson(path)
  const { [NAME]: removed, ...servers } = serversOf(config)
  if (removed === undefined) return false
  const { mcpServers: _, ...rest } = config
  const next = Object.keys(servers).length === 0 ? rest : { ...rest, mcpServers: servers }
  await (Object.keys(next).length === 0 ? rm(path, { force: true }) : writeJson(path, next))
  return true
}

/** Adds entries to a JSON array field, once each, after dropping those `replaces` matches. */
export const withEntries = (
  config: Json,
  field: string,
  entries: readonly string[],
  replaces: (entry: unknown) => boolean = () => false,
): Json => {
  const value = config[field]
  const current = (isUnknownArray(value) ? value : []).filter(entry => !replaces(entry))
  return { ...config, [field]: [...current, ...entries.filter(entry => !current.includes(entry))] }
}
