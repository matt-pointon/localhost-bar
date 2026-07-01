import { useState, useEffect, useRef } from 'react'

const POLL_INTERVAL_MS = 30_000

export function useStats(cwds: string[]) {
  const [stats, setStats] = useState<DailyStats | null>(null)
  const cwdsKey = cwds.slice().sort().join('\n')
  const prevKey = useRef(cwdsKey)

  useEffect(() => {
    const immediate = cwdsKey !== prevKey.current
    prevKey.current = cwdsKey

    if (cwds.length === 0) {
      setStats(null)
      return
    }

    const fetch = () => window.electronAPI.getDailyStats(cwds).then(setStats).catch(() => {})

    fetch()
    const id = setInterval(fetch, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [cwdsKey, cwds.length])

  return stats
}
