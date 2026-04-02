import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const START = '<!-- vibestatus:start -->'
const END = '<!-- vibestatus:end -->'
const TASK_LINE_RE = /^- \[([ x])\] (.+)$/

const CONFIG_FILES = [
  'CLAUDE.md',
  '.claude/CLAUDE.md',
  '.cursorrules',
  '.windsurfrules',
  '.github/copilot-instructions.md'
]

interface ParsedTask {
  text: string
  done: boolean
}

/**
 * Reads the first config file that contains a vibestatus section
 * and parses the task checklist from it. Returns null if no section found.
 */
export function readTasksFromConfigs(cwd: string): ParsedTask[] | null {
  for (const rel of CONFIG_FILES) {
    const abs = join(cwd, rel)
    if (!existsSync(abs)) continue

    try {
      const content = readFileSync(abs, 'utf-8')
      const startIdx = content.indexOf(START)
      const endIdx = content.indexOf(END)
      if (startIdx === -1 || endIdx === -1) continue

      const section = content.slice(startIdx + START.length, endIdx)
      const tasks: ParsedTask[] = []

      for (const line of section.split('\n')) {
        const match = line.trim().match(TASK_LINE_RE)
        if (match) {
          tasks.push({
            text: match[2],
            done: match[1] === 'x'
          })
        }
      }

      if (tasks.length > 0) return tasks
    } catch {
      continue
    }
  }

  return null
}
