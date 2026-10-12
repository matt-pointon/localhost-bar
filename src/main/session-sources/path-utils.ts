import { existsSync } from 'fs'
import { homedir, platform } from 'os'
import { join } from 'path'

export function expandHome(path: string): string {
  if (path === '~') return homedir()
  if (path.startsWith('~/')) return join(homedir(), path.slice(2))
  return path
}

export function normalizeCwd(path: string): string {
  return path.replace(/\/$/, '')
}

export function cwdMatches(a: string, b: string): boolean {
  const left = normalizeCwd(a)
  const right = normalizeCwd(b)
  return right === left || right.startsWith(left + '/')
}

export function encodeClaudeProjectPath(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, '-')
}

export function decodeClaudeProjectPath(encoded: string): string | null {
  if (!encoded || !encoded.startsWith('-')) return null

  const decoded = encoded.replace(/-/g, '/')
  if (!decoded.startsWith('/')) return null

  if (existsSync(decoded)) return decoded

  // Lossy decode — path does not exist on disk
  return null
}

export function getCursorUserDataPaths(): string[] {
  const home = homedir()
  const os = platform()

  if (os === 'darwin') {
    return [join(home, 'Library', 'Application Support', 'Cursor', 'User')]
  }
  if (os === 'win32') {
    const appData = process.env.APPDATA
    if (appData) return [join(appData, 'Cursor', 'User')]
    return [join(home, 'AppData', 'Roaming', 'Cursor', 'User')]
  }
  return [join(home, '.config', 'Cursor', 'User')]
}

export function getClaudeConfigDirs(): string[] {
  const dirs: string[] = []
  const seen = new Set<string>()

  const add = (p: string | undefined): void => {
    if (!p) return
    const expanded = expandHome(p)
    if (seen.has(expanded)) return
    seen.add(expanded)
    dirs.push(expanded)
  }

  add(process.env.CLAUDE_CONFIG_DIR)
  add(join(homedir(), '.claude'))
  add(join(homedir(), '.config', 'claude'))

  return dirs
}

export function getCodexHome(): string {
  const fromEnv = process.env.CODEX_HOME
  if (fromEnv) return expandHome(fromEnv)
  return join(homedir(), '.codex')
}

export function basenameFromCwd(cwd: string): string {
  const normalized = normalizeCwd(cwd)
  const parts = normalized.split('/').filter(Boolean)
  return parts[parts.length - 1] || normalized || cwd
}

export function fileUriToPath(uri: string): string {
  if (!uri) return ''

  if (uri.startsWith('file://')) {
    try {
      const url = new URL(uri)
      let pathname = decodeURIComponent(url.pathname)
      // Windows: file:///C:/path → /C:/path
      if (/^\/[a-zA-Z]:\//.test(pathname)) {
        pathname = pathname.slice(1)
      }
      return pathname
    } catch {
      return uri.replace(/^file:\/\//, '')
    }
  }

  return uri
}
