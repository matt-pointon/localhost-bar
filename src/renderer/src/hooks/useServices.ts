import { useState, useEffect, useCallback, useRef } from 'react'

export interface GitStatus {
  branch: string
  changes: number
  lastCommit: string
}

export interface ResourceUsage {
  cpu: number
  mem: number
}

export interface ServiceInfo {
  pid: number
  port: number
  name: string
  command: string
  address: string
  status: 'running' | 'stopping' | 'exiting'
  cwd: string | null
  args: string | null
  git: GitStatus | null
  resources: ResourceUsage | null
  stackTags: string[]
  originTools: string[]
  activeAgents: string[]
  pinned: boolean
}

export interface OfflineService {
  port: number
  name: string
  command: string
  cwd: string | null
  args: string | null
  exiting?: boolean
}

export interface PortConflict {
  port: number
  services: { name: string; pid: number }[]
}

const POLL_INTERVAL_MS = 3000
const ANIM_MS = 200

export function useServices() {
  const [services, setServices] = useState<ServiceInfo[]>([])
  const [offlineServices, setOfflineServices] = useState<OfflineService[]>([])
  const [portConflicts, setPortConflicts] = useState<PortConflict[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const stoppingPids = useRef<Set<number>>(new Set())
  const offlineMap = useRef<Map<number, OfflineService>>(new Map())
  const exitingRunningPorts = useRef<Set<number>>(new Set())
  const exitingOfflinePorts = useRef<Set<number>>(new Set())
  const servicesRef = useRef<ServiceInfo[]>([])

  const updateServices = useCallback((next: ServiceInfo[]) => {
    servicesRef.current = next
    setServices(next)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const { services: raw, portConflicts: conflicts } = await window.electronAPI.scanPorts()
      setPortConflicts(conflicts)
      const activePorts = new Set(raw.map(s => s.port))
      const current = servicesRef.current

      const goingOffline = current.filter(
        svc =>
          !activePorts.has(svc.port) &&
          svc.status !== 'exiting' &&
          !exitingRunningPorts.current.has(svc.port)
      )

      goingOffline.forEach(svc => {
        exitingRunningPorts.current.add(svc.port)
        setTimeout(() => {
          offlineMap.current.set(svc.port, {
            port: svc.port,
            name: svc.name,
            command: svc.command,
            cwd: svc.cwd,
            args: svc.args
          })
          exitingRunningPorts.current.delete(svc.port)
          updateServices(servicesRef.current.filter(x => x.port !== svc.port))
          setOfflineServices([...offlineMap.current.values()])
        }, ANIM_MS)
      })

      offlineMap.current.forEach((_, port) => {
        if (activePorts.has(port) && !exitingOfflinePorts.current.has(port)) {
          exitingOfflinePorts.current.add(port)
          setOfflineServices(prev =>
            prev.map(x => (x.port === port ? { ...x, exiting: true } : x))
          )
          setTimeout(() => {
            offlineMap.current.delete(port)
            exitingOfflinePorts.current.delete(port)
            setOfflineServices([...offlineMap.current.values()])
          }, ANIM_MS)
        }
      })

      const merged: ServiceInfo[] = raw.map(s => ({
        ...s,
        status: stoppingPids.current.has(s.pid) ? ('stopping' as const) : ('running' as const)
      }))

      stoppingPids.current.forEach(pid => {
        if (!raw.find(s => s.pid === pid)) stoppingPids.current.delete(pid)
      })

      const stillExiting = current
        .filter(s => exitingRunningPorts.current.has(s.port))
        .map(s =>
          goingOffline.some(g => g.port === s.port)
            ? { ...s, status: 'exiting' as const }
            : s
        )

      updateServices([...merged, ...stillExiting])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('[useServices] scan error', err)
    } finally {
      setIsLoading(false)
    }
  }, [updateServices])

  const killService = useCallback(
    async (pid: number) => {
      stoppingPids.current.add(pid)
      updateServices(
        servicesRef.current.map(s =>
          s.pid === pid ? { ...s, status: 'stopping' as const } : s
        )
      )
      await window.electronAPI.killProcess(pid)
      setTimeout(refresh, 300)
      setTimeout(refresh, 1000)
    },
    [updateServices, refresh]
  )

  const openService = useCallback((port: number) => {
    window.electronAPI.openInBrowser(port)
  }, [])

  const restartService = useCallback(async (service: OfflineService) => {
    if (!service.args || !service.cwd) return
    await window.electronAPI.restartService(service.args, service.cwd)
    setTimeout(refresh, 500)
    setTimeout(refresh, 1500)
  }, [refresh])

  const dismissOffline = useCallback((port: number) => {
    offlineMap.current.delete(port)
    setOfflineServices([...offlineMap.current.values()])
  }, [])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const id = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  return {
    services,
    offlineServices,
    portConflicts,
    isLoading,
    lastUpdated,
    refresh,
    killService,
    openService,
    restartService,
    dismissOffline
  }
}
