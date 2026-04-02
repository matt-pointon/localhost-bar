import { useState, useEffect, useCallback, useRef } from 'react'

export function useTasks(cwds: string[]) {
  const [tasks, setTasks] = useState<Map<string, TaskItem[]>>(new Map())
  const cwdsKey = cwds.join(',')

  // Load all on mount / when cwds change
  useEffect(() => {
    window.electronAPI.taskGetAll().then(all => {
      const map = new Map<string, TaskItem[]>()
      for (const [cwd, record] of Object.entries(all)) {
        map.set(cwd, record.tasks)
      }
      setTasks(map)
    })
  }, [cwdsKey])

  // Sync from config files every 5 seconds to pick up AI agent changes
  const cwdsRef = useRef(cwds)
  cwdsRef.current = cwds

  useEffect(() => {
    const interval = setInterval(async () => {
      for (const cwd of cwdsRef.current) {
        const result = await window.electronAPI.taskSync(cwd)
        if (result.changed && result.tasks) {
          const updatedTasks = result.tasks
          setTasks(prev => {
            const next = new Map(prev)
            next.set(cwd, updatedTasks)
            return next
          })
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const addTask = useCallback(async (cwd: string, text: string) => {
    const result = await window.electronAPI.taskAdd(cwd, text)
    if (result.success && result.task) {
      const task = result.task
      setTasks(prev => {
        const next = new Map(prev)
        const existing = next.get(cwd) ?? []
        next.set(cwd, [...existing, task])
        return next
      })
      return task
    }
  }, [])

  const removeTask = useCallback(async (cwd: string, taskId: string) => {
    await window.electronAPI.taskRemove(cwd, taskId)
    setTasks(prev => {
      const next = new Map(prev)
      const list = (next.get(cwd) ?? []).filter(t => t.id !== taskId)
      if (list.length === 0) next.delete(cwd)
      else next.set(cwd, list)
      return next
    })
  }, [])

  const clearTasks = useCallback(async (cwd: string) => {
    await window.electronAPI.taskClear(cwd)
    setTasks(prev => {
      const next = new Map(prev)
      next.delete(cwd)
      return next
    })
  }, [])

  return { tasks, addTask, removeTask, clearTasks }
}
