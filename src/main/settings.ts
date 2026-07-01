import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface AppSettings {
  notificationsEnabled: boolean
  launchAtLogin: boolean
  pins: string[]
  renames: Record<string, string>
}

const DEFAULTS: AppSettings = {
  notificationsEnabled: true,
  launchAtLogin: false,
  pins: [],
  renames: {}
}

function settingsPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'settings.json')
}

export function getSettings(): AppSettings {
  try {
    const raw = JSON.parse(readFileSync(settingsPath(), 'utf-8'))
    const { licenseKey: _lk, licenseEmail: _le, ...rest } = raw
    return { ...DEFAULTS, ...rest }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...partial }
  writeFileSync(settingsPath(), JSON.stringify(next, null, 2))
  return next
}

export function getDisplayName(cwd: string | null, inferred: string): string {
  if (!cwd) return inferred
  const { renames } = getSettings()
  return renames[cwd] ?? inferred
}

export function isPinned(cwd: string | null): boolean {
  if (!cwd) return false
  return getSettings().pins.includes(cwd)
}

export function togglePin(cwd: string): boolean {
  const s = getSettings()
  const pins = [...s.pins]
  const idx = pins.indexOf(cwd)
  if (idx >= 0) {
    pins.splice(idx, 1)
    setSettings({ pins })
    return false
  }
  pins.unshift(cwd)
  setSettings({ pins })
  return true
}

export function setRename(cwd: string, name: string): void {
  const renames = { ...getSettings().renames }
  if (!name.trim()) {
    delete renames[cwd]
  } else {
    renames[cwd] = name.trim()
  }
  setSettings({ renames })
}

export function sortByPins<T extends { cwd: string | null }>(items: T[]): T[] {
  const { pins } = getSettings()
  return [...items].sort((a, b) => {
    const aPin = a.cwd ? pins.indexOf(a.cwd) : -1
    const bPin = b.cwd ? pins.indexOf(b.cwd) : -1
    if (aPin >= 0 && bPin < 0) return -1
    if (bPin >= 0 && aPin < 0) return 1
    if (aPin >= 0 && bPin >= 0) return aPin - bPin
    return 0
  })
}
