import { getClaudeDesktopTokens } from './claude-desktop'
import { getCursorStats } from './cursor-ide'
import { getClaudeCodeStats } from './claude-code'
import type { CursorStats } from './cursor-ide'
import type { ClaudeCodeStats } from './claude-code'

export interface TokenStats {
  claudeDesktop: { tokens: number } | null
  cursor: CursorStats | null
  claudeCode: ClaudeCodeStats | null
}

let cached: { data: TokenStats; expiry: number } | null = null
const TTL = 60_000

export function getTokenStats(): TokenStats {
  if (cached && Date.now() < cached.expiry) return cached.data

  const data: TokenStats = {
    claudeDesktop: getClaudeDesktopTokens(),
    cursor: getCursorStats(),
    claudeCode: getClaudeCodeStats()
  }

  cached = { data, expiry: Date.now() + TTL }
  return data
}
