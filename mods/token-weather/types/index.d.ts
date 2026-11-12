export type CacheTtl = '5m' | '1h'
export type CacheStats = {
  lastTs: string
  lastRead: number
  lastWrite: number
  lastInput: number
  read: number
  write: number
  input: number
  hits: number
  misses: number
  // Thinking tokens of the responses the last turn added; absent in values stored before 0.3.0.
  thinking?: number
}
export type TurnStats = {
  // The session's cost so far in US dollars; null where the host keeps no cost ledger.
  totalUsd: number | null
  // What the last turn added to it; null before the first turn or without a ledger.
  turnUsd: number | null
  // Wall-clock length of the last turn; null before the first.
  durationMs: number | null
  // Output tokens per second over the last turn's model requests; null when none counted.
  tps: number | null
}
export type TokenWeatherReading = { tokens: number; window: number; percent: number }

declare module 'claude-code' {
  interface PluginState {
    'token-weather': {
      readings: TokenWeatherReading[]
      // When the last main-thread model request finished, in ms since the epoch; null before the first.
      lastRequestAt: number | null
      // The cache lifetime Claude's responses last showed; null until one wrote to the cache.
      detectedTtl: CacheTtl | null
      // Whether the cache-clock mod's status line is set up; its countdown replaces this one.
      cacheClockOn: boolean
      // Cache hits/misses and token counts from the transcript's usage.
      cacheStats: CacheStats
      // Session cost, last turn's cost, length and output speed.
      turnStats: TurnStats
    }
  }
}
