import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { getCodexHome } from './path-utils'
import type { AiProjectSession } from './types'

const MAX_HISTORY_BYTES = 512_000
const MAX_ROLLOUT_READ_BYTES = 64_000
const MAX_ROLLOUT_PREVIEW_LINES = 30
const MAX_ROLLOUT_FILES = 200
const ROLLOUT_LOOKBACK_DAYS = 14

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Date.parse(value)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return undefined
}

function sessionFromRecord(record: Record<string, unknown>): AiProjectSession | null {
  const sessionId = pickString(record, ['session_id', 'sessionId', 'id'])
  if (!sessionId) return null

  const cwd = pickString(record, ['cwd', 'path', 'working_directory', 'workingDirectory'])
  if (!cwd) return null

  const lastActiveAt =
    pickNumber(record, ['timestamp', 'updated_at', 'updatedAt', 'last_active_at', 'created_at']) ??
    Date.now()

  const title = pickString(record, ['text', 'title', 'summary', 'name', 'prompt'])

  return {
    tool: 'codex',
    sessionId,
    cwd,
    title: title?.slice(0, 120),
    lastActiveAt,
    isActive: false
  }
}

function readJsonlTail(filePath: string, maxBytes: number): Record<string, unknown>[] {
  try {
    const buf = readFileSync(filePath)
    const start = Math.max(0, buf.length - maxBytes)
    const slice = buf.subarray(start)
    const lines = slice.toString('utf8').split('\n')
    const records: Record<string, unknown>[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === 'object') records.push(parsed as Record<string, unknown>)
      } catch {
        continue
      }
    }

    return records
  } catch {
    return []
  }
}

function readJsonlHead(filePath: string): Record<string, unknown>[] {
  try {
    const buf = readFileSync(filePath)
    const slice = buf.subarray(0, Math.min(buf.length, MAX_ROLLOUT_READ_BYTES))
    const lines = slice.toString('utf8').split('\n').slice(0, MAX_ROLLOUT_PREVIEW_LINES)
    const records: Record<string, unknown>[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === 'object') records.push(parsed as Record<string, unknown>)
      } catch {
        continue
      }
    }

    return records
  } catch {
    return []
  }
}

function sessionFromRolloutRecords(records: Record<string, unknown>[]): AiProjectSession | null {
  let sessionId: string | undefined
  let cwd: string | undefined
  let title: string | undefined
  let lastActiveAt: number | undefined

  for (const record of records) {
    const type = pickString(record, ['type', 'record_type', 'kind'])

    if (type === 'session_meta' || record.session_meta) {
      const meta = (record.session_meta ?? record) as Record<string, unknown>
      sessionId = sessionId ?? pickString(meta, ['session_id', 'sessionId', 'id'])
      cwd = cwd ?? pickString(meta, ['cwd', 'path', 'working_directory'])
      title = title ?? pickString(meta, ['title', 'name', 'summary'])
      lastActiveAt = lastActiveAt ?? pickNumber(meta, ['timestamp', 'updated_at', 'created_at'])
    }

    if (type === 'turn_context' || record.turn_context) {
      const ctx = (record.turn_context ?? record) as Record<string, unknown>
      sessionId = sessionId ?? pickString(ctx, ['session_id', 'sessionId'])
      cwd = cwd ?? pickString(ctx, ['cwd', 'path', 'working_directory'])
      lastActiveAt = lastActiveAt ?? pickNumber(ctx, ['timestamp'])
    }

    sessionId = sessionId ?? pickString(record, ['session_id', 'sessionId'])
    cwd = cwd ?? pickString(record, ['cwd', 'path', 'working_directory'])
    title = title ?? pickString(record, ['text', 'title', 'summary'])
    lastActiveAt = lastActiveAt ?? pickNumber(record, ['timestamp', 'updated_at'])
  }

  if (!sessionId || !cwd) return null

  return {
    tool: 'codex',
    sessionId,
    cwd,
    title: title?.slice(0, 120),
    lastActiveAt: lastActiveAt ?? Date.now(),
    isActive: false
  }
}

function collectRecentRolloutFiles(codexHome: string): string[] {
  const sessionsDir = join(codexHome, 'sessions')
  if (!existsSync(sessionsDir)) return []

  const files: { path: string; mtime: number }[] = []
  const cutoff = Date.now() - ROLLOUT_LOOKBACK_DAYS * 86_400_000

  const walk = (dir: string, depth: number): void => {
    if (depth > 4 || files.length >= MAX_ROLLOUT_FILES) return

    let entries: ReturnType<typeof readdirSync>
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (files.length >= MAX_ROLLOUT_FILES) break
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1)
        continue
      }

      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue

      try {
        const mtime = statSync(fullPath).mtimeMs
        if (mtime < cutoff) continue
        files.push({ path: fullPath, mtime })
      } catch {
        continue
      }
    }
  }

  walk(sessionsDir, 0)

  return files
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, MAX_ROLLOUT_FILES)
    .map((f) => f.path)
}

function upsertSession(
  map: Map<string, AiProjectSession>,
  session: AiProjectSession
): void {
  const existing = map.get(session.sessionId)
  if (!existing || session.lastActiveAt >= existing.lastActiveAt) {
    map.set(session.sessionId, session)
  }
}

export function getCodexSessions(): AiProjectSession[] {
  const byId = new Map<string, AiProjectSession>()

  try {
    const codexHome = getCodexHome()
    const historyPath = join(codexHome, 'history.jsonl')

    if (existsSync(historyPath)) {
      try {
        const buf = readFileSync(historyPath)
        const slice = buf.subarray(0, Math.min(buf.length, MAX_HISTORY_BYTES))
        const lines = slice.toString('utf8').split('\n')

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const record = JSON.parse(trimmed) as Record<string, unknown>
            const session = sessionFromRecord(record)
            if (session) upsertSession(byId, session)
          } catch {
            continue
          }
        }
      } catch {
        // ignore history read errors
      }
    }

    for (const filePath of collectRecentRolloutFiles(codexHome)) {
      try {
        const headRecords = readJsonlHead(filePath)
        let session = sessionFromRolloutRecords(headRecords)

        if (!session) {
          const tailRecords = readJsonlTail(filePath, MAX_ROLLOUT_READ_BYTES)
          session = sessionFromRolloutRecords(tailRecords)
        }

        if (session?.cwd) upsertSession(byId, session)
      } catch {
        continue
      }
    }
  } catch {
    return []
  }

  return Array.from(byId.values()).filter((s) => Boolean(s.cwd))
}
