import { expect, test } from 'claude-code/testing'

test('the right-aligned band shows model, context fill and cost', async ($, on) => {
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
  for (let i = 0; i < 50; i++) await Promise.resolve()

  const ui = await $.ui.mount({
    plugin: 'ctx',
    component: 'AbovePrompt',
    surface: 'terminal',
    props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 80 },
  } as never)
  expect((await ui.find({ type: 'Text', text: /Opus/ }))?.text).toBe('Opus 5.5')
  expect(await ui.find({ type: 'Text', text: /^25%$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\$1\.23/ })).toBeDefined()
  await ui.unmount()
})
