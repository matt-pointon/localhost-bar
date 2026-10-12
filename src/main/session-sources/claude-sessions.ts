import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { decodeClaudeProjectPath, getClaudeConfigDirs } from './path-utils'
import type { AiProjectSession } from './types'

const MAX_JSONL_READ_BYTES = 64_000
const MAX_JSONL_PREVIEW_LINES = 20

function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((v) => v && typeof v === 'object') as Record<string, unknown>[]
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of ['sessions', 'items', 'data']) {
      if (Array.isArray(obj[key])) {
        return obj[key].filter((v) => v && typeof v === 'object') as Record<string, unknown>[]
      }
    }
  }
  return []
}

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
      const asNum = Number(value)
      if (Number.isFinite(asNum)) return asNum
    }
  }
  return undefined
}

function resolveCwd(
  record: Record<string, unknown>,
  projectDirName: string
): string | null {
  const fromRecord = pickString(record, ['cwd', 'workingDirectory', 'working_directory', 'projectPath', 'project_path'])
  if (fromRecord && existsSync(fromRecord)) return fromRecord

  const decoded = decodeClaudeProjectPath(projectDirName)
  if (decoded && existsSync(decoded)) return decoded

  return null
}

function readJsonlPreview(filePath: string): Record<string, unknown>[] {
  try {
    const buf = readFileSync(filePath)
    const slice = buf.subarray(0, Math.min(buf.length, MAX_JSONL_READ_BYTES))
    const lines = slice.toString('utf8').split('\n').slice(0, MAX_JSONL_PREVIEW_LINES)
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

function titleFromJsonlRecords(records: Record<string, unknown>[]): string | undefined {
  for (const record of records) {
    const type = pickString(record, ['type', 'role'])
    if (type && type !== 'user' && type !== 'human') continue

    const text = pickString(record, ['message', 'text', 'content', 'prompt'])
    if (text) return text.slice(0, 120)
  }

  for (const record of records) {
    const text = pickString(record, ['message', 'text', 'content', 'summary', 'title', 'name'])
    if (text) return text.slice(0, 120)
  }

  return undefined
}

function cwdFromJsonlRecords(records: Record<string, unknown>[]): string | undefined {
  for (const record of records) {
    const cwd = pickString(record, ['cwd', 'workingDirectory', 'working_directory', 'projectPath'])
    if (cwd) return cwd
  }
  return undefined
}

function sessionsFromIndex(
  indexPath: string,
  projectDirName: string,
  seen: Set<string>
): AiProjectSession[] {
  const sessions: AiProjectSession[] = []

  try {
    const raw = JSON.parse(readFileSync(indexPath, 'utf8'))
    const entries = asArray(raw)

    for (const entry of entries) {
      const sessionId = pickString(entry, ['sessionId', 'id', 'session_id'])
      if (!sessionId || seen.has(sessionId)) continue

      const cwd = resolveCwd(entry, projectDirName)
      if (!cwd) continue

      const lastActiveAt = pickNumber(entry, [
        'updatedAt',
        'mtime',
        'lastActivity',
        'last_activity',
        'timestamp',
        'lastUpdatedAt',
        'createdAt'
      ]) ?? statSync(indexPath).mtimeMs

      const title = pickString(entry, ['title', 'name', 'summary'])
      const messageCount = pickNumber(entry, ['messageCount', 'message_count'])
      const gitBranch = pickString(entry, ['gitBranch', 'git_branch', 'branch'])

      seen.add(sessionId)
      sessions.push({
        tool: 'claude',
        sessionId,
        cwd,
        title,
        lastActiveAt,
        messageCount: messageCount !== undefined ? Math.round(messageCount) : undefined,
        gitBranch,
        isActive: false
      })
    }
  } catch {
    // ignore malformed index
  }

  return sessions
}

function sessionsFromJsonl(
  projectDir: string,
  projectDirName: string,
  seen: Set<string>
): AiProjectSession[] {
  const sessions: AiProjectSession[] = []

  let files: string[]
  try {
    files = readdirSync(projectDir).filter(
      (name) => name.endsWith('.jsonl') && !name.includes('subagent')
    )
  } catch {
    return sessions
  }

  for (const file of files) {
    const sessionId = file.replace(/\.jsonl$/, '')
    if (!sessionId || seen.has(sessionId)) continue

    const filePath = join(projectDir, file)
    let lastActiveAt: number
    try {
      lastActiveAt = statSync(filePath).mtimeMs
    } catch {
      continue
    }

    const preview = readJsonlPreview(filePath)
    const cwd =
      cwdFromJsonlRecords(preview) ??
      resolveCwd({}, projectDirName)

    if (!cwd || !existsSync(cwd)) continue

    const title = titleFromJsonlRecords(preview)

    seen.add(sessionId)
    sessions.push({
      tool: 'claude',
      sessionId,
      cwd,
      title,
      lastActiveAt,
      isActive: false
    })
  }

  return sessions
}

export function getClaudeSessions(): AiProjectSession[] {
  const sessions: AiProjectSession[] = []
  const seen = new Set<string>()

  for (const configDir of getClaudeConfigDirs()) {
    const projectsDir = join(configDir, 'projects')
    if (!existsSync(projectsDir)) continue

    let projectDirs: string[]
    try {
      projectDirs = readdirSync(projectsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    } catch {
      continue
    }

    for (const projectDirName of projectDirs) {
      try {
        const projectDir = join(projectsDir, projectDirName)
        const indexPath = join(projectDir, 'sessions-index.json')

        if (existsSync(indexPath)) {
          sessions.push(...sessionsFromIndex(indexPath, projectDirName, seen))
        }

        sessions.push(...sessionsFromJsonl(projectDir, projectDirName, seen))
      } catch {
        continue
      }
    }
  }

  return sessions
}
