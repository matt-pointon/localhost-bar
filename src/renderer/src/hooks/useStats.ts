import { useState, useEffect } from 'react'

const POLL_INTERVAL_MS = 30_000

export function useStats(projects: ProjectRef[]) {
  const [stats, setStats] = useState<DailyStats | null>(null)
  const projectsKey = projects
    .map(p => `${p.cwd}\t${p.name}`)
    .sort()
    .join('\n')

  useEffect(() => {
    const fetch = () => window.electronAPI.getDailyStats(projects).then(setStats).catch(() => {})

    fetch()
    const id = setInterval(fetch, POLL_INTERVAL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsKey])

  return stats
}
