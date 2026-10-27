import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { band, finite } from './band'
import type { Line } from '../types'

const line = atom({ plugin: 'ctx', key: 'line' } as const, null)
let interactive = false
let revision = 0

async function refresh($: EngineInterface) {
  const requested = ++revision
  const [model, repo, usage] = await Promise.all([
    $.session.model().catch(() => '?'),
    $.session.repo().catch(() => null),
    // Do not substitute /context's estimate: it uses a different denominator
    // and would conceal the unknown state after compaction.
    $.session.usage().catch(() => null),
  ])
  const branch = repo
    ? await $.session.cwd()
        .then(cwd => $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd, timeoutMs: 3000 }))
        .then(r => r.exitCode === 0 ? r.stdout.trim() : null)
        .catch(() => null)
    : null
  const context = usage?.context
  const next: Line = {
    model,
    percent: context?.percent != null && Number.isFinite(context.percent) ? context.percent : null,
    tokens: finite(context?.tokens),
    window: finite(context?.window),
    branch: branch || null,
    costUsd: finite(usage?.cost?.usd),
  }
  // A newer event must not be overwritten by an older, slower git query.
  if (requested === revision) await update($, line, () => next)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const ran = await next(e)
    interactive = e.isInteractive
    if (interactive) await refresh($)
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)
    if (interactive) await refresh($)
    return ran
  })

  on('session.measure', async ($, e, next) => {
    const ran = await next(e)
    if (interactive && (e.changed.includes('context') || e.changed.includes('cost'))) await refresh($)
    return ran
  })

  on('classic.SessionStart', async ($, e, next) => {
    const ran = await next(e)
    // Optional UI must not block this gating lifecycle hook if state storage fails.
    if (interactive && e.source !== 'startup') await refresh($).catch(() => {})
    return ran
  })

  on('classic.PostModelSwitch', async ($, e, next) => {
    const ran = await next(e)
    if (interactive) await refresh($).catch(() => {})
    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, line)
    // Older persisted shapes wait for the next refresh.
    if (e.props.hasSurvey || e.props.maxRows < 1 || e.props.bodyColumns < 1 ||
        s === null || typeof s !== 'object' || !('tokens' in s)) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const parts = band(s, e.props.bodyColumns)
    return (
      <Box flexDirection="row" justifyContent="flex-end" width={e.props.bodyColumns}>
        <Text wrap="truncate-end">
          {parts.map((part, i) => (
            <Text key={String(i)} color={part.color} dimColor={part.dimColor}>{part.text}</Text>
          ))}
        </Text>
      </Box>
    )
  })
}
