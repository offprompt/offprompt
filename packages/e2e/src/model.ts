import { appendFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { text } from 'node:stream/consumers'

type Json = Readonly<Record<string, unknown>>

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)

const field = (value: unknown, key: string): unknown => (isObject(value) ? value[key] : undefined)

const stringOf = (value: unknown) => (typeof value === 'string' ? value : '')

/**
 * A tool the model calls, by the end of its name, since each host names MCP tools its own way.
 * Its arguments can come from what the earlier calls returned, as a request's id does.
 */
export type Call = {
  readonly tool: string
  readonly arguments: Json | ((results: readonly string[]) => Json)
}

/** A tool result's text, whether the host passed it as a string or as blocks of text. */
const resultText = (content: unknown): string => {
  if (typeof content === 'string') return content
  return isList(content) ? content.map(block => stringOf(field(block, 'text'))).join('\n') : ''
}

/** A tool a request offered, inside a namespace where the host groups its MCP tools under one. */
type Offered = { readonly name: string; readonly namespace?: string }

/** The tool's full name, its namespace in front where it has one. */
const fullName = ({ name, namespace }: Offered) => (namespace === undefined ? name : `${namespace}__${name}`)

/** What one request told the model: the tools it offered, and the tool calls and results so far. */
type Seen = {
  readonly tools: readonly Offered[]
  readonly made: number
  readonly results: readonly string[]
}

/** Anthropic Messages, as Claude Code sends it. */
const seenInMessages = (body: unknown): Seen => {
  const messages = field(body, 'messages')
  const blocks = (isList(messages) ? messages : []).flatMap(message => {
    const content = field(message, 'content')
    return isList(content) ? content : []
  })
  const tools = field(body, 'tools')
  return {
    tools: (isList(tools) ? tools : []).map(tool => ({ name: stringOf(field(tool, 'name')) })),
    made: blocks.filter(block => field(block, 'type') === 'tool_use').length,
    results: blocks.filter(block => field(block, 'type') === 'tool_result').map(block => resultText(field(block, 'content'))),
  }
}

/** The tools a Responses request offers, those inside a namespace, as Codex groups an MCP server's, among them. */
const offeredInResponses = (tools: unknown): readonly Offered[] =>
  (isList(tools) ? tools : []).flatMap((tool): Offered[] => {
    if (field(tool, 'type') !== 'namespace') return [{ name: stringOf(field(tool, 'name')) }]
    const namespace = stringOf(field(tool, 'name'))
    const inner = field(tool, 'tools')
    return (isList(inner) ? inner : []).map(each => ({ name: stringOf(field(each, 'name')), namespace }))
  })

/** OpenAI Responses, as Codex sends it. */
const seenInResponses = (body: unknown): Seen => {
  const input = field(body, 'input')
  const items = isList(input) ? input : []
  return {
    tools: offeredInResponses(field(body, 'tools')),
    made: items.filter(item => field(item, 'type') === 'function_call').length,
    results: items
      .filter(item => field(item, 'type') === 'function_call_output')
      .map(item => resultText(field(item, 'output'))),
  }
}

/** OpenAI Chat Completions, as Pi sends it. */
const seenInChat = (body: unknown): Seen => {
  const messages = field(body, 'messages')
  const list = isList(messages) ? messages : []
  const tools = field(body, 'tools')
  return {
    tools: (isList(tools) ? tools : []).map(tool => ({ name: stringOf(field(field(tool, 'function'), 'name')) })),
    made: list.flatMap(message => {
      const calls = field(message, 'tool_calls')
      return isList(calls) ? calls : []
    }).length,
    results: list.filter(message => field(message, 'role') === 'tool').map(message => resultText(field(message, 'content'))),
  }
}

/** What the model does next: call the next tool, or say what the last result asked it to say. */
type Next =
  | {
      readonly kind: 'call'
      /** Which call of the script this is: a host keeps calls apart by their ids. */
      readonly id: string
      readonly tool: Offered
      readonly arguments: Json
    }
  | { readonly kind: 'say'; readonly text: string }

/**
 * The scripted model: it calls each of the scenario's tools in turn, under the name the host
 * gave it, and once all have returned it says the line the last result asked it to say, as a
 * model following offprompt's instructions would. A request that offers none of the tools,
 * such as a host asking for a session title, gets a word back.
 */
