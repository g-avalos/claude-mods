import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const BAND = {
  plugin: 'token-weather',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 160 },
}
const FILE = '/home/me/.claude/projects/-work/abc.jsonl'

// One transcript line of a main-thread response with `thinking` thinking tokens.
function response(id: string, ts: string, thinking: number) {
  return JSON.stringify({
    type: 'assistant',
    isSidechain: false,
    timestamp: ts,
    message: {
      id,
      role: 'assistant',
      usage: {
        input_tokens: 5,
        output_tokens: 300,
        output_tokens_details: { thinking_tokens: thinking },
        cache_read_input_tokens: 9000,
        cache_creation_input_tokens: 100,
      },
    },
  })
}

type World = { usd: number | undefined; transcript: string; stepMs: number; output: number }

// Stands for the engine: a cost ledger, a transcript, and model requests that take `stepMs`.
async function start($: Engine, on: On, world: World) {
  const clock = mock.clock(on, { now: 1_000_000 })
  mock.env(on, { HOME: '/home/me' })
  on('session.start', (_$, e) => ({ sessionId: 's', cwd: e.cwd }) as any)
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      rateLimits: [],
      context: { tokens: 20_000, window: 200_000, percent: 10 },
      ...(world.usd === undefined ? {} : { cost: { usd: world.usd } }),
    },
  }) as any)
  on('turn.step', async function* (_$, e) {
    await clock.advance(world.stepMs)
    const usage = { input_tokens: 5, output_tokens: world.output, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'm' }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage } as any
  })
  on('turn.complete', () => ({ text: '' }) as any)
  on('fs.stat', (_$, e) => {
    if (e.path !== FILE) return { deny: 'no such file' } as any
    return { value: { kind: 'file', size: world.transcript.length, mtimeMs: 0, isLink: false } } as any
  })
  on('fs.read', () => ({ value: world.transcript }) as any)
  on('session.root', () => ({ value: '/work' }) as any)
  on('session.id', () => ({ value: 'abc' }) as any)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return Text({ children: 'engine band' }) as any
  })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
}

// One turn of `steps` model requests that ran `durationMs` in all.
async function turn($: Engine, steps: number, durationMs: number) {
  for (let index = 0; index < steps; index++) {
    const stream = $.turn.step({ turnId: 't1', index, model: 'm', messageCount: 1 })
    for await (const _ of stream) {
      // drain
    }
    await stream.result
  }
  await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs, isAborted: false, turnId: 't1' } as any)
}

describe('token-weather cost row', () => {
  test('the first row is labelled Context, without "of context"', async ($, on) => {
    await start($, on, { usd: 0, transcript: '', stepMs: 1000, output: 10 })
    const ui = await $.ui.mount({ surface: 'terminal', ...BAND } as any)
    expect(await ui.find({ type: 'Text', text: /Context/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /of context/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /Clear/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /^ 10%$/ })).toBeDefined()
    await ui.unmount()
  })

  test('a second row shows the session cost, the turn cost, its length, t/s and thinking', async ($, on) => {
    const world: World = { usd: 1.5, transcript: '', stepMs: 2000, output: 100 }
    await start($, on, world)
    const ui = await $.ui.mount({ surface: 'terminal', ...BAND } as any)
    expect(await ui.find({ type: 'Text', text: /\$1\.50/ })).toBeDefined() // the cost so far, before any turn

    world.usd = 1.75
    world.transcript = [response('a', '2026-11-12T10:00:00Z', 200), response('b', '2026-11-12T10:00:05Z', 1000)].join('\n')
    await turn($, 2, 12_600) // two requests of 2 s, 100 output tokens each: 50 t/s
    expect(await ui.find({ type: 'Text', text: /Cost/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\$1\.75/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /turn \$0\.25/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /12\.6s/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /50 t\/s/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1\.2k thinking/ })).toBeDefined()

    // the next turn counts only its own responses
    world.usd = 1.8
    world.transcript += '\n' + response('c', '2026-11-12T10:01:00Z', 40)
    world.output = 300
    await turn($, 1, 3_000)
    expect(await ui.find({ type: 'Text', text: /turn \$0\.05/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /150 t\/s/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /40 thinking/ })).toBeDefined()
    await ui.unmount()
  })

  test('no cost row where the host keeps no cost ledger and no turn ran', async ($, on) => {
    await start($, on, { usd: undefined, transcript: '', stepMs: 1000, output: 10 })
    const ui = await $.ui.mount({ surface: 'terminal', ...BAND } as any)
    expect(await ui.find({ type: 'Text', text: /Cost/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /Context/ })).toBeDefined()
    await ui.unmount()
  })
})
