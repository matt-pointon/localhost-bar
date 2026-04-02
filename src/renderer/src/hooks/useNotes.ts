import { useState, useEffect, useCallback } from 'react'

export function useNotes(cwds: string[]) {
  const [notes, setNotes] = useState<Map<string, string>>(new Map())

  // Load all notes once on mount, then refresh when cwds change
  useEffect(() => {
    window.electronAPI.noteGetAll().then(all => {
      const map = new Map<string, string>()
      for (const [cwd, record] of Object.entries(all)) {
        map.set(cwd, record.text)
      }
      setNotes(map)
    })
  }, [cwds.join(',')])

  const saveNote = useCallback(async (cwd: string, text: string) => {
    await window.electronAPI.noteSave(cwd, text)
    setNotes(prev => {
      const next = new Map(prev)
      next.set(cwd, text)
      return next
    })
  }, [])

  const clearNote = useCallback(async (cwd: string) => {
    await window.electronAPI.noteClear(cwd)
    setNotes(prev => {
      const next = new Map(prev)
      next.delete(cwd)
      return next
    })
  }, [])

  return { notes, saveNote, clearNote }
}
