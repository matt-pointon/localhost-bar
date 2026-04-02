import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import type { TaskRecord } from './store'
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

function buildFencedContent(record: TaskRecord, git: GitStatus | null): string {
  const lines = [
    START,
    '<!-- Managed by Localhost Bar — MARK TASKS DONE by changing [ ] to [x] when you complete them. You may ADD new tasks as \"- [ ] task text\" lines. Do not remove or reword existing tasks. -->',
    '',
    '## Project Tasks',
    ''
  ]

  for (const task of record.tasks) {
    lines.push(`- [${task.done ? 'x' : ' '}] ${task.text}`)
  }

  if (git) {
    lines.push('')
    lines.push('### Context (auto-generated)')
    lines.push(`- Branch: ${git.branch}`)
    lines.push(`- Uncommitted changes: ${git.changes}`)
    if (git.lastCommit) {
      lines.push(`- Last commit: "${git.lastCommit}"`)
    }
    lines.push(`- Updated: ${new Date(record.updatedAt).toISOString()}`)
  }

  lines.push('')
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

function isOnlyVibestatus(content: string): boolean {
  const stripped = content.replace(SECTION_RE, '').trim()
  return stripped === ''
}

export function writeTasksToConfigs(
  cwd: string,
  record: TaskRecord,
  git: GitStatus | null
): string[] {
  if (record.tasks.length === 0) {
    clearTasksFromConfigs(cwd)
    return []
  }

  const fenced = buildFencedContent(record, git)
  const written: string[] = []

  for (const rel of CONFIG_FILES) {
    const abs = join(cwd, rel)
    try {
      if (existsSync(abs)) {
        updateFile(abs, fenced)
      } else {
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

export function clearTasksFromConfigs(cwd: string): void {
  for (const rel of CONFIG_FILES) {
    const abs = join(cwd, rel)
    if (!existsSync(abs)) continue
    try {
      const content = readFileSync(abs, 'utf-8')
      if (isOnlyVibestatus(content)) {
        unlinkSync(abs)
      } else {
        removeFromFile(abs)
      }
    } catch {
      // best-effort
    }
  }
}
