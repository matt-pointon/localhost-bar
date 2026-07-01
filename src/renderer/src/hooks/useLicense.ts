import { useState, useEffect, useCallback } from 'react'

export function useLicense() {
  const [status, setStatus] = useState<LicenseStatus | null>(null)

  const refresh = useCallback(() => {
    window.electronAPI.getLicenseStatus().then(setStatus).catch(() => {})
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const activate = useCallback(async (key: string) => {
    const result = await window.electronAPI.activateLicense(key)
    if (result.success) refresh()
    return result
  }, [refresh])

  const deactivate = useCallback(async () => {
    await window.electronAPI.deactivateLicense()
    refresh()
  }, [refresh])

  return {
    isPro: status?.isPro ?? false,
    email: status?.email ?? null,
    refresh,
    activate,
    deactivate
  }
}
