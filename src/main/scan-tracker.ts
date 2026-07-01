import type { ServiceInfo } from './port-scanner'
import { notifyServiceOffline, notifyServiceOnline, notifyPortConflict } from './notifications'

let previousPorts = new Map<number, string>()
let previousConflicts = new Set<number>()

export function trackServiceChanges(services: ServiceInfo[], portConflicts: { port: number; services: { name: string }[] }[]): void {
  const currentPorts = new Map<number, string>()
  for (const s of services) {
    currentPorts.set(s.port, s.name)
  }

  for (const [port, name] of currentPorts) {
    if (!previousPorts.has(port)) {
      notifyServiceOnline(name, port)
    }
  }

  for (const [port, name] of previousPorts) {
    if (!currentPorts.has(port)) {
      notifyServiceOffline(name, port)
    }
  }

  for (const conflict of portConflicts) {
    if (!previousConflicts.has(conflict.port)) {
      notifyPortConflict(conflict.port, conflict.services.map(s => s.name))
    }
  }

  previousPorts = currentPorts
  previousConflicts = new Set(portConflicts.map(c => c.port))
}
