import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import type { NoteRecord } from './store'
import type { GitStatus } from '../port-scanner/git-status'

const START = '<!-- vibestatus:start -->'
const END = '<!-- vibestatus:end -->'
const SECTION_RE = /\n*<!-- vibestatus:start -->[\s\S]*?<!-- vibestatus:end -->\n*/

const CONFIG_FILES = [
  'CLAUDE.md',
  '.claude/CLAUDE.md',
  '.cursorrules',
  '.windsurfrules',
  '.github/copilot-instructions.md'
]

function buildFencedContent(note: NoteRecord, git: GitStatus | null): string {
  const lines = [
    START,
    '<!-- DO NOT EDIT — managed by Localhost Bar -->',
    '',
    '## Developer Note',
    '',
    note.text,
    ''
  ]

  if (git) {
    lines.push('### Context (auto-generated)')
    lines.push(`- Branch: ${git.branch}`)
    lines.push(`- Uncommitted changes: ${git.changes}`)
    if (git.lastCommit) {
      lines.push(`- Last commit: "${git.lastCommit}"`)
    }
    lines.push(`- Updated: ${new Date(note.updatedAt).toISOString()}`)
    lines.push('')
  }

  lines.push(END)
  return lines.join('\n')
}

function updateFile(filePath: string, fencedBlock: string): void {
  let content = readFileSync(filePath, 'utf-8')

  if (SECTION_RE.test(content)) {
    content = content.replace(SECTION_RE, '\n\n' + fencedBlock + '\n')
  } else {
    content = content.trimEnd() + '\n\n' + fencedBlock + '\n'
  }

  writeFileSync(filePath, content)
}

function removeFromFile(filePath: string): void {
  let content = readFileSync(filePath, 'utf-8')
  if (SECTION_RE.test(content)) {
    content = content.replace(SECTION_RE, '\n')
    writeFileSync(filePath, content)
  }
}

export function writeNoteToConfigs(
  cwd: string,
  note: NoteRecord,
  git: GitStatus | null
): string[] {
  const fenced = buildFencedContent(note, git)
  const written: string[] = []

  for (const rel of CONFIG_FILES) {
    const abs = join(cwd, rel)
    try {
      if (existsSync(abs)) {
        updateFile(abs, fenced)
      } else {
        // Create the file (and parent dirs) with just the fenced section
        mkdirSync(dirname(abs), { recursive: true })
        writeFileSync(abs, fenced + '\n')
      }
      written.push(rel)
    } catch (err) {
      console.error(`[vibestatus] Failed to write ${abs}:`, err)
    }
  }

  return written
}

function isOnlyVibestatus(content: string): boolean {
  const stripped = content.replace(SECTION_RE, '').trim()
  return stripped === ''
}

export function clearNoteFromConfigs(cwd: string): void {
  for (const rel of CONFIG_FILES) {
    const abs = join(cwd, rel)
    if (!existsSync(abs)) continue
    try {
      const content = readFileSync(abs, 'utf-8')
      if (isOnlyVibestatus(content)) {
        // We created this file — delete it entirely
        unlinkSync(abs)
      } else {
        removeFromFile(abs)
      }
    } catch {
      // best-effort
    }
  }
}
