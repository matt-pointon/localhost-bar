import { useState, useEffect, useMemo } from 'react'

const POLL_INTERVAL_MS = 30_000

export function useAiProjects(runningCwds: string[]) {
  const [projects, setProjects] = useState<AiProject[]>([])

  const cwdKey = useMemo(() => runningCwds.slice().sort().join('\0'), [runningCwds])

  useEffect(() => {
    let cancelled = false

    const fetch = () => {
      window.electronAPI
        .getAiProjects(runningCwds)
        .then((data) => {
          if (!cancelled) setProjects(data)
        })
        .catch(() => {})
    }

    fetch()
    const id = setInterval(fetch, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [cwdKey])

  return projects
}
