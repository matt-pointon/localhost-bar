import { execSync } from 'child_process'

interface GitResult {
  success: boolean
  error?: string
  url?: string
}

export function gitCommit(cwd: string, message: string): GitResult {
  try {
    execSync('git add -A', { cwd, timeout: 10_000, stdio: ['pipe', 'pipe', 'pipe'] })
    execSync(`git commit -m ${JSON.stringify(message)}`, {
      cwd, timeout: 10_000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    })
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

export function gitPull(cwd: string): GitResult {
  try {
    execSync('git pull', { cwd, timeout: 30_000, stdio: ['pipe', 'pipe', 'pipe'] })
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

export function gitCreatePR(cwd: string): GitResult {
  try {
    // Check gh CLI is available
    execSync('which gh', { timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] })

    // Push current branch
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd, timeout: 5000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim()

    execSync(`git push -u origin ${branch}`, {
      cwd, timeout: 30_000, stdio: ['pipe', 'pipe', 'pipe']
    })

    // Open PR creation in browser
    execSync('gh pr create --fill --web', {
      cwd, timeout: 15_000, stdio: ['pipe', 'pipe', 'pipe']
    })

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // If PR already exists, gh prints a URL — still useful
    if (msg.includes('already exists')) {
      return { success: true }
    }
    return { success: false, error: msg }
  }
}

export function isGhInstalled(): boolean {
  try {
    execSync('which gh', { timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] })
    return true
  } catch {
    return false
  }
}

export function getDefaultBranch(cwd: string): string | null {
  try {
    // Try to get the default branch from remote
    const remote = execSync('git remote show origin 2>/dev/null | grep "HEAD branch" | sed "s/.*: //"', {
      cwd, timeout: 5000, encoding: 'utf8', shell: '/bin/bash', stdio: ['pipe', 'pipe', 'pipe']
    }).trim()
    if (remote) return remote

    // Fallback: check common names
    for (const name of ['main', 'master']) {
      try {
        execSync(`git rev-parse --verify ${name}`, { cwd, timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] })
        return name
      } catch { /* try next */ }
    }
    return null
  } catch {
    return null
  }
}
