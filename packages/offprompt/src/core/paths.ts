import { realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

import { fail, ok, type Result } from './result.js'

/** An absolute path together with the real root it was vetted against. */
export type ResolvedPath = { readonly root: string; readonly absolute: string }

/** Deepest ancestor of `target` that exists on disk, with symlinks resolved. */
const realAncestor = async (target: string): Promise<string> => {
  const parent = dirname(target)
  const resolved = await realpath(target).catch(() => undefined)
  if (resolved !== undefined) return resolved
  if (parent === target) return target
  return realAncestor(parent)
}

const escapes = (root: string, target: string) => {
  const rel = relative(root, target)
  return rel.startsWith('..') || isAbsolute(rel)
}

/**
 * Resolves a sink path against `root` and refuses anything that lands outside it,
 * including paths that only escape once symlinks are followed.
 */
export const resolveInsideRoot = async (root: string, candidate: string): Promise<Result<ResolvedPath>> => {
  if (candidate.trim() === '') return fail('the sink path is empty')
  if (candidate.includes('\0')) return fail('the sink path contains a null byte')
  const realRoot = await realpath(root).catch(() => resolve(root))
  const absolute = resolve(realRoot, candidate)
  if (relative(realRoot, absolute) === '') return fail('the sink path is the project directory itself')
  if (escapes(realRoot, absolute)) return fail('the sink path is outside the project')
  const ancestor = await realAncestor(absolute)
  if (relative(realRoot, ancestor) !== '' && escapes(realRoot, ancestor)) {
    return fail('the sink path resolves outside the project through a symlink')
  }
  return ok({ root: realRoot, absolute })
}
