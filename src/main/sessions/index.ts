import { getClaudeCodeSessions } from './claude-code'
import { getCodexSessions } from './codex'
import type { AgentSession } from './types'

export type { AgentSession } from './types'

const TTL = 60_000
const MAX_SESSIONS = 300

let cached: { data: AgentSession[]; expiry: number } | null = null

export function getAgentSessions(): AgentSession[] {
  if (cached && Date.now() < cached.expiry) return cached.data

  const sources = [getClaudeCodeSessions, getCodexSessions]
  const all: AgentSession[] = []
  for (const read of sources) {
    try {
      all.push(...read())
    } catch {
      // A broken source shouldn't take down the whole view.
    }
  }

  all.sort((a, b) => b.lastRequest - a.lastRequest)
  const data = all.slice(0, MAX_SESSIONS)

  cached = { data, expiry: Date.now() + TTL }
  return data
}
