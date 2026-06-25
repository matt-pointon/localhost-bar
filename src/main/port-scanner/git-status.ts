import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

export interface GitStatus {
  branch: string
  changes: number
  lastCommit: string
}

const cache = new Map<string, { data: GitStatus | null; ts: number }>()
const CACHE_TTL_MS = 30_000

export function getGitStatus(cwd: string | null): GitStatus | null {
  if (!cwd) return null
  if (!existsSync(join(cwd, '.git'))) return null

  const cached = cache.get(cwd)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd, timeout: 2000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim()

    const porcelain = execSync('git status --porcelain', {
      cwd, timeout: 2000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim()
    const changes = porcelain === '' ? 0 : porcelain.split('\n').length

    const lastCommit = execSync('git log -1 --format=%s', {
      cwd, timeout: 2000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim().slice(0, 40)

    const data: GitStatus = { branch, changes, lastCommit }
    cache.set(cwd, { data, ts: Date.now() })
    return data
  } catch {
    cache.set(cwd, { data: null, ts: Date.now() })
    return null
  }
}
