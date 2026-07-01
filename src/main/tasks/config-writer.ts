import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import type { Task } from './store'

const START = '<!-- vibestatus:start -->'
const END = '<!-- vibestatus:end -->'

const CONFIG_TARGETS = [
  'CLAUDE.md',
  '.claude/CLAUDE.md',
  '.cursorrules',
  '.windsurfrules',
  '.github/copilot-instructions.md'
]

function formatSection(tasks: Task[], git: { branch: string; changes: number; lastCommit: string } | null): string {
  const lines = [
    START,
    '<!-- DO NOT EDIT — managed by Localhost Bar -->',
    '',
    '## Project Tasks',
    ''
  ]
  if (tasks.length === 0) {
    lines.push('_No tasks yet._')
  } else {
    for (const t of tasks) {
      lines.push(`- [${t.done ? 'x' : ' '}] ${t.text}`)
    }
  }
  lines.push('')
  lines.push('### Context (auto-generated)')
  if (git) {
    lines.push(`- Branch: ${git.branch}`)
    lines.push(`- Uncommitted changes: ${git.changes}`)
    lines.push(`- Last commit: "${git.lastCommit}"`)
  }
  lines.push(`- Updated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push(END)
  return lines.join('\n')
}

function stripSection(content: string): string {
  const startIdx = content.indexOf(START)
  const endIdx = content.indexOf(END)
  if (startIdx === -1 || endIdx === -1) return content
  const before = content.slice(0, startIdx).trimEnd()
  const after = content.slice(endIdx + END.length).trimStart()
  if (before && after) return `${before}\n\n${after}`
  return before || after || ''
}

function writeTarget(cwd: string, relPath: string, section: string): void {
  const full = join(cwd, relPath)
  const dir = dirname(full)
  let content = ''
  if (existsSync(full)) {
    content = readFileSync(full, 'utf-8')
    content = stripSection(content)
  } else if (relPath.includes('/')) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
  const merged = content ? `${content.trimEnd()}\n\n${section}` : section
  writeFileSync(full, merged + '\n')
}

export function syncTasksToConfig(
  cwd: string,
  tasks: Task[],
  git: { branch: string; changes: number; lastCommit: string } | null
): void {
  const section = formatSection(tasks, git)
  for (const target of CONFIG_TARGETS) {
    const full = join(cwd, target)
    if (existsSync(full) || target === 'CLAUDE.md' || target === '.cursorrules') {
      try {
        writeTarget(cwd, target, section)
      } catch { /* best-effort */ }
    }
  }
}
