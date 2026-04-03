import { useState, useEffect, useRef } from 'react'

const POLL_INTERVAL_MS = 30_000

export function useStats(cwds: string[]) {
  const [stats, setStats] = useState<DailyStats | null>(null)
  const cwdsKey = cwds.slice().sort().join('\n')
  const prevKey = useRef(cwdsKey)

  useEffect(() => {
    // If cwds changed, fetch immediately
    const immediate = cwdsKey !== prevKey.current
    prevKey.current = cwdsKey

    if (cwds.length === 0) {
      setStats(null)
      return
    }

    const fetch = () => window.electronAPI.getDailyStats(cwds).then(setStats).catch(() => {})

    if (immediate) fetch()
    else fetch()

    const id = setInterval(fetch, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [cwdsKey])

  return stats
}
