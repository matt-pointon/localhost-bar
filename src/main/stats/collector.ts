import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { recordDay, getTokensByDate, getKnownProjects } from './streak'
import { localDateStr, localDateStrOffset } from '../../shared/dates'
import type { DayActivity, DayProject } from './streak'
import { getTokenStats } from '../token-stats'
import { inferNameFromCwd } from '../port-scanner/name-inferrer'
import { getDisplayName } from '../settings'

export interface ProjectRef {
  cwd: string
  name: string
}

export interface DailyStats {
  commitsToday: number
  linesChangedToday: number
  tokensToday: number
  activeProjects: number
  streakDays: number
  history: DayActivity[]
}

const WINDOW_DAYS = 30

interface RepoDaily {
  commitsByDate: Map<string, number>
  linesByDate: Map<string, number>
}

const cache = new Map<string, { data: RepoDaily; ts: number }>()
const CACHE_TTL_MS = 60_000

// Per-day commit and line counts for a repo across the last ~31 days, in a single
// `git log` call. Commits are grouped by committer date (matches `--since`).
function getRepoDaily(cwd: string): RepoDaily {
  const cached = cache.get(cwd)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  const commitsByDate = new Map<string, number>()
  const linesByDate = new Map<string, number>()

  try {
    // \x1f (unit separator) marks a commit boundary line: "\x1f<yyyy-mm-dd>".
    // numstat lines that follow ("<added>\t<removed>\t<path>") belong to it.
    const out = execSync(
      `git log --since="${WINDOW_DAYS + 1} days ago 00:00:00" --date=short --pretty=format:$'\\x1f%cd' --numstat`,
      { cwd, timeout: 5000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: '/bin/bash' }
    )

    let currentDate = ''
    for (const line of out.split('\n')) {
      if (line.startsWith('\x1f')) {
        currentDate = line.slice(1).trim()
        if (currentDate) commitsByDate.set(currentDate, (commitsByDate.get(currentDate) ?? 0) + 1)
      } else if (currentDate && line.includes('\t')) {
        const [added, removed] = line.split('\t')
        const a = parseInt(added, 10)
        const r = parseInt(removed, 10)
        let delta = 0
        if (!isNaN(a)) delta += a
        if (!isNaN(r)) delta += r
        if (delta) linesByDate.set(currentDate, (linesByDate.get(currentDate) ?? 0) + delta)
      }
    }
  } catch { /* not a git repo or git failed — leave empty */ }

  const data: RepoDaily = { commitsByDate, linesByDate }
  cache.set(cwd, { data, ts: Date.now() })
  return data
}

function projectName(cwd: string, runningNames: Map<string, string>): string {
  return runningNames.get(cwd) ?? getDisplayName(cwd, inferNameFromCwd(cwd))
}

function getTokensToday(): number {
  try {
    return getTokenStats().claudeDesktop?.tokens ?? 0
  } catch {
    return 0
  }
}

export function getDailyStats(projects: ProjectRef[]): DailyStats {
  const seen = new Set<string>()
  const uniqueProjects = projects.filter(p => {
    if (seen.has(p.cwd)) return false
    seen.add(p.cwd)
    return existsSync(join(p.cwd, '.git'))
  })

  const runningCwds = uniqueProjects.map(p => p.cwd)
  const runningNames = new Map(uniqueProjects.map(p => [p.cwd, p.name]))

  // Universe of repos to attribute activity to: currently running plus any repo
  // ever seen running (so days when a project wasn't running still show up).
  const knownCwds = [...new Set([...runningCwds, ...getKnownProjects()])].filter(
    cwd => existsSync(join(cwd, '.git'))
  )

  const repos = knownCwds.map(cwd => ({
    cwd,
    name: projectName(cwd, runningNames),
    daily: getRepoDaily(cwd)
  }))

  const tokensByDate = getTokensByDate()
  const tokensToday = getTokensToday()
  const todayStr = localDateStr()

  const history: DayActivity[] = []
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const dateStr = localDateStrOffset(i)

    let commits = 0
    let lines = 0
    const dayProjects: DayProject[] = []
    for (const repo of repos) {
      const c = repo.daily.commitsByDate.get(dateStr) ?? 0
      const l = repo.daily.linesByDate.get(dateStr) ?? 0
      if (c > 0 || l > 0) {
        commits += c
        lines += l
        dayProjects.push({ cwd: repo.cwd, name: repo.name, commits: c, lines: l })
      }
    }
    dayProjects.sort((a, b) => b.commits - a.commits || b.lines - a.lines)

    const tokens = dateStr === todayStr ? tokensToday : (tokensByDate[dateStr] ?? 0)
    history.push({ date: dateStr, commits, lines, tokens, projects: dayProjects })
  }

  const todayEntry = history[history.length - 1]
  const commitsToday = todayEntry.commits
  const linesChangedToday = todayEntry.lines

  const hasActivity = commitsToday > 0 || linesChangedToday > 0 || tokensToday > 0
  const streakDays = recordDay(hasActivity, tokensToday, runningCwds)

  return {
    commitsToday,
    linesChangedToday,
    tokensToday,
    activeProjects: uniqueProjects.length,
    streakDays,
    history
  }
}
