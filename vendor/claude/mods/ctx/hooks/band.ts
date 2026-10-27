// Adapted from pi-context-bar (Thomas van Dongen, MIT); see ../LICENSE.
import type { Line } from '../types'

export type Segment = { text: string; color?: string; dimColor?: boolean }

export const finite = (n: number | null | undefined): number | null =>
  n != null && Number.isFinite(n) && n >= 0 ? n : null

export function fmtTokens(n: number | null | undefined): string {
  if (finite(n) === null) return '?'
  if (n! < 1000) return String(n)
  if (n! < 1_000_000) return `${(n! / 1000).toFixed(1)}k`
  return `${(n! / 1_000_000).toFixed(1)}M`
}

export const fillColor = (percent: number | null) =>
  percent === null ? undefined : percent >= 80 ? 'error' : percent >= 50 ? 'warning' : 'success'

const clean = (s: string) => s.replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').trim()

// Mods expose no terminal-width helper. Budget unfamiliar Unicode at two
// columns per code point (conservative for emoji/combining sequences), and let
// the host Text renderer provide the final truncation. Our fixed glyphs use one.
export function columns(text: string): number {
  return Array.from(text).reduce((n, ch) =>
    n + (ch.charCodeAt(0) < 127 || '█░│⎇…'.includes(ch) ? 1 : 2), 0)
}

export function band(s: Line, width: number): Segment[] {
  width = Number.isFinite(width) ? Math.max(0, Math.floor(width)) : 0
  if (!width) return []
  const raw = s.percent
  const percent = raw != null && Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : null
  const color = fillColor(percent)
  const sep: Segment = { text: ' │ ', dimColor: true }
  const cost: Segment[] = finite(s.costUsd) === null ? [] : [sep, { text: `$${s.costUsd!.toFixed(3)}`, color: 'success' }]
  const context = (size: number): Segment[] => {
    const filled = Math.round(((percent ?? 0) / 100) * size)
    return [
      { text: 'Context: [', dimColor: true },
      { text: '█'.repeat(filled), color },
      { text: '░'.repeat(size - filled), dimColor: true },
      { text: '] ', dimColor: true },
      { text: `${fmtTokens(s.tokens)}/${fmtTokens(s.window)}` },
      { text: ` (${percent === null ? '?' : percent.toFixed(0)}%)`, color, dimColor: percent === null },
      ...cost,
    ]
  }
  const sizeOf = (parts: Segment[]) => parts.reduce((n, p) => n + columns(p.text), 0)
  const size = Math.max(5, 20 - Math.max(0, sizeOf(context(20)) - width))
  let parts = context(size)
  const model: Segment = { text: clean(s.model), color: 'claude' }
  const branch: Segment = { text: s.branch ? `⎇ ${clean(s.branch)}` : 'no git', color: 'suggestion' }
  if (sizeOf([branch, sep, model, sep, ...parts]) <= width) parts = [branch, sep, model, sep, ...parts]
  else if (sizeOf([model, sep, ...parts]) <= width) parts = [model, sep, ...parts]

  // Like Pi, clip only as a last resort below the five-cell gauge minimum.
  if (sizeOf(parts) <= width) return parts.filter(p => p.text)
  let left = width - 1
  const clipped: Segment[] = []
  for (const part of parts) {
    let text = ''
    for (const ch of part.text) {
      const size = columns(ch)
      if (size > left) break
      text += ch
      left -= size
    }
    if (text) clipped.push({ ...part, text })
    if (text !== part.text) break
  }
  return [...clipped, { text: '…', dimColor: true }]
}