const decide = ({ calls, seen }: { calls: readonly Call[]; seen: Seen }): Next => {
  const call = calls[seen.made]
  const tool = call === undefined ? undefined : seen.tools.find(offered => fullName(offered).endsWith(call.tool))
  if (call !== undefined && tool !== undefined) {
    const { arguments: given } = call
    return {
      kind: 'call',
      id: String(seen.made + 1),
      tool,
      arguments: typeof given === 'function' ? given(seen.results) : given,
    }
  }
  const last = seen.results.at(-1) ?? ''
  const told = /Fingerprint(?: [^\s"\\]+){4}/u.exec(last)?.[0]
  return { kind: 'say', text: told === undefined ? 'Done.' : `Done. ${told}` }
}

const sse = (events: readonly { readonly event?: string; readonly data: unknown }[]) =>
  events
    .map(({ event, data }) => `${event === undefined ? '' : `event: ${event}\n`}data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`)
    .join('')

const USAGE = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

/** An Anthropic Messages reply, streamed or whole. */
const messagesReply = ({ next, stream }: { next: Next; stream: boolean }) => {
  const block =
    next.kind === 'call'
      ? { type: 'tool_use', id: `toolu_mock_${next.id}`, name: fullName(next.tool), input: next.arguments }
      : { type: 'text', text: next.text }
  const stopReason = next.kind === 'call' ? 'tool_use' : 'end_turn'
  const message = { id: 'msg_mock', type: 'message', role: 'assistant', model: 'mock', stop_sequence: null, usage: USAGE }
  if (!stream) return { type: 'application/json', body: JSON.stringify({ ...message, content: [block], stop_reason: stopReason }) }
  const start = next.kind === 'call' ? { ...block, input: {} } : { type: 'text', text: '' }
  const delta =
    next.kind === 'call'
      ? { type: 'input_json_delta', partial_json: JSON.stringify(next.arguments) }
      : { type: 'text_delta', text: next.text }
  return {
    type: 'text/event-stream',
    body: sse([
      { event: 'message_start', data: { type: 'message_start', message: { ...message, content: [], stop_reason: null } } },
      { event: 'content_block_start', data: { type: 'content_block_start', index: 0, content_block: start } },
      { event: 'content_block_delta', data: { type: 'content_block_delta', index: 0, delta } },
      { event: 'content_block_stop', data: { type: 'content_block_stop', index: 0 } },
      {
        event: 'message_delta',
        data: { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 1 } },
      },
      { event: 'message_stop', data: { type: 'message_stop' } },
    ]),
  }
}

/** An OpenAI Responses stream. */
const responsesReply = ({ next }: { next: Next }) => {
  const item =
    next.kind === 'call'
      ? {
          type: 'function_call',
          id: `fc_mock_${next.id}`,
          call_id: `call_mock_${next.id}`,
          name: next.tool.name,
          ...(next.tool.namespace === undefined ? {} : { namespace: next.tool.namespace }),
          arguments: JSON.stringify(next.arguments),
          status: 'completed',
        }
      : { type: 'message', id: 'msg_mock', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: next.text, annotations: [] }] }
  const usage = { input_tokens: 1, input_tokens_details: null, output_tokens: 1, output_tokens_details: null, total_tokens: 2 }
  const response = { id: 'resp_mock', object: 'response', model: 'mock', status: 'completed', output: [item], usage }
  return {
    type: 'text/event-stream',
    body: sse([
      { event: 'response.created', data: { type: 'response.created', response: { ...response, status: 'in_progress', output: [] } } },
      { event: 'response.output_item.done', data: { type: 'response.output_item.done', output_index: 0, item } },
      { event: 'response.completed', data: { type: 'response.completed', response } },
    ]),
  }
}

/** An OpenAI Chat Completions stream. */
const chatReply = ({ next }: { next: Next }) => {
  const chunk = (delta: Json, finish: string | null) => ({
    id: 'chatcmpl-mock',
    object: 'chat.completion.chunk',
    created: 0,
    model: 'mock',
    choices: [{ index: 0, delta, finish_reason: finish }],
  })
  const delta =
    next.kind === 'call'
      ? {
          role: 'assistant',
          tool_calls: [
            {
              index: 0,
              id: `call_mock_${next.id}`,
              type: 'function',
              function: { name: fullName(next.tool), arguments: JSON.stringify(next.arguments) },
            },
          ],
        }
      : { role: 'assistant', content: next.text }
  return {
    type: 'text/event-stream',
    body: sse([
      { data: chunk(delta, null) },
      { data: { ...chunk({}, next.kind === 'call' ? 'tool_calls' : 'stop'), usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } } },
      { data: '[DONE]' },
    ]),
  }
}

/** One request the model took, kept for reading: where it came, what it offered, and what the host passed back. */
export type Taken = { readonly path: string; readonly tools: readonly string[]; readonly results: readonly string[]; readonly next?: Next }

/**
 * A model on the loopback that a host is pointed at instead of its provider's, which needs no
 * account: it speaks Anthropic Messages, OpenAI Responses and OpenAI Chat Completions, and
 * plays the scenario's calls. Every request is written to `log`.
 */
export const startModel = async ({ calls, log }: { calls: readonly Call[]; log: string }) => {
  const taken: Taken[] = []

  const answer = async (request: IncomingMessage, response: ServerResponse) => {
    const path = new URL(request.url ?? '/', 'http://model').pathname
    const raw = await text(request)
    const body: unknown = raw === '' ? undefined : JSON.parse(raw)
    const send = ({ type, body: payload, status = 200 }: { type: string; body: string; status?: number }) => {
      response.writeHead(status, { 'content-type': type })
      response.end(payload)
    }
    const handle = (seen: Seen, reply: (next: Next) => { type: string; body: string }) => {
      const next = decide({ calls, seen })
      const entry: Taken = { path, tools: seen.tools.map(fullName), results: seen.results, next }
      taken.push(entry)
      void appendFile(log, `${JSON.stringify(entry)}\n`)
      send(reply(next))
    }
    if (path.endsWith('/messages/count_tokens')) return send({ type: 'application/json', body: '{"input_tokens":1}' })
    if (path.endsWith('/messages')) return handle(seenInMessages(body), next => messagesReply({ next, stream: field(body, 'stream') === true }))
    if (path.endsWith('/responses')) return handle(seenInResponses(body), next => responsesReply({ next }))
    if (path.endsWith('/chat/completions')) return handle(seenInChat(body), next => chatReply({ next }))
    void appendFile(log, `${JSON.stringify({ path, unanswered: true })}\n`)
    return send({ type: 'application/json', body: '{"error":{"type":"not_found","message":"the mock model has no such endpoint"}}', status: 404 })
  }

  const server = createServer((request, response) => {
    answer(request, response).catch((error: unknown) => {
      response.writeHead(500, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: { message: String(error) } }))
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('the mock model did not bind to a port')
  return {
    url: `http://127.0.0.1:${String(address.port)}`,
    taken: () => [...taken],
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  }
}

export type Model = Awaited<ReturnType<typeof startModel>>
