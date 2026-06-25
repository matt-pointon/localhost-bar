import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export interface DayActivity {
  date: string   // "2026-06-24"
  commits: number
  lines: number
}

interface PersistedData {
  lastActiveDate: string
  streakDays: number
  history: DayActivity[]  // last 30 days
}

const STATS_DIR = join(homedir(), '.localhost-bar')
const STATS_FILE = join(STATS_DIR, 'stats.json')

function load(): PersistedData {
  try {
    const raw = JSON.parse(readFileSync(STATS_FILE, 'utf8'))
    return {
      lastActiveDate: raw.lastActiveDate ?? '',
      streakDays: raw.streakDays ?? 0,
      history: raw.history ?? []
    }
  } catch {
    return { lastActiveDate: '', streakDays: 0, history: [] }
  }
}

function save(data: PersistedData): void {
  try {
    mkdirSync(STATS_DIR, { recursive: true })
    writeFileSync(STATS_FILE, JSON.stringify(data))
  } catch { /* best-effort */ }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function updateStreak(hasActivityToday: boolean, commits: number, lines: number): number {
  const data = load()
  const today = todayStr()

  // Update today's history entry
  if (hasActivityToday) {
    const existing = data.history.find(h => h.date === today)
    if (existing) {
      existing.commits = commits
      existing.lines = lines
    } else {
      data.history.push({ date: today, commits, lines })
    }
  }

  // Trim to last 30 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  data.history = data.history.filter(h => h.date >= cutoffStr)

  // Update streak
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

export function getHistory(): DayActivity[] {
  return load().history
}
