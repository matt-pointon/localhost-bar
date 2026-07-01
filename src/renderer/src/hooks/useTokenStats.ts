import { useState, useEffect } from 'react'

const POLL_INTERVAL_MS = 30_000

export function useTokenStats() {
  const [stats, setStats] = useState<TokenStats | null>(null)

  useEffect(() => {
    const fetch = () => window.electronAPI.getTokenStats().then(setStats).catch(() => {})
    fetch()
    const id = setInterval(fetch, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return stats
}
