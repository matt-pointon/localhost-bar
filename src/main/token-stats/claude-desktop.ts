import { readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

interface ClaudeDesktopTokens {
  tokens: number
}

const BUDDY_TOKENS_PATH = join(
  homedir(),
  'Library',
  'Application Support',
  'Claude',
  'buddy-tokens.json'
)

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getClaudeDesktopTokens(): ClaudeDesktopTokens | null {
  try {
    const raw = JSON.parse(readFileSync(BUDDY_TOKENS_PATH, 'utf8'))
    const entry = raw['tokens-today']
    if (!entry || entry.date !== todayStr()) return null
    return { tokens: entry.tokens ?? 0 }
  } catch {
    return null
  }
}
