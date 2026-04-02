import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

export interface NoteRecord {
  cwd: string
  text: string
  updatedAt: number
}

const storePath = join(app.getPath('userData'), 'notes.json')

function read(): Record<string, NoteRecord> {
  if (!existsSync(storePath)) return {}
  try {
    return JSON.parse(readFileSync(storePath, 'utf-8'))
  } catch {
    return {}
  }
}

function write(data: Record<string, NoteRecord>): void {
  writeFileSync(storePath, JSON.stringify(data, null, 2))
}

export function getNote(cwd: string): NoteRecord | null {
  return read()[cwd] ?? null
}

export function setNote(record: NoteRecord): void {
  const data = read()
  data[record.cwd] = record
  write(data)
}

export function deleteNote(cwd: string): void {
  const data = read()
  delete data[cwd]
  write(data)
}

export function getAllNotes(): Record<string, NoteRecord> {
  return read()
}
