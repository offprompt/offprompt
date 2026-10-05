import type { Target } from './target.js'
import { claudeCode } from './targets/claude-code.js'
import { codex } from './targets/codex.js'
import { cursor } from './targets/cursor.js'
import { configTargets } from './targets/mcp-config.js'
import { pi } from './targets/pi.js'

/** Every agent offprompt can reach, those it knows best first. */
export const TARGETS: readonly Target[] = [claudeCode, codex, cursor, pi, ...configTargets]
