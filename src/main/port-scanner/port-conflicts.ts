import type { ServiceInfo } from './port-scanner'

export interface PortConflict {
  port: number
  services: { name: string; pid: number }[]
}

export function detectPortConflicts(services: ServiceInfo[]): PortConflict[] {
  const byPort = new Map<number, { name: string; pid: number }[]>()
  for (const s of services) {
    const list = byPort.get(s.port) ?? []
    list.push({ name: s.name, pid: s.pid })
    byPort.set(s.port, list)
  }
  const conflicts: PortConflict[] = []
  for (const [port, svcs] of byPort) {
    if (svcs.length > 1) conflicts.push({ port, services: svcs })
  }
  return conflicts
}
