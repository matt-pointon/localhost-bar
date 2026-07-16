import { getActiveAgents } from '../port-scanner/agent-detector'
import { getClaudeSessions } from './claude-sessions'
import { getCursorSessions } from './cursor-sessions'
import { getCodexSessions } from './codex-sessions'
import { basenameFromCwd, cwdMatches, normalizeCwd } from './path-utils'
import type { AiProject, AiProjectSession, AiToolId } from './types'

export type { AiProject, AiProjectSession, AiToolId } from './types'
export {
  basenameFromCwd,
  cwdMatches,
  decodeClaudeProjectPath,
  encodeClaudeProjectPath,
  expandHome,
  fileUriToPath,
  getClaudeConfigDirs,
  getCodexHome,
  getCursorUserDataPaths,
  normalizeCwd
} from './path-utils'

const SESSION_CACHE_TTL_MS = 60_000
const MAX_SESSIONS = 200
const MAX_PROJECTS = 50

let sessionCache: { sessions: AiProjectSession[]; expiry: number } | null = null

function enrichSessionActive(session: AiProjectSession): AiProjectSession {
  const agents = getActiveAgents(session.cwd)
  const isActive = agents.includes(session.tool)
  return { ...session, isActive }
}

function mergeSessions(): AiProjectSession[] {
  const byKey = new Map<string, AiProjectSession>()

  const upsert = (session: AiProjectSession): void => {
    const key = `${session.tool}:${session.sessionId}`
    const existing = byKey.get(key)
    if (!existing || session.lastActiveAt > existing.lastActiveAt) {
      byKey.set(key, session)
    }
  }

  for (const session of getClaudeSessions()) upsert(session)
  for (const session of getCursorSessions()) upsert(session)
  for (const session of getCodexSessions()) upsert(session)

  return Array.from(byKey.values())
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
    .slice(0, MAX_SESSIONS)
    .map(enrichSessionActive)
}

export function getAiSessions(): AiProjectSession[] {
  const now = Date.now()
  if (sessionCache && now < sessionCache.expiry) {
    return sessionCache.sessions.map(enrichSessionActive)
  }

  const sessions = mergeSessions()
  sessionCache = { sessions, expiry: now + SESSION_CACHE_TTL_MS }
  return sessions
}

export function getAiProjects(runningCwds?: string[]): AiProject[] {
  const sessions = getAiSessions()
  const projectMap = new Map<string, AiProject>()

  for (const session of sessions) {
    const cwd = normalizeCwd(session.cwd)
    let project = projectMap.get(cwd)

    if (!project) {
      project = {
        cwd,
        name: basenameFromCwd(cwd),
        tools: [],
        sessions: [],
        lastActiveAt: 0,
        isActive: false,
        hasRunningServer: false
      }
      projectMap.set(cwd, project)
    }

    project.sessions.push(session)
    if (!project.tools.includes(session.tool)) project.tools.push(session.tool)
    if (session.lastActiveAt > project.lastActiveAt) project.lastActiveAt = session.lastActiveAt
    if (session.isActive) project.isActive = true
  }

  for (const project of projectMap.values()) {
    if (!project.isActive) {
      const agents = getActiveAgents(project.cwd)
      project.isActive = agents.length > 0
    }

    if (runningCwds?.length) {
      project.hasRunningServer = runningCwds.some((runningCwd) => {
        return cwdMatches(project.cwd, runningCwd) || cwdMatches(runningCwd, project.cwd)
      })
    }
  }

  return Array.from(projectMap.values())
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
    .slice(0, MAX_PROJECTS)
}

export function buildResumeCommand(
  tool: AiToolId,
  sessionId: string,
  cwd: string
): { command: string; args: string[] } | null {
  switch (tool) {
    case 'cursor':
      return { command: 'cursor', args: [cwd] }
    case 'claude':
      return { command: 'claude', args: ['--resume', sessionId] }
    case 'codex':
      return { command: 'codex', args: ['resume', sessionId, '--cd', cwd] }
    default:
      return null
  }
}

export function resumeAiSession(session: {
  tool: AiToolId
  sessionId: string
  cwd: string
}): { success: boolean; error?: string; command?: string; args?: string[] } {
  const built = buildResumeCommand(session.tool, session.sessionId, session.cwd)
  if (!built) {
    return { success: false, error: `Unknown tool: ${session.tool}` }
  }
  return { success: true, command: built.command, args: built.args }
}
