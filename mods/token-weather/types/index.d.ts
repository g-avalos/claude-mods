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
    }
  }
}
