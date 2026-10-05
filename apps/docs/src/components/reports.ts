import type { DemoReport } from 'offprompt/showcase'

/** A message from offprompt's page in a frame: how tall it is, that it was written, and the like. */
export const isReport = (value: unknown): value is DemoReport =>
  typeof value === 'object' && value !== null && 'offprompt' in value && typeof value.offprompt === 'string'
