import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { localDateStr, localDateStrOffset } from '../../shared/dates'

export interface DayProject {
  cwd: string
  name: string
  commits: number
  lines: number
}

export interface DayActivity {
  date: string   // "2026-06-24"
  commits: number
  lines: number
  tokens: number
  projects: DayProject[]  // per-project git breakdown for the day
}

interface PersistedData {
  lastActiveDate: string
  streakDays: number
  tokensByDate: Record<string, number>  // date -> AI tokens used that day
  knownProjects: string[]               // cwds ever seen running (for historical lookup)
}

const STATS_DIR = join(homedir(), '.localhost-bar')
const STATS_FILE = join(STATS_DIR, 'stats.json')
const MAX_KNOWN_PROJECTS = 40
const RETENTION_DAYS = 40

function load(): PersistedData {
  try {
    const raw = JSON.parse(readFileSync(STATS_FILE, 'utf8'))
    const tokensByDate: Record<string, number> = { ...(raw.tokensByDate ?? {}) }

    // Migrate legacy `history: [{ date, tokens }]` into tokensByDate.
    if (Array.isArray(raw.history)) {
      for (const h of raw.history) {
        if (h && typeof h.date === 'string' && h.tokens) {
          tokensByDate[h.date] = tokensByDate[h.date] ?? h.tokens
        }
      }
    }

    return {
      lastActiveDate: raw.lastActiveDate ?? '',
      streakDays: raw.streakDays ?? 0,
      tokensByDate,
      knownProjects: Array.isArray(raw.knownProjects) ? raw.knownProjects : []
    }
  } catch {
    return { lastActiveDate: '', streakDays: 0, tokensByDate: {}, knownProjects: [] }
  }
}

function save(data: PersistedData): void {
  try {
    mkdirSync(STATS_DIR, { recursive: true })
    writeFileSync(STATS_FILE, JSON.stringify(data))
  } catch { /* best-effort */ }
}

function todayStr(): string {
  return localDateStr()
}

function yesterdayStr(): string {
  return localDateStrOffset(1)
}

function cutoffStr(days: number): string {
  return localDateStrOffset(days)
}

export function getTokensByDate(): Record<string, number> {
  return load().tokensByDate
}

export function getKnownProjects(): string[] {
  return load().knownProjects
}

// Records today's activity: updates the streak, stores today's token total, and
// remembers which project cwds were seen so past days can be attributed later.
export function recordDay(
  hasActivityToday: boolean,
  tokensToday: number,
  runningCwds: string[]
): number {
  const data = load()
  const today = todayStr()

  data.tokensByDate[today] = tokensToday

  for (const cwd of runningCwds) {
    if (!data.knownProjects.includes(cwd)) data.knownProjects.push(cwd)
  }
  if (data.knownProjects.length > MAX_KNOWN_PROJECTS) {
    data.knownProjects = data.knownProjects.slice(-MAX_KNOWN_PROJECTS)
  }

  const cutoff = cutoffStr(RETENTION_DAYS)
  for (const date of Object.keys(data.tokensByDate)) {
    if (date < cutoff) delete data.tokensByDate[date]
  }

  if (hasActivityToday) {
    if (data.lastActiveDate === today) {
      // Already counted today
    } else if (data.lastActiveDate === yesterdayStr()) {
      data.streakDays += 1
      data.lastActiveDate = today
    } else {
      data.streakDays = 1
      data.lastActiveDate = today
    }
  }

  save(data)
  return data.streakDays
}
