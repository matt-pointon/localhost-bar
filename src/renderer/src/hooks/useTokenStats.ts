import { useState, useEffect } from 'react'

const POLL_INTERVAL_MS = 30_000

export function useTokenStats(isPro: boolean) {
  const [stats, setStats] = useState<TokenStats | null>(null)

  useEffect(() => {
    if (!isPro) {
      setStats({ proRequired: true, claudeDesktop: null, cursor: null, claudeCode: null })
      return
    }

    const fetch = () => window.electronAPI.getTokenStats().then(setStats).catch(() => {})
    fetch()
    const id = setInterval(fetch, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [isPro])

  return stats
}
