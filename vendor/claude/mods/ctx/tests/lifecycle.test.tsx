import { expect, test } from 'claude-code/testing'

const start = { cwd: '/work/linked-tree', surface: 'terminal', isInteractive: true } as const
const view = {
  plugin: 'ctx', component: 'AbovePrompt', surface: 'terminal',
  props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 120 },
} as const
const turn = { turnId: 't', answer: '', durationMs: 0, isAborted: false, usage: null }

test('refreshes usage, branch and model, including unknown usage after compaction', async ($, on) => {
  let model = 'Opus'
  let branch = 'main'
  let context: { window: number; tokens?: number; percent?: number } = { window: 200_000, tokens: 50_000, percent: 25 }
  let cost = 1
  on('session.start', () => ({ cwd: start.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('classic.SessionStart', () => ({}))
  on('classic.PostModelSwitch', () => ({}))
  on('session.model', () => ({ value: model }))
  on('session.repo', () => ({ value: { root: '/work/main-tree', remote: null, internal: false, name: null } }))
  on('session.cwd', () => ({ value: start.cwd }))
  on('process.run', ($, e) => {
    expect(e.init?.cwd).toBe(start.cwd)
    expect(e.argv).toEqual(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
    return { value: { stdout: branch + '\n', stderr: '', exitCode: 0 } }
  })
  on('session.usage', () => ({ value: { context, cost: { usd: cost }, rateLimits: [] } }))

  await $.session.start(start)
  const ui = await $.ui.mount(view as never)
  expect(await ui.find({ type: 'Text', text: '⎇ main' })).toBeDefined()
  context = { window: 200_000, tokens: 160_000, percent: 80 }
  cost = 2.345
  await $.session.measure({ context, cost: { usd: cost }, rateLimits: [], changed: ['context', 'cost'] })
  expect(await ui.find({ type: 'Text', text: /^ \(80%\)$/ })).toMatchObject({ props: { color: 'error' } })
  expect(await ui.find({ type: 'Text', text: '$2.345' })).toBeDefined()

  branch = 'feature'
  await $.turn.complete(turn)
  expect(await ui.find({ type: 'Text', text: '⎇ feature' })).toBeDefined()

  context = { window: 200_000 }
  await $.classic.SessionStart({ source: 'compact' })
  expect(await ui.find({ type: 'Text', text: ' (?%)' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '$2.345' })).toBeDefined()

  model = 'Sonnet'
  await $.classic.PostModelSwitch({
    from_model: 'Opus', to_model: 'Sonnet', requested_model: 'sonnet', source: 'command',
    context_tokens: 0, prompt_cache_warm: false, cache_ttl: '5m', estimated_cache_write_usd: 0, pricing: 'catalog',
  })
  expect(await ui.find({ type: 'Text', text: /^Sonnet$/ })).toBeDefined()
  cost = 0
  await $.classic.SessionStart({ source: 'clear' })
  expect(await ui.find({ type: 'Text', text: '$0.000' })).toBeDefined()
  await ui.unmount()
})

test('a slow older refresh cannot overwrite a newer measurement', async ($, on) => {
  let release = () => {}
  let entered = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  const ready = new Promise<void>(resolve => { entered = resolve })
  let calls = 0
  on('session.start', () => ({ cwd: start.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('session.model', () => ({ value: 'Opus' }))
  on('session.repo', () => ({ value: { root: '/work', remote: null, internal: false, name: null } }))
  on('session.cwd', () => ({ value: start.cwd }))
  on('session.usage', () => ({ value: { context: { window: 200_000 }, rateLimits: [] } }))
  on('process.run', async () => {
    if (++calls === 1) {
      entered()
      await gate
      return { value: { stdout: 'old', stderr: '', exitCode: 0 } }
    }
    return { value: { stdout: 'new', stderr: '', exitCode: 0 } }
  })
  const pending = $.session.start(start)
  await ready
  await $.turn.complete(turn)
  release()
  await pending
  const ui = await $.ui.mount(view as never)
  expect(await ui.find({ type: 'Text', text: '⎇ new' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '⎇ old' })).toBeUndefined()
  await ui.unmount()
})

test('survey and zero-space renders yield to the host', async ($, on) => {
  on('session.start', () => ({ cwd: start.cwd }))
  on('session.model', () => ({ value: 'Opus' }))
  on('session.repo', () => ({ value: null }))
  on('session.usage', () => ({ value: { context: { window: 200_000 }, rateLimits: [] } }))
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['host'] }))
  await $.session.start(start)
  for (const props of [{ hasSurvey: true }, { maxRows: 0 }, { bodyColumns: 0 }]) {
    const ui = await $.ui.mount({ ...view, props: { ...view.props, ...props } } as never)
    expect(await ui.find({ type: 'Text', text: 'host' })).toBeDefined()
    await ui.unmount()
  }
})

test('noninteractive sessions never query or draw the band', async ($, on) => {
  let reads = 0
  on('session.start', () => ({ cwd: start.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('session.model', () => { reads++; return { value: 'Opus' } })
  on('session.repo', () => { reads++; return { value: null } })
  on('session.usage', () => { reads++; return { value: { context: { window: 200_000 }, rateLimits: [] } } })
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['host'] }))
  await $.session.start({ ...start, surface: null, isInteractive: false })
  await $.turn.complete(turn)
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [], changed: ['context'] })
  const ui = await $.ui.mount(view as never)
  expect(reads).toBe(0)
  expect(await ui.find({ type: 'Text', text: 'host' })).toBeDefined()
  await ui.unmount()
})

test('failed usage reads clear stale figures and recover on the next turn', async ($, on) => {
  let fail = false
  on('session.start', () => ({ cwd: start.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('session.model', () => ({ value: 'Opus' }))
  on('session.repo', () => ({ value: { root: '/work', remote: null, internal: false, name: null } }))
  on('session.cwd', () => ({ value: start.cwd }))
  on('process.run', () => ({ deny: 'git unavailable' }))
  on('session.usage', () => fail ? { deny: 'usage unavailable' } : {
    value: { context: { window: 200_000, tokens: 50_000, percent: 25 }, rateLimits: [], cost: { usd: 1 } },
  })
  await $.session.start(start)
  const ui = await $.ui.mount(view as never)
  expect(await ui.find({ type: 'Text', text: ' (25%)' })).toBeDefined()
  fail = true
  await $.turn.complete(turn)
  expect(await ui.find({ type: 'Text', text: ' (?%)' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\$/ })).toBeUndefined()
  fail = false
  await $.turn.complete(turn)
  expect(await ui.find({ type: 'Text', text: ' (25%)' })).toBeDefined()
  await ui.unmount()
})
