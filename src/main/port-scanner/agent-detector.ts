import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const cache = new Map<string, { agents: string[]; expiry: number }>()
const TTL = 10_000

const AGENT_COMMANDS: [string, string][] = [
  ['claude', 'claude'],
  ['codex', 'codex'],
  ['aider', 'aider']
]

function getCwdForPid(pid: number): string {
  try {
    const out = execSync(`lsof -a -p ${pid} -d cwd -Fn 2>/dev/null | grep ^n | head -1`, {
      encoding: 'utf-8',
      timeout: 500
    }).trim()
    return out.replace(/^n/, '')
  } catch {
    return ''
  }
}

function findAgentPids(pattern: string): number[] {
  try {
    const out = execSync(`pgrep -f "${pattern}" 2>/dev/null || true`, {
      encoding: 'utf-8',
      timeout: 2000
    }).trim()
    if (!out) return []
    return out.split('\n').map(s => parseInt(s, 10)).filter(n => !isNaN(n))
  } catch {
    return []
  }
}

function readEditorOpenFolders(storagePath: string): string[] {
  if (!existsSync(storagePath)) return []
  try {
    const data = JSON.parse(readFileSync(storagePath, 'utf-8'))
    const folders: string[] = []
    const opened = data?.windowsState?.openedWindows ?? []
    for (const win of opened) {
      for (const f of win.folders ?? []) {
        const path = typeof f === 'string' ? f : decodeURIComponent(f.uri?.path ?? '')
        if (path) folders.push(path)
      }
    }
    const last = data?.windowsState?.lastActiveWindow?.folders ?? []
    for (const f of last) {
      const path = typeof f === 'string' ? f : decodeURIComponent(f.uri?.path ?? '')
      if (path) folders.push(path)
    }
    return folders
  } catch {
    return []
  }
}

function cwdMatches(projectCwd: string, procCwd: string): boolean {
  const a = projectCwd.replace(/\/$/, '')
  const b = procCwd.replace(/\/$/, '')
  return b === a || b.startsWith(a + '/')
}

export function getActiveAgents(cwd: string | null): string[] {
  if (!cwd) return []

  const cached = cache.get(cwd)
  if (cached && Date.now() < cached.expiry) return cached.agents

  const agents: string[] = []

  for (const [pattern, id] of AGENT_COMMANDS) {
    for (const pid of findAgentPids(pattern)) {
      const procCwd = getCwdForPid(pid)
      if (procCwd && cwdMatches(cwd, procCwd) && !agents.includes(id)) {
        agents.push(id)
      }
    }
  }

  const cursorStorage = join(homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'storage.json')
  const windsurfStorage = join(homedir(), 'Library', 'Application Support', 'Windsurf', 'User', 'globalStorage', 'storage.json')

  for (const folder of readEditorOpenFolders(cursorStorage)) {
    if (cwdMatches(cwd, folder) && !agents.includes('cursor')) agents.push('cursor')
  }
  for (const folder of readEditorOpenFolders(windsurfStorage)) {
    if (cwdMatches(cwd, folder) && !agents.includes('windsurf')) agents.push('windsurf')
  }

  cache.set(cwd, { agents, expiry: Date.now() + TTL })
  return agents
}
