import { useState, useEffect } from 'react'

const POLL_INTERVAL_MS = 30_000

export function useSessions() {
  const [sessions, setSessions] = useState<AgentSession[] | null>(null)

  useEffect(() => {
    const load = () => window.electronAPI.getSessions().then(setSessions).catch(() => setSessions([]))
    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return sessions
}
