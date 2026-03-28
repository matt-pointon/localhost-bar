import { useState, useEffect, useCallback } from 'react'

export type DeployTarget = 'vercel' | 'railway' | 'netlify'

export interface DeployRecord {
  cwd: string
  target: DeployTarget
  url: string
  timestamp: number
}

export interface DeployInfo {
  target: DeployTarget
  installedCLIs: { vercel: boolean; railway: boolean; netlify: boolean }
  lastDeploy: DeployRecord | null
}

export interface DeployState {
  status: 'idle' | 'deploying' | 'success' | 'error'
  url?: string
  lastDeploy?: DeployRecord
}

export function useDeployState() {
  const [states, setStates] = useState<Map<string, DeployState>>(new Map())

  useEffect(() => {
    const unsubscribe = window.electronAPI.onDeployProgress(({ cwd, status, url }) => {
      setStates(prev => {
        const next = new Map(prev)
        const existing = next.get(cwd) ?? { status: 'idle' }
        if (status === 'success') {
          next.set(cwd, {
            status: 'success',
            url,
            lastDeploy: existing.lastDeploy
          })
        } else if (status === 'error') {
          next.set(cwd, { ...existing, status: 'error' })
        } else {
          next.set(cwd, { ...existing, status: 'deploying' })
        }
        return next
      })
    })
    return unsubscribe
  }, [])

  const deploy = useCallback(async (cwd: string, target: DeployTarget) => {
    setStates(prev => {
      const next = new Map(prev)
      next.set(cwd, { ...(next.get(cwd) ?? { status: 'idle' }), status: 'deploying' })
      return next
    })
    await window.electronAPI.deployRun(cwd, target)
  }, [])

  const setLastDeploy = useCallback((cwd: string, record: DeployRecord) => {
    setStates(prev => {
      const next = new Map(prev)
      next.set(cwd, { ...(next.get(cwd) ?? { status: 'idle' }), lastDeploy: record })
      return next
    })
  }, [])

  return { states, deploy, setLastDeploy }
}
