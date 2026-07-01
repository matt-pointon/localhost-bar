import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { syncTasksToConfig } from './config-writer'

export interface Task {
  id: string
  text: string
  done: boolean
}

export interface TaskStore {
  tasks: Task[]
}

function storePath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'tasks.json')
}

function readAll(): Record<string, TaskStore> {
  try {
    return JSON.parse(readFileSync(storePath(), 'utf-8'))
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, TaskStore>): void {
  writeFileSync(storePath(), JSON.stringify(data, null, 2))
}

export function getTasks(cwd: string): Task[] {
  return readAll()[cwd]?.tasks ?? []
}

export function setTasks(cwd: string, tasks: Task[], git?: { branch: string; changes: number; lastCommit: string } | null): void {
  const all = readAll()
  all[cwd] = { tasks }
  writeAll(all)
  syncTasksToConfig(cwd, tasks, git ?? null)
}

export function addTask(cwd: string, text: string, git?: { branch: string; changes: number; lastCommit: string } | null): Task {
  const tasks = getTasks(cwd)
  const task: Task = { id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, text, done: false }
  setTasks(cwd, [...tasks, task], git)
  return task
}

export function toggleTask(cwd: string, id: string, git?: { branch: string; changes: number; lastCommit: string } | null): Task[] {
  const tasks = getTasks(cwd).map(t => t.id === id ? { ...t, done: !t.done } : t)
  setTasks(cwd, tasks, git)
  return tasks
}

export function removeTask(cwd: string, id: string, git?: { branch: string; changes: number; lastCommit: string } | null): Task[] {
  const tasks = getTasks(cwd).filter(t => t.id !== id)
  setTasks(cwd, tasks, git)
  return tasks
}
