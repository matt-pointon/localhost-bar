import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { updateStreak, getHistory } from './streak'
import type { DayActivity } from './streak'

export interface DailyStats {
  commitsToday: number
  linesChangedToday: number
  activeProjects: number
  streakDays: number
  history: DayActivity[]
}

interface ProjectStats {
  commits: number
  lines: number
}

const cache = new Map<string, { data: ProjectStats; ts: number }>()
const CACHE_TTL_MS = 60_000

function getProjectStats(cwd: string): ProjectStats {
  const cached = cache.get(cwd)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  let commits = 0
  let lines = 0

  try {
    const log = execSync('git log --since="midnight" --oneline', {
      cwd, timeout: 3000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim()
    commits = log === '' ? 0 : log.split('\n').length

    if (commits > 0) {
      const numstat = execSync('git log --since="midnight" --format="" --numstat', {
        cwd, timeout: 3000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
      }).trim()
      if (numstat) {
        for (const line of numstat.split('\n')) {
          const [added, removed] = line.split('\t')
          const a = parseInt(added, 10)
          const r = parseInt(removed, 10)
          if (!isNaN(a)) lines += a
          if (!isNaN(r)) lines += r
        }
      }
    }
  } catch { /* git command failed — skip this project */ }

  const data = { commits, lines }
  cache.set(cwd, { data, ts: Date.now() })
  return data
}

export function getDailyStats(cwds: string[]): DailyStats {
  const uniqueCwds = [...new Set(cwds)].filter(
    cwd => existsSync(join(cwd, '.git'))
  )

  let commitsToday = 0
  let linesChangedToday = 0

  for (const cwd of uniqueCwds) {
    const stats = getProjectStats(cwd)
    commitsToday += stats.commits
    linesChangedToday += stats.lines
  }

  const hasActivity = commitsToday > 0
  const streakDays = updateStreak(hasActivity, commitsToday, linesChangedToday)
  const history = getHistory()

  return {
    commitsToday,
    linesChangedToday,
    activeProjects: uniqueCwds.length,
    streakDays,
    history
  }
}
