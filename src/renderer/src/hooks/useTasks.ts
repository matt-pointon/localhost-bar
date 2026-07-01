import { useState, useEffect, useCallback } from 'react'

export function useTasks(cwd: string | null) {
  const [tasks, setTasks] = useState<Task[]>([])

  const refresh = useCallback(() => {
    if (!cwd) { setTasks([]); return }
    window.electronAPI.getTasks(cwd).then(setTasks).catch(() => setTasks([]))
  }, [cwd])

  useEffect(() => { refresh() }, [refresh])

  const add = useCallback(async (text: string) => {
    if (!cwd) return { success: false, error: 'No project' }
    const result = await window.electronAPI.addTask(cwd, text)
    if (result.success && result.tasks) setTasks(result.tasks)
    return result
  }, [cwd])

  const toggle = useCallback(async (id: string) => {
    if (!cwd) return
    const result = await window.electronAPI.toggleTask(cwd, id)
    if (result.success && result.tasks) setTasks(result.tasks)
  }, [cwd])

  const remove = useCallback(async (id: string) => {
    if (!cwd) return
    const result = await window.electronAPI.removeTask(cwd, id)
    if (result.success && result.tasks) setTasks(result.tasks)
  }, [cwd])

  return { tasks, refresh, add, toggle, remove }
}
