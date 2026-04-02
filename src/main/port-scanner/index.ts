import { app } from 'electron'
import { runLsof } from './lsof-parser'
import { inferProcessInfo } from './name-inferrer'
import { getGitStatus } from './git-status'
import type { GitStatus } from './git-status'

export type { GitStatus }

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
}

export async function scanPorts(): Promise<ServiceInfo[]> {
  const raw = runLsof()
  const appPath = app.getAppPath()

  return raw
    .map(entry => {
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
        git: getGitStatus(info.cwd)
      }
    })
    .filter(service => !service.cwd?.startsWith(appPath))
}
