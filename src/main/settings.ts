import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

export interface AppSettings {
  notificationsEnabled: boolean
  launchAtLogin: boolean
  pins: string[]
  renames: Record<string, string>
  licenseKey: string | null
  licenseEmail: string | null
}

const DEFAULTS: AppSettings = {
  notificationsEnabled: true,
  launchAtLogin: false,
  pins: [],
  renames: {},
  licenseKey: null,
  licenseEmail: null
}

function settingsPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'settings.json')
}

export function getSettings(): AppSettings {
  try {
    const raw = JSON.parse(readFileSync(settingsPath(), 'utf-8'))
    return { ...DEFAULTS, ...raw }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...partial }
  writeFileSync(settingsPath(), JSON.stringify(next, null, 2))
  return next
}

// License key format: LB-XXXX-XXXX-XXXX (checksum in last segment)
const LICENSE_PREFIX = 'LB'
const DEV_LICENSE_KEY = 'LB-DEV0-0000-PRO0'

function checksumSegment(payload: string): string {
  return createHash('sha256').update(payload + ':localhost-bar').digest('hex').slice(0, 4).toUpperCase()
}

export function validateLicenseKey(key: string): { valid: boolean; email?: string } {
  const trimmed = key.trim().toUpperCase()
  if (trimmed === DEV_LICENSE_KEY) return { valid: true, email: 'dev@localhost.bar' }

  const parts = trimmed.split('-')
  if (parts.length !== 4 || parts[0] !== LICENSE_PREFIX) return { valid: false }

  const payload = parts.slice(1, 3).join('-')
  const expected = checksumSegment(payload)
  if (parts[3] !== expected) return { valid: false }

  return { valid: true }
}

export function isPro(): boolean {
  const { licenseKey } = getSettings()
  if (!licenseKey) return false
  return validateLicenseKey(licenseKey).valid
}

export function activateLicense(key: string): { success: boolean; error?: string; email?: string } {
  const result = validateLicenseKey(key)
  if (!result.valid) return { success: false, error: 'Invalid license key' }
  setSettings({ licenseKey: key.trim().toUpperCase(), licenseEmail: result.email ?? null })
  return { success: true, email: result.email }
}

export function deactivateLicense(): void {
  setSettings({ licenseKey: null, licenseEmail: null })
}

export function getLicenseStatus(): { isPro: boolean; email: string | null; key: string | null } {
  const s = getSettings()
  return {
    isPro: isPro(),
    email: s.licenseEmail,
    key: s.licenseKey ? `${s.licenseKey.slice(0, 7)}…` : null
  }
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
