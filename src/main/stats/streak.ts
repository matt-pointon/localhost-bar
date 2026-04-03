import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

interface PersistedStreak {
  lastActiveDate: string // "2026-04-02"
  streakDays: number
}

const STATS_DIR = join(homedir(), '.localhost-bar')
const STATS_FILE = join(STATS_DIR, 'stats.json')

function load(): PersistedStreak {
  try {
    return JSON.parse(readFileSync(STATS_FILE, 'utf8'))
  } catch {
    return { lastActiveDate: '', streakDays: 0 }
  }
}

function save(data: PersistedStreak): void {
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

export function updateStreak(hasActivityToday: boolean): number {
  const data = load()
  const today = todayStr()

  if (!hasActivityToday) {
    return data.streakDays
  }

  if (data.lastActiveDate === today) {
    // Already counted today
    return data.streakDays
  }

  if (data.lastActiveDate === yesterdayStr()) {
    // Consecutive day — extend streak
    data.streakDays += 1
  } else {
    // Gap — reset to 1
    data.streakDays = 1
  }

  data.lastActiveDate = today
  save(data)
  return data.streakDays
}
