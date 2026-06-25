import { execSync } from 'child_process'
import { existsSync } from 'fs'

export type ToolCategory = 'editor' | 'terminal' | 'ai' | 'other'

export interface ToolAuth {
  loggedIn: boolean
  email?: string
  plan?: string
}

export interface DetectedTool {
  id: string
  name: string
  category: ToolCategory
  available: boolean
  hasCli: boolean
  auth?: ToolAuth
}

function hasCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { timeout: 2000, stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function hasApp(name: string): boolean {
  return existsSync(`/Applications/${name}.app`)
}

function getClaudeAuth(): ToolAuth | undefined {
  try {
    const out = execSync('claude auth status', { timeout: 5000, stdio: 'pipe' }).toString()
    const data = JSON.parse(out)
    return {
      loggedIn: !!data.loggedIn,
      email: data.email ?? undefined,
      plan: data.subscriptionType ?? undefined
    }
  } catch {
    return undefined
  }
}

function getCodexAuth(): ToolAuth | undefined {
  try {
    execSync('codex login status', { timeout: 5000, stdio: 'pipe' })
    return { loggedIn: true }
  } catch {
    // exit code 1 = not logged in, command not found = no codex
    return { loggedIn: false }
  }
}

interface ToolDefinition {
  id: string
  name: string
  category: ToolCategory
  cli?: string          // CLI command name (e.g. 'code', 'cursor')
  appName?: string      // macOS app name for `open -a` fallback
  detect: () => { available: boolean; hasCli: boolean }
  auth?: () => ToolAuth | undefined
}

function detectCliOrApp(cli: string, app: string): { available: boolean; hasCli: boolean } {
  if (hasCommand(cli)) return { available: true, hasCli: true }
  if (hasApp(app)) return { available: true, hasCli: false }
  return { available: false, hasCli: false }
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  // Editors
  { id: 'vscode', name: 'VS Code', category: 'editor', cli: 'code', appName: 'Visual Studio Code', detect: () => detectCliOrApp('code', 'Visual Studio Code') },
  { id: 'cursor', name: 'Cursor', category: 'editor', cli: 'cursor', appName: 'Cursor', detect: () => detectCliOrApp('cursor', 'Cursor') },
  { id: 'windsurf', name: 'Windsurf', category: 'editor', cli: 'windsurf', appName: 'Windsurf', detect: () => detectCliOrApp('windsurf', 'Windsurf') },
  { id: 'zed', name: 'Zed', category: 'editor', cli: 'zed', appName: 'Zed', detect: () => detectCliOrApp('zed', 'Zed') },
  { id: 'xcode', name: 'Xcode', category: 'editor', appName: 'Xcode', detect: () => ({ available: hasApp('Xcode'), hasCli: false }) },

  // Terminals
  { id: 'terminal', name: 'Terminal', category: 'terminal', appName: 'Terminal', detect: () => ({ available: true, hasCli: false }) },
  { id: 'iterm2', name: 'iTerm2', category: 'terminal', appName: 'iTerm', detect: () => ({ available: hasApp('iTerm'), hasCli: false }) },
  { id: 'ghostty', name: 'Ghostty', category: 'terminal', appName: 'Ghostty', detect: () => ({ available: hasApp('Ghostty'), hasCli: false }) },
  { id: 'warp', name: 'Warp', category: 'terminal', appName: 'Warp', detect: () => ({ available: hasApp('Warp'), hasCli: false }) },

  // AI tools
  { id: 'claude', name: 'Claude Code', category: 'ai', cli: 'claude', detect: () => ({ available: hasCommand('claude'), hasCli: true }), auth: getClaudeAuth },
  { id: 'codex', name: 'Codex', category: 'ai', cli: 'codex', detect: () => ({ available: hasCommand('codex'), hasCli: true }), auth: getCodexAuth },

  // Other
  { id: 'finder', name: 'Finder', category: 'other', detect: () => ({ available: true, hasCli: false }) },
  { id: 'conductor', name: 'Conductor', category: 'other', appName: 'Conductor', detect: () => ({ available: hasApp('Conductor'), hasCli: false }) },
  { id: 'github-desktop', name: 'GitHub Desktop', category: 'other', appName: 'GitHub Desktop', detect: () => ({ available: hasApp('GitHub Desktop'), hasCli: false }) },
]

let _cache: DetectedTool[] | null = null
let _cacheTs = 0
const CACHE_TTL_MS = 60_000

export function getAvailableTools(): DetectedTool[] {
  const now = Date.now()
  if (_cache && now - _cacheTs < CACHE_TTL_MS) return _cache

  _cache = TOOL_DEFINITIONS.map(def => {
    const { available, hasCli } = def.detect()
    return {
      id: def.id,
      name: def.name,
      category: def.category,
      available,
      hasCli,
      auth: available && def.auth ? def.auth() : undefined
    }
  }).filter(t => t.available)

  _cacheTs = now
  return _cache
}
