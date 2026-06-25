import { app } from 'electron'
import { execSync } from 'child_process'
import { runLsof } from './lsof-parser'
import { inferProcessInfo } from './name-inferrer'
import { getGitStatus } from './git-status'
import type { GitStatus } from './git-status'

export type { GitStatus }

export interface ResourceUsage {
  cpu: number   // percentage (0–100+)
  mem: number   // RSS in MB
}

export interface ServiceInfo {
  pid: number
  port: number
  name: string
  command: string
  address: string
  status: 'running'
  cwd: string | null
  args: string | null
  git: GitStatus | null
  resources: ResourceUsage | null
}

function getResourceUsage(pids: number[]): Map<number, ResourceUsage> {
  const result = new Map<number, ResourceUsage>()
  if (pids.length === 0) return result
  try {
    const pidArgs = pids.join(',')
    const out = execSync(`ps -p ${pidArgs} -o pid=,pcpu=,rss=`, {
      encoding: 'utf-8',
      timeout: 2000
    })
    for (const line of out.trim().split('\n')) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 3) {
        const pid = parseInt(parts[0], 10)
        const cpu = parseFloat(parts[1])
        const rssKb = parseInt(parts[2], 10)
        if (!isNaN(pid) && !isNaN(cpu) && !isNaN(rssKb)) {
          result.set(pid, { cpu, mem: Math.round(rssKb / 1024) })
        }
      }
    }
  } catch {
    // silently fail
  }
  return result
}

export async function scanPorts(): Promise<ServiceInfo[]> {
  const raw = runLsof()
  const appPath = app.getAppPath()

  const entries = raw.map(entry => {
    const info = inferProcessInfo(entry.pid, entry.command)
    return {
      pid: entry.pid,
      port: entry.port,
      name: info.name,
      command: info.command,
      address: entry.address,
      status: 'running' as const,
      cwd: info.cwd,
      args: info.args,
      git: getGitStatus(info.cwd),
      resources: null as ResourceUsage | null
    }
  }).filter(service => !service.cwd?.startsWith(appPath))

  const resources = getResourceUsage(entries.map(e => e.pid))
  for (const entry of entries) {
    entry.resources = resources.get(entry.pid) ?? null
  }

  return entries
}
