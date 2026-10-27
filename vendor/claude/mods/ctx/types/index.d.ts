export type Line = {
  model: string
  percent: number | null
  tokens: number | null
  window: number | null
  branch: string | null
  costUsd: number | null
}

declare module 'claude-code' {
  interface PluginState {
    ctx: { line: Line | null }
  }
}
