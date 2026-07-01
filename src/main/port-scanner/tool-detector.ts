import { existsSync } from 'fs'
import { join } from 'path'

const cache = new Map<string, { tools: string[]; expiry: number }>()
const TTL = 30_000

const MARKERS: [string, string][] = [
  ['.cursor', 'cursor'],
  ['.claude', 'claude'],
  ['CLAUDE.md', 'claude'],
  ['.windsurf', 'windsurf'],
  ['.codex', 'codex'],
  ['.github/copilot-instructions.md', 'copilot'],
  ['.aider.chat.history.md', 'aider'],
  ['.bolt', 'bolt'],
  ['.lovable', 'lovable']
]

export function detectOriginTools(cwd: string | null): string[] {
  if (!cwd) return []

  const cached = cache.get(cwd)
  if (cached && Date.now() < cached.expiry) return cached.tools

  const tools: string[] = []
  for (const [marker, id] of MARKERS) {
    if (existsSync(join(cwd, marker))) {
      if (!tools.includes(id)) tools.push(id)
    }
  }

  cache.set(cwd, { tools, expiry: Date.now() + TTL })
  return tools
}
