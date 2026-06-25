import { readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export interface ClaudeCodeStats {
  prompts: number
  sessions: number
}

const HISTORY_PATH = join(homedir(), '.claude', 'history.jsonl')

function todayStart(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

export function getClaudeCodeStats(): ClaudeCodeStats | null {
  try {
    const content = readFileSync(HISTORY_PATH, 'utf8')
    const lines = content.trim().split('\n')

    const start = todayStart()
    const sessionIds = new Set<string>()
    let prompts = 0

    // Read from end — most recent entries last
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i])
        if (!entry.timestamp) continue
        if (entry.timestamp < start) break
        prompts++
        if (entry.sessionId) sessionIds.add(entry.sessionId)
      } catch {
        continue
      }
    }

    if (prompts === 0) return null
    return { prompts, sessions: sessionIds.size }
  } catch {
    return null
  }
}
