import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export interface CursorStats {
  aiEdits: number
  aiLines: number
  avgAiPercent: number
}

const DB_PATH = join(homedir(), '.cursor', 'ai-tracking', 'ai-code-tracking.db')

function todayRange(): { startMs: number; endMs: number } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start.getTime() + 86400000)
  return { startMs: start.getTime(), endMs: end.getTime() }
}

function query(sql: string): string {
  return execSync(
    `sqlite3 -readonly "${DB_PATH}" "${sql}"`,
    { encoding: 'utf8', timeout: 5000 }
  ).trim()
}

export function getCursorStats(): CursorStats | null {
  if (!existsSync(DB_PATH)) return null

  try {
    const { startMs, endMs } = todayRange()

    const aiEdits = parseInt(
      query(`SELECT count(*) FROM ai_code_hashes WHERE createdAt >= ${startMs} AND createdAt < ${endMs}`) || '0',
      10
    )

    const commitRow = query(
      `SELECT COALESCE(SUM(COALESCE(tabLinesAdded,0) + COALESCE(composerLinesAdded,0)), 0), COALESCE(AVG(CAST(v2AiPercentage AS REAL)), 0) FROM scored_commits WHERE scoredAt >= ${startMs} AND scoredAt < ${endMs}`
    )
    let aiLines = 0
    let avgAiPercent = 0
    if (commitRow) {
      const parts = commitRow.split('|')
      aiLines = parseInt(parts[0] || '0', 10)
      avgAiPercent = Math.round(parseFloat(parts[1] || '0'))
    }

    if (aiEdits === 0 && aiLines === 0 && avgAiPercent === 0) return null

    return { aiEdits, aiLines, avgAiPercent }
  } catch {
    return null
  }
}
