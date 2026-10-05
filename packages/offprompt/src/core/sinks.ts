import { constants } from 'node:fs'
import { access, mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, relative, sep } from 'node:path'

import { writeFileAtomic } from './atomic.js'
import { dotenvHasKey, parseDotenv, upsertDotenv } from './dotenv.js'
import { gitStatusOf } from './git.js'
import { resolveInsideRoot } from './paths.js'
import { fail, ok, type Result } from './result.js'

export type SinkKind = 'dotenv' | 'file'

export type SinkSpec = { readonly kind: SinkKind; readonly path: string }

/** A sink fixed at request time: the path is already resolved and vetted. */
export type ResolvedSink = {
  readonly kind: SinkKind
  readonly absolutePath: string
  /** Inside the project, with forward slashes on every platform, as the agent and the page say it. */
  readonly relativePath: string
  readonly tracked: boolean
  readonly ignored: boolean
  /** Whether the file was already there when the request was made. */
  readonly exists: boolean
}

/** One name and the value typed for it. */
export type NamedValue = { readonly name: string; readonly value: string }

const DIRECTORY_MODE = 0o700

/** The file's contents for what the page shows about it: anything unreadable reads as absent. */
const readIfPresent = async (path: string) => readFile(path, 'utf8').catch(() => undefined)

const codeOf = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined

/**
 * The file's contents for a write, where only a missing file is empty. A file that exists
 * but cannot be read must stop the write: taking it for empty would replace every other key
 * in it with the few being written.
 */
const readForWrite = async (path: string) =>
  readFile(path, 'utf8').catch((error: unknown) => {
    if (codeOf(error) === 'ENOENT') return undefined
    throw error
  })

const fileExists = async (path: string) =>
  stat(path)
    .then(() => true)
    .catch(() => false)

/** Whether the sink already holds `name`, so the form can say "overwrite" beside it. */
export const sinkHolds = async ({ sink, name }: { sink: ResolvedSink; name: string }) => {
  if (sink.kind === 'file') return fileExists(sink.absolutePath)
  const contents = await readIfPresent(sink.absolutePath)
  return contents !== undefined && dotenvHasKey(contents, name)
}

/**
 * The names of every key the sink holds, so the agent has no reason to open the file to
 * see what is in it. Nothing about the values leaves here. A `file` sink is one value
 * with no name, so it has none.
 */
export const sinkKeyNames = async (sink: ResolvedSink): Promise<readonly string[]> => {
  if (sink.kind === 'file') return []
  const contents = await readIfPresent(sink.absolutePath)
  return contents === undefined ? [] : [...new Set(parseDotenv(contents).map(entry => entry.key))]
}

/**
 * Resolves a sink against the project directory. Everything the form later
 * shows — absolute path, gitignored check — comes from this record.
 */
export const resolveSink = async ({
  root,
  spec,
}: {
  root: string
  spec: SinkSpec
}): Promise<Result<ResolvedSink>> => {
  const resolved = await resolveInsideRoot(root, spec.path)
  if (!resolved.ok) return resolved
  const { absolute } = resolved.value

  const existing = await stat(absolute).catch(() => undefined)
  if (existing?.isDirectory() === true) return fail('the sink path is a directory')

  const { tracked, ignored } = await gitStatusOf({ cwd: root, absolutePath: absolute })

  return ok({
    kind: spec.kind,
    absolutePath: absolute,
    relativePath: relative(resolved.value.root, absolute).split(sep).join('/'),
    tracked,
    ignored,
    exists: existing !== undefined,
  })
}

const upsertAll = ({ contents, values }: { contents: string; values: readonly NamedValue[] }) =>
  values.reduce<Result<string>>(
    (carried, { name, value }) => {
      if (!carried.ok) return carried
      const upserted = upsertDotenv({ contents: carried.value, name, value })
      return upserted.ok ? ok(upserted.value.contents) : upserted
    },
    ok(contents),
  )

/**
 * Everything that can refuse a write before anything is claimed, so the form can offer
 * another attempt rather than reporting a failure after the record has closed.
 */
export const refusalFor = ({
  sink,
  values,
  allowTracked,
}: {
  sink: ResolvedSink
  values: readonly NamedValue[]
  allowTracked: boolean
}) => {
  if (sink.tracked && !allowTracked) {
    return 'that file is tracked by git, so the values would be committed'
  }
  if (sink.kind === 'file') return undefined
  const rendered = upsertAll({ contents: '', values })
  return rendered.ok ? undefined : rendered.message
}

