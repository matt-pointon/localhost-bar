import { readdirSync, readFileSync, statSync } from 'fs'
import { join, basename } from 'path'
import { homedir } from 'os'
import { estimateCost } from './pricing'
import { inferProvider } from './types'
import type { AgentSession } from './types'

// Claude Code writes one JSONL transcript per session under
// ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl. Assistant lines carry the
// model id and a usage object, which is everything we need for a cost estimate.
const PROJECTS_DIR = join(homedir(), '.claude', 'projects')

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const MAX_FILES = 120

interface Accum {
  id: string
  cwd: string | null
  model: string | null
  lastRequest: number
  requests: number
  input: number
  output: number
  cacheCreate: number
  cacheRead: number
}

function listTranscripts(): string[] {
  let projectDirs: string[]
  try {
    projectDirs = readdirSync(PROJECTS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => join(PROJECTS_DIR, d.name))
  } catch {
    return []
  }

  const files: { path: string; mtime: number }[] = []
  const cutoff = Date.now() - MAX_AGE_MS
  for (const dir of projectDirs) {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      continue
    }
    for (const name of entries) {
      if (!name.endsWith('.jsonl')) continue
      const path = join(dir, name)
      try {
        const mtime = statSync(path).mtimeMs
        if (mtime < cutoff) continue
        files.push({ path, mtime })
      } catch {
        continue
      }
    }
  }

  return files
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, MAX_FILES)
    .map(f => f.path)
}

function parseTranscript(path: string): Accum | null {
  let content: string
  try {
    content = readFileSync(path, 'utf8')
  } catch {
    return null
  }

  const acc: Accum = {
    id: basename(path, '.jsonl'),
    cwd: null,
    model: null,
    lastRequest: 0,
    requests: 0,
    input: 0,
    output: 0,
    cacheCreate: 0,
    cacheRead: 0
  }

  for (const line of content.split('\n')) {
    if (!line.trim()) continue
    let entry: Record<string, unknown>
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }

    if (typeof entry.sessionId === 'string') acc.id = entry.sessionId
    if (typeof entry.cwd === 'string') acc.cwd = entry.cwd
    if (typeof entry.timestamp === 'string') {
      const ts = Date.parse(entry.timestamp)
      if (!isNaN(ts) && ts > acc.lastRequest) acc.lastRequest = ts
    }

    if (entry.type !== 'assistant') continue
    const message = entry.message as Record<string, unknown> | undefined
    const usage = message?.usage as Record<string, unknown> | undefined
    if (!usage) continue

    if (typeof message?.model === 'string') acc.model = message.model as string
    acc.requests++
    acc.input += num(usage.input_tokens)
    acc.output += num(usage.output_tokens)
    acc.cacheCreate += num(usage.cache_creation_input_tokens)
    acc.cacheRead += num(usage.cache_read_input_tokens)
  }

  if (acc.requests === 0) return null
  return acc
}

function num(v: unknown): number {
  return typeof v === 'number' && isFinite(v) ? v : 0
}

export function getClaudeCodeSessions(): AgentSession[] {
  const sessions: AgentSession[] = []
  for (const path of listTranscripts()) {
    const acc = parseTranscript(path)
    if (!acc) continue
    const provider = inferProvider(acc.model)
    const totalTokens = acc.input + acc.output + acc.cacheCreate + acc.cacheRead
    sessions.push({
      id: acc.id,
      source: 'claude-code',
      sourceLabel: 'Claude Code',
      project: acc.cwd ? basename(acc.cwd) : null,
      cwd: acc.cwd,
      model: acc.model,
      providerSlug: provider.slug,
      providerName: provider.name,
      lastRequest: acc.lastRequest,
      requests: acc.requests,
      inputTokens: acc.input,
      outputTokens: acc.output,
      totalTokens,
      estimatedCost: estimateCost(acc.model, {
        input: acc.input,
        output: acc.output,
        cacheCreate: acc.cacheCreate,
        cacheRead: acc.cacheRead
      })
    })
  }
  return sessions
}
