import { readIfPresent } from './process.js'

type Json = Readonly<Record<string, unknown>>

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)

export const field = (value: unknown, key: string): unknown => (isObject(value) ? value[key] : undefined)

const stringOf = (value: unknown) => (typeof value === 'string' ? value : undefined)

const parsed = (line: string): unknown => {
  try {
    return JSON.parse(line)
  } catch {
    return undefined
  }
}

/** A tool's result as offprompt shapes it: the JSON in its last text block, after any line for the person. */
const payloadOf = (result: unknown) => {
  const content = field(result, 'content')
  const block: unknown = (isList(content) ? content : []).at(-1)
  const text = stringOf(field(block, 'text'))
  return text === undefined ? undefined : parsed(text)
}

/** One launch of offprompt: which client started it, the calls it made and what came back. */
const sessionOf = (entries: readonly unknown[]) => {
  const joined = (direction: string) =>
    entries
      .filter(entry => field(entry, 'direction') === direction)
      .map(entry => stringOf(field(entry, 'data')) ?? '')
      .join('')
  const messages = (direction: string) =>
    joined(direction)
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(parsed)
  const received = messages('in')
  const sent = messages('out')
  const initialize = received.find(message => field(message, 'method') === 'initialize')
  const client = field(field(initialize, 'params'), 'clientInfo')
  const clientName = stringOf(field(client, 'name'))
  const results = received
    .filter(message => field(message, 'method') === 'tools/call')
    .map(message => {
      const id = field(message, 'id')
      // A reply, not one of offprompt's own requests to the client, which number themselves
      // and can share an id with the call, as an elicitation/create does.
      const result = field(
        sent.find(reply => field(reply, 'id') === id && field(reply, 'method') === undefined),
        'result',
      )
      return {
        client: clientName,
        name: stringOf(field(field(message, 'params'), 'name')),
        // Names, reason and destination: the arguments carry no value.
        arguments: field(field(message, 'params'), 'arguments'),
        meta: field(field(message, 'params'), '_meta'),
        isError: field(result, 'isError') === true,
        payload: payloadOf(result),
      }
    })
  const start = entries.find(entry => field(entry, 'direction') === 'start')
  return {
    cwd: stringOf(field(start, 'cwd')),
    /** The bundle the agent started, by its path: the project's, or a plugin's copy where the agent keeps it. */
    server: stringOf(field(start, 'server')),
    client,
    clientName,
    capabilities: field(field(initialize, 'params'), 'capabilities'),
    results,
    elicited: sent.some(message => field(message, 'method') === 'elicitation/create'),
    askedRoots: sent.some(message => field(message, 'method') === 'roots/list'),
    sentText: joined('out'),
  }
}

/**
 * What passed between the agents and offprompt, one session per launch: where offprompt was
 * started, how each client introduced itself, the tool calls and their results, and whether
 * the page was offered through the agent's own dialog.
 */
export const readTraffic = async (path: string) => {
  const entries = (await readIfPresent(path))
    .split('\n')
    .filter(line => line !== '')
    .map(parsed)
  const pids = [...new Set(entries.map(entry => field(entry, 'pid')))]
  const sessions = pids.map(pid => sessionOf(entries.filter(entry => field(entry, 'pid') === pid)))
  const [first] = sessions

  return {
    sessions,
    /** The name every client gave, one per launch. */
    clients: sessions.map(session => session.clientName ?? 'unknown'),
    cwd: first?.cwd,
    server: first?.server,
    client: first?.client,
    capabilities: first?.capabilities,
    results: sessions.flatMap(session => session.results),
    elicited: sessions.some(session => session.elicited),
    askedRoots: sessions.some(session => session.askedRoots),
    /** Everything offprompt sent any client, for looking for a value that must not be there. */
    sentText: sessions.map(session => session.sentText).join(''),
  }
}

export type Traffic = Awaited<ReturnType<typeof readTraffic>>
