import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

export type DeployTarget = 'vercel' | 'railway' | 'netlify'

export interface DeployRecord {
  cwd: string
  target: DeployTarget
  url: string
  timestamp: number
}

const storePath = join(app.getPath('userData'), 'deploys.json')

function read(): Record<string, DeployRecord> {
  if (!existsSync(storePath)) return {}
  try {
    return JSON.parse(readFileSync(storePath, 'utf-8'))
  } catch {
    return {}
  }
}

function write(data: Record<string, DeployRecord>): void {
  writeFileSync(storePath, JSON.stringify(data, null, 2))
}

export function getLastDeploy(cwd: string): DeployRecord | null {
  return read()[cwd] ?? null
}

export function setLastDeploy(record: DeployRecord): void {
  const data = read()
  data[record.cwd] = record
  write(data)
}
