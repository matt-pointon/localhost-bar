import { execSync } from 'child_process'
import { existsSync } from 'fs'

export interface InstalledTools {
  vscode: boolean
  cursor: boolean
  windsurf: boolean
  claude: boolean
  iterm2: boolean
}

function hasCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { timeout: 1000, stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

let cached: InstalledTools | null = null

export function getInstalledTools(): InstalledTools {
  if (cached) return cached
  cached = {
    vscode: hasCommand('code'),
    cursor: hasCommand('cursor'),
    windsurf: hasCommand('windsurf'),
    claude: hasCommand('claude'),
    iterm2: existsSync('/Applications/iTerm.app')
  }
  return cached
}
