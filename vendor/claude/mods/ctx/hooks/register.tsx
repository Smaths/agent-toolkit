import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Line } from '../types'

const line = atom({ plugin: 'ctx', key: 'line' } as const, null)

const fillColor = (percent: number) =>
  percent >= 85 ? 'error' : percent >= 60 ? 'warning' : 'success'

let isRefreshing = false

async function refresh($: EngineInterface) {
  if (isRefreshing) return
  isRefreshing = true
  try {
    const [model, repo, usage] = await Promise.all([
      $.session.model(),
      $.session.repo(),
      $.session.usage({ breakdown: 'summary' }),
    ])
    const branch = repo
      ? await $.process
          .run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { timeoutMs: 3000 })
          .then(r => (r.exitCode === 0 ? r.stdout.trim() : null))
          .catch(() => null)
      : null

    const { context } = usage
    const next: Line = {
      model,
      percent: context.percent ?? context.breakdown?.percentage ?? 0,
      branch: branch || null,
      costUsd: usage.cost?.usd ?? null,
    }
    await update($, line, () => next)
  } finally {
    isRefreshing = false
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const ran = await next(e)
    if (e.isInteractive) void refresh($)
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)
    void refresh($)
    return ran
  })

  on('session.measure', async ($, e, next) => {
    const ran = await next(e)
    if (e.changed.includes('context') || e.changed.includes('cost')) void refresh($)
    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, line)
    // A value kept from before this shape (a plain string) waits for the next refresh
    if (e.props.hasSurvey || s === null || typeof s !== 'object') return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const Dot = () => <Text dimColor> · </Text>
    const fill = fillColor(s.percent)

    return (
      <Box flexDirection="row" justifyContent="flex-end">
        <Text bold color="claude">{s.model}</Text>
        <Dot />
        <Text bold color={fill}>{s.percent}%</Text>
        <Text color={fill}> ctx</Text>
        {s.branch !== null && <Dot />}
        {s.branch !== null && <Text color="suggestion">⎇ {s.branch}</Text>}
        {s.costUsd !== null && <Dot />}
        {s.costUsd !== null && <Text color="merged">${s.costUsd.toFixed(2)}</Text>}
      </Box>
    )
  })
}