const contentsFor = async ({
  sink,
  values,
}: {
  sink: ResolvedSink
  values: readonly NamedValue[]
}): Promise<Result<string>> => {
  const [only] = values
  if (sink.kind === 'file') {
    if (only === undefined || values.length !== 1) return fail('a file sink holds exactly one value')
    return ok(only.value)
  }
  const existing = await readForWrite(sink.absolutePath)
  return upsertAll({ contents: existing ?? '', values })
}

/** The deepest folder on the way to a path that exists, which is where a new file would be made. */
const existingFolder = async (path: string): Promise<string> => {
  const parent = dirname(path)
  if (parent === path) return path
  return (await fileExists(parent)) ? parent : existingFolder(parent)
}

const allowed = (path: string, mode: number) =>
  access(path, mode).then(
    () => true,
    () => false,
  )

/**
 * Whether a write can go through. A write makes a temporary file in the folder and renames
 * it over the file, so the folder must take new files; a dotenv file must also be readable,
 * since every other key in it is kept.
 */
export const sinkWritable = async (sink: ResolvedSink) => {
  const folderOpen = await allowed(await existingFolder(sink.absolutePath), constants.W_OK | constants.X_OK)
  if (!folderOpen) return false
  if (sink.kind === 'file' || !(await fileExists(sink.absolutePath))) return true
  return allowed(sink.absolutePath, constants.R_OK)
}

/**
 * What the sink holds for each name, read back after a write so its fingerprint is taken
 * from the file rather than from what was meant to go in it. A `file` sink is its one value.
 */
export const sinkValues = async ({ sink, names }: { sink: ResolvedSink; names: readonly string[] }) => {
  const contents = await readForWrite(sink.absolutePath)
  if (contents === undefined) return new Map<string, string>()
  if (sink.kind === 'file') return new Map(names.map(name => [name, contents]))
  const entries = parseDotenv(contents)
  return new Map(
    names.flatMap(name => {
      const entry = entries.findLast(candidate => candidate.key === name)
      return entry === undefined ? [] : [[name, entry.value] as const]
    }),
  )
}

const TEMPORARY = /\.offprompt-[0-9a-f]+\.tmp$/

const pathOf = (error: unknown) =>
  typeof error === 'object' && error !== null && 'path' in error && typeof error.path === 'string' ? error.path : ''

const syscallOf = (error: unknown) =>
  typeof error === 'object' && error !== null && 'syscall' in error && typeof error.syscall === 'string'
    ? error.syscall
    : ''

/**
 * A write's error as the human reads it. The file system names the temporary file a write
 * goes through, which means nothing to them: that failure is the folder refusing a new file,
 * and a failed rename is the file that could not be replaced.
 */
const failureOf = ({ error, sink }: { error: unknown; sink: ResolvedSink }) => {
  const code = codeOf(error) ?? 'Error'
  if (syscallOf(error) === 'rename') return `${code}: could not replace ${sink.absolutePath}`
  if (TEMPORARY.test(pathOf(error))) {
    return `${code}: could not create a file in ${dirname(sink.absolutePath)}`
  }
  return error instanceof Error ? error.message : String(error)
}

/**
 * Writes every value through the sink in one atomic pass, so a dotenv file never lands
 * holding some of a batch. A git-tracked target is refused unless the human ticked the
 * override on the form. A file system that refuses the write is reported, not thrown.
 */
export const writeToSink = async ({
  sink,
  values,
  allowTracked,
}: {
  sink: ResolvedSink
  values: readonly NamedValue[]
  allowTracked: boolean
}): Promise<Result<ResolvedSink>> => {
  const refusal = refusalFor({ sink, values, allowTracked })
  if (refusal !== undefined) return fail(refusal)

  try {
    const contents = await contentsFor({ sink, values })
    if (!contents.ok) return contents
    await mkdir(dirname(sink.absolutePath), { recursive: true, mode: DIRECTORY_MODE })
    await writeFileAtomic(sink.absolutePath, contents.value)
    return ok(sink)
  } catch (error) {
    return fail(failureOf({ error, sink }))
  }
}
