import { expect, test } from 'claude-code/testing'

test('the band shows the Pi-style gauge, token counts and cost', async ($, on) => {
  on('session.start', () => ({ cwd: '/Users/me/project' }))
  on('session.model', () => ({ value: 'Opus 5.5' }))
  on('session.repo', () => ({ value: null }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      rateLimits: [],
      cost: { usd: 1.234 },
      context: { tokens: 50_000, window: 200_000, percent: 25 },
    },
  }))

  await $.session.start({ cwd: '/Users/me/project', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({
    plugin: 'ctx',
    component: 'AbovePrompt',
    surface: 'terminal',
    props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 80 },
  } as never)
  expect((await ui.find({ type: 'Text', text: /^Opus 5\.5$/ }))?.text).toBe('Opus 5.5')
  expect(await ui.find({ type: 'Text', text: /^ \(25%\)$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '█████' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '░'.repeat(15) })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '50.0k/200.0k' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '$1.234' })).toBeDefined()
  await ui.unmount()
})

test('unknown context is not displayed as a green zero', async ($, on) => {
  on('session.start', () => ({ cwd: '/work' }))
  on('session.model', () => ({ value: 'Opus' }))
  on('session.repo', () => ({ value: null }))
  on('session.usage', () => ({
    value: { rateLimits: [], context: { window: 200_000 } },
  }))
  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({
    plugin: 'ctx', component: 'AbovePrompt', surface: 'terminal',
    props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 100 },
  } as never)
  expect(await ui.find({ type: 'Text', text: ' (?%)' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '?/200.0k' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '░'.repeat(20) })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\$/ })).toBeUndefined()
  await ui.unmount()
})
