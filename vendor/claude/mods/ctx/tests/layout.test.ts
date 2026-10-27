import { expect, test } from 'claude-code/testing'
import { band, columns, fillColor, fmtTokens } from '../hooks/band'
import type { Line } from '../types'

const sample: Line = {
  model: 'Opus', branch: 'main', percent: 25,
  tokens: 50_000, window: 200_000, costUsd: 1.234,
}
const plain = (s: Line, width: number) => band(s, width).map(p => p.text).join('')

test('wide layout follows Pi order and uses a 20-cell gauge', () => {
  expect(plain(sample, 120)).toBe('⎇ main │ Opus │ Context: [█████░░░░░░░░░░░░░░░] 50.0k/200.0k (25%) │ $1.234')
})

test('color thresholds match Pi exactly', () => {
  expect([null, 0, 49, 50, 79, 80, 100].map(fillColor)).toEqual([
    undefined, 'success', 'success', 'warning', 'warning', 'error', 'error',
  ])
  for (const [percent, color] of [[49, 'success'], [50, 'warning'], [79, 'warning'], [80, 'error']] as const) {
    const parts = band({ ...sample, percent }, 120)
    expect(parts.find(p => p.text.startsWith('█'))?.color).toBe(color)
    expect(parts.find(p => p.text === ` (${percent}%)`)?.color).toBe(color)
  }
})

test('tokens use k and M, and invalid figures remain unknown', () => {
  expect([null, undefined, NaN, Infinity, -1, 0, 999, 1000, 200_000, 1_000_000].map(fmtTokens))
    .toEqual(['?', '?', '?', '?', '?', '0', '999', '1.0k', '200.0k', '1.0M'])
})

test('percent is clamped, rounded, or unknown rather than NaN', () => {
  for (const [percent, expected] of [[-20, '(0%)'], [150, '(100%)'], [25.6, '(26%)'], [NaN, '(?%)'], [Infinity, '(?%)']] as const) {
    expect(plain({ ...sample, percent }, 120)).toContain(expected)
  }
  const unknown = band({ ...sample, percent: null, tokens: null }, 120)
  expect(unknown.find(p => p.text === ' (?%)')).toMatchObject({ dimColor: true })
  expect(unknown.find(p => p.text.includes('█'))).toBeUndefined()
})

test('narrow layout drops branch then model before shrinking the gauge', () => {
  const essential = 'Context: [█████░░░░░░░░░░░░░░░] 50.0k/200.0k (25%) │ $1.234'
  const width = columns(essential)
  expect(plain(sample, width + 7)).toBe(`Opus │ ${essential}`)
  expect(plain(sample, width)).toBe(essential)
  const smaller = plain(sample, width - 10)
  expect(smaller).toContain('[███░░░░░░░]')
  expect(smaller).toContain('$1.234')
  expect(columns(smaller)).toBe(width - 10)
})

test('every narrow width fits, including wide Unicode names', () => {
  const unicode = { ...sample, model: '模型👩‍💻', branch: '分支/é🚀'.repeat(10) }
  for (let width = 0; width <= 180; width++) {
    expect(columns(plain(unicode, width)) <= width).toBe(true)
  }
  expect(plain(sample, 0)).toBe('')
  expect(plain(sample, 1)).toBe('…')
})

test('missing cost is omitted but a real zero is shown', () => {
  expect(plain({ ...sample, costUsd: null, branch: null }, 120)).toContain('no git │ Opus')
  for (const costUsd of [null, NaN, Infinity, -1]) {
    expect(plain({ ...sample, costUsd }, 120)).not.toContain('$')
  }
  expect(plain({ ...sample, costUsd: 0 }, 120)).toContain('$0.000')
})
