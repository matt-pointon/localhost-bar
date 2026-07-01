import { useState, useEffect, useRef } from 'react'

const POLL_INTERVAL_MS = 30_000

export function useStats(cwds: string[], isPro: boolean) {
  const [stats, setStats] = useState<DailyStats | null>(null)
  const cwdsKey = cwds.slice().sort().join('\n')
  const prevKey = useRef(cwdsKey)

  useEffect(() => {
    if (!isPro) {
      setStats({ proRequired: true, commitsToday: 0, linesChangedToday: 0, activeProjects: 0, streakDays: 0, history: [] })
      return
    }

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
  }, [cwdsKey, isPro, cwds.length])

  return stats
}
