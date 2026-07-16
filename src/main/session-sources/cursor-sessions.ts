import { execSync } from 'child_process'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { fileUriToPath, getCursorUserDataPaths } from './path-utils'
import type { AiProjectSession } from './types'

interface WorkspaceInfo {
  id: string
  cwd: string
}

function queryItemTable(dbPath: string, key: string): string | null {
  if (!existsSync(dbPath)) return null
  try {
    const escapedKey = key.replace(/'/g, "''")
    const out = execSync(
      `sqlite3 -readonly "${dbPath}" "SELECT value FROM ItemTable WHERE key='${escapedKey}'"`,
      { encoding: 'utf8', timeout: 5000 }
    ).trim()
    return out || null
  } catch {
    return null
  }
}

function parseWorkspaceJson(workspacePath: string, workspaceId: string): WorkspaceInfo | null {
  try {
    const data = JSON.parse(readFileSync(workspacePath, 'utf8')) as Record<string, unknown>
    const folder = data.folder ?? data.workspace
    if (typeof folder === 'string' && folder) {
      const cwd = fileUriToPath(folder)
      if (cwd) return { id: workspaceId, cwd }
    }
    if (folder && typeof folder === 'object') {
      const uri = (folder as Record<string, unknown>).uri
      if (typeof uri === 'string') {
        const cwd = fileUriToPath(uri)
        if (cwd) return { id: workspaceId, cwd }
      }
    }
  } catch {
    // ignore
  }
  return null
}

function buildWorkspaceMap(userPath: string): Map<string, string> {
  const map = new Map<string, string>()
  const storageDir = join(userPath, 'workspaceStorage')
  if (!existsSync(storageDir)) return map

  let entries: string[]
  try {
    entries = readdirSync(storageDir)
  } catch {
    return map
  }

  for (const workspaceId of entries) {
    try {
      const info = parseWorkspaceJson(join(storageDir, workspaceId, 'workspace.json'), workspaceId)
      if (info?.cwd) map.set(workspaceId, info.cwd)
    } catch {
      continue
    }
  }

  return map
}

function asComposerArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((v) => v && typeof v === 'object') as Record<string, unknown>[]
  }
  if (!value || typeof value !== 'object') return []

  const obj = value as Record<string, unknown>
  for (const key of ['allComposers', 'composers', 'headers', 'items']) {
    if (Array.isArray(obj[key])) {
      return obj[key].filter((v) => v && typeof v === 'object') as Record<string, unknown>[]
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
  }
  return undefined
}

function cwdFromWorkspaceIdentifier(
  workspaceIdentifier: unknown,
  workspaceMap: Map<string, string>
): string | null {
  if (!workspaceIdentifier || typeof workspaceIdentifier !== 'object') return null

  const ident = workspaceIdentifier as Record<string, unknown>
  const id = pickString(ident, ['id'])
  if (id && workspaceMap.has(id)) return workspaceMap.get(id) ?? null

  const uri = ident.uri
  if (uri && typeof uri === 'object') {
    const uriObj = uri as Record<string, unknown>
    const fsPath = pickString(uriObj, ['fsPath', 'path'])
    if (fsPath) return fileUriToPath(fsPath)
    const external = pickString(uriObj, ['external'])
    if (external) return fileUriToPath(external)
  }

  if (typeof uri === 'string') return fileUriToPath(uri)

  return null
}

function sessionFromComposer(
  composer: Record<string, unknown>,
  workspaceMap: Map<string, string>,
  fallbackCwd?: string
): AiProjectSession | null {
  const sessionId = pickString(composer, ['composerId', 'id'])
  if (!sessionId) return null

  const cwd =
    cwdFromWorkspaceIdentifier(composer.workspaceIdentifier, workspaceMap) ??
    (fallbackCwd || null)

  if (!cwd) return null

  const lastActiveAt =
    pickNumber(composer, ['lastUpdatedAt', 'updatedAt', 'createdAt', 'timestamp']) ??
    Date.now()

  const title = pickString(composer, ['name', 'title', 'subtitle'])
  const gitBranch = pickString(composer, ['createdOnBranch', 'gitBranch', 'branch'])
  const messageCount = pickNumber(composer, ['messageCount', 'bubbleCount'])

  return {
    tool: 'cursor',
    sessionId,
    cwd,
    title,
    lastActiveAt,
    messageCount: messageCount !== undefined ? Math.round(messageCount) : undefined,
    gitBranch,
    isActive: false
  }
}

function sessionsFromComposerPayload(
  payload: unknown,
  workspaceMap: Map<string, string>,
  fallbackCwd?: string,
  seen?: Set<string>
): AiProjectSession[] {
  const sessions: AiProjectSession[] = []
  const localSeen = seen ?? new Set<string>()

  for (const composer of asComposerArray(payload)) {
    const session = sessionFromComposer(composer, workspaceMap, fallbackCwd)
    if (!session || localSeen.has(session.sessionId)) continue
    localSeen.add(session.sessionId)
    sessions.push(session)
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>
    const nested = obj.composerData ?? obj.data
    if (nested) {
      sessions.push(...sessionsFromComposerPayload(nested, workspaceMap, fallbackCwd, localSeen))
    }
  }

  return sessions
}

function sessionsFromGlobalDb(
  userPath: string,
  workspaceMap: Map<string, string>,
  seen: Set<string>
): AiProjectSession[] {
  const dbPath = join(userPath, 'globalStorage', 'state.vscdb')
  const sessions: AiProjectSession[] = []

  for (const key of ['composer.composerHeaders', 'allComposers']) {
    const raw = queryItemTable(dbPath, key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      for (const session of sessionsFromComposerPayload(parsed, workspaceMap, undefined, seen)) {
        sessions.push(session)
      }
    } catch {
      continue
    }
  }

  return sessions
}

function sessionsFromWorkspaceDbs(
  userPath: string,
  workspaceMap: Map<string, string>,
  seen: Set<string>
): AiProjectSession[] {
  const sessions: AiProjectSession[] = []
  const storageDir = join(userPath, 'workspaceStorage')
  if (!existsSync(storageDir)) return sessions

  let workspaceIds: string[]
  try {
    workspaceIds = readdirSync(storageDir)
  } catch {
    return sessions
  }

  for (const workspaceId of workspaceIds) {
    const cwd = workspaceMap.get(workspaceId)
    if (!cwd) continue

    const dbPath = join(storageDir, workspaceId, 'state.vscdb')
    const raw = queryItemTable(dbPath, 'composer.composerData')
    if (!raw) continue

    try {
      const parsed = JSON.parse(raw)
      for (const session of sessionsFromComposerPayload(parsed, workspaceMap, cwd, seen)) {
        sessions.push(session)
      }
    } catch {
      continue
    }
  }

  return sessions
}

export function getCursorSessions(): AiProjectSession[] {
  const sessions: AiProjectSession[] = []
  const seen = new Set<string>()

  try {
    for (const userPath of getCursorUserDataPaths()) {
      if (!existsSync(userPath)) continue

      const workspaceMap = buildWorkspaceMap(userPath)
      const fromGlobal = sessionsFromGlobalDb(userPath, workspaceMap, seen)
      sessions.push(...fromGlobal)

      if (fromGlobal.length === 0) {
        sessions.push(...sessionsFromWorkspaceDbs(userPath, workspaceMap, seen))
      } else {
        // Also scan workspace DBs for chats not yet in the global index
        sessions.push(...sessionsFromWorkspaceDbs(userPath, workspaceMap, seen))
      }
    }
  } catch {
    return []
  }

  return sessions
}
