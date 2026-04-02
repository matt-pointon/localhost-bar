import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'

export interface TaskItem {
  id: string
  text: string
  done: boolean
  createdAt: number
}

export interface TaskRecord {
  cwd: string
  tasks: TaskItem[]
  updatedAt: number
}

const storePath = join(app.getPath('userData'), 'tasks.json')

function read(): Record<string, TaskRecord> {
  if (!existsSync(storePath)) {
    // Migrate from old notes.json if it exists
    const notesPath = join(app.getPath('userData'), 'notes.json')
    if (existsSync(notesPath)) {
      try {
        const raw = JSON.parse(readFileSync(notesPath, 'utf-8'))
        return migrate(raw)
      } catch {
        return {}
      }
    }
    return {}
  }
  try {
    const raw = JSON.parse(readFileSync(storePath, 'utf-8'))
    return migrate(raw)
  } catch {
    return {}
  }
}

function migrate(data: Record<string, unknown>): Record<string, TaskRecord> {
  const result: Record<string, TaskRecord> = {}
  for (const [cwd, record] of Object.entries(data)) {
    const r = record as Record<string, unknown>
    if ('text' in r && !('tasks' in r)) {
      // Old NoteRecord format — convert to single task
      result[cwd] = {
        cwd,
        tasks: [{
          id: randomUUID(),
          text: String(r.text),
          done: false,
          createdAt: (r.updatedAt as number) ?? Date.now()
        }],
        updatedAt: (r.updatedAt as number) ?? Date.now()
      }
    } else {
      result[cwd] = r as TaskRecord
    }
  }
  return result
}

function write(data: Record<string, TaskRecord>): void {
  writeFileSync(storePath, JSON.stringify(data, null, 2))
}

export function getTasks(cwd: string): TaskRecord | null {
  return read()[cwd] ?? null
}

export function getAllTasks(): Record<string, TaskRecord> {
  return read()
}

export function addTask(cwd: string, text: string): TaskItem {
  const data = read()
  const item: TaskItem = {
    id: randomUUID(),
    text: text.slice(0, 200),
    done: false,
    createdAt: Date.now()
  }
  if (data[cwd]) {
    data[cwd].tasks.push(item)
    data[cwd].updatedAt = Date.now()
  } else {
    data[cwd] = { cwd, tasks: [item], updatedAt: Date.now() }
  }
  write(data)
  return item
}

export function toggleTask(cwd: string, taskId: string): void {
  const data = read()
  const record = data[cwd]
  if (!record) return
  const task = record.tasks.find(t => t.id === taskId)
  if (task) {
    task.done = !task.done
    record.updatedAt = Date.now()
    write(data)
  }
}

export function removeTask(cwd: string, taskId: string): void {
  const data = read()
  const record = data[cwd]
  if (!record) return
  record.tasks = record.tasks.filter(t => t.id !== taskId)
  record.updatedAt = Date.now()
  if (record.tasks.length === 0) {
    delete data[cwd]
  }
  write(data)
}

export function clearTasks(cwd: string): void {
  const data = read()
  delete data[cwd]
  write(data)
}

/**
 * Sync from parsed config file tasks back into the store.
 * - Updates done-state for existing tasks (matched by text)
 * - Imports new tasks added by AI agents
 * Returns true if any tasks were updated or added.
 */
export function syncFromConfig(
  cwd: string,
  parsedTasks: Array<{ text: string; done: boolean }>
): boolean {
  const data = read()
  let record = data[cwd]

  // If no record exists but there are parsed tasks, the AI added tasks
  // to a config file for a project that had no tasks yet
  if (!record && parsedTasks.length === 0) return false
  if (!record) {
    record = { cwd, tasks: [], updatedAt: Date.now() }
    data[cwd] = record
  }

  let changed = false

  for (const parsed of parsedTasks) {
    const stored = record.tasks.find(t => t.text === parsed.text)
    if (stored) {
      // Update done state
      if (stored.done !== parsed.done) {
        stored.done = parsed.done
        changed = true
      }
    } else {
      // New task added by AI — import it
      record.tasks.push({
        id: randomUUID(),
        text: parsed.text,
        done: parsed.done,
        createdAt: Date.now()
      })
      changed = true
    }
  }

  if (changed) {
    record.updatedAt = Date.now()
    write(data)
  }

  return changed
}
