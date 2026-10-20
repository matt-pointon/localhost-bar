import { readdirSync, readFileSync, statSync } from 'fs'
import { join, basename } from 'path'
import { homedir } from 'os'
import { estimateCost } from './pricing'
import { inferProvider } from './types'
import type { AgentSession } from './types'

// Codex (OpenAI CLI) writes rollout transcripts under ~/.codex/sessions/.../*.jsonl.
// Its schema has shifted between versions, so this reader is deliberately defensive:
// it deep-scans each line for a model id and any token-usage shape it recognizes,
// and still emits a row (with cost "unknown") when only partial data is present.
const SESSIONS_DIR = join(homedir(), '.codex', 'sessions')

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const MAX_FILES = 120

function walkJsonl(dir: string, out: { path: string; mtime: number }[], cutoff: number): void {
  let entries: ReturnType<typeof readdirSync>
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      walkJsonl(path, out, cutoff)
    } else if (entry.name.endsWith('.jsonl')) {
      try {
        const mtime = statSync(path).mtimeMs
        if (mtime >= cutoff) out.push({ path, mtime })
      } catch {
        /* skip */
      }
    }
  }
}

function num(v: unknown): number {
  return typeof v === 'number' && isFinite(v) ? v : 0
}

function findModel(obj: unknown, depth = 0): string | null {
  if (!obj || typeof obj !== 'object' || depth > 6) return null
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === 'model' && typeof value === 'string' && value) return value
    if (value && typeof value === 'object') {
      const found = findModel(value, depth + 1)
      if (found) return found
    }
  }
  return null
}

function findCwd(obj: unknown, depth = 0): string | null {
  if (!obj || typeof obj !== 'object' || depth > 6) return null
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if ((key === 'cwd' || key === 'workdir') && typeof value === 'string' && value) return value
    if (value && typeof value === 'object') {
      const found = findCwd(value, depth + 1)
      if (found) return found
    }
  }
  return null
}

interface Usage {
  input: number
  output: number
  cacheRead: number
}

// Returns a cumulative usage snapshot if the object looks like a total, else null.
function findTotalUsage(obj: unknown, depth = 0): Usage | null {
  if (!obj || typeof obj !== 'object' || depth > 6) return null
  const rec = obj as Record<string, unknown>
  const total = rec.total_token_usage as Record<string, unknown> | undefined
  if (total && (typeof total.input_tokens === 'number' || typeof total.output_tokens === 'number')) {
    return {
      input: num(total.input_tokens),
      output: num(total.output_tokens),
      cacheRead: num(total.cached_input_tokens) || num(total.cache_read_input_tokens)
    }
  }
  for (const value of Object.values(rec)) {
    if (value && typeof value === 'object') {
      const found = findTotalUsage(value, depth + 1)
      if (found) return found
    }
  }
  return null
}

function parseRollout(path: string, mtime: number): AgentSession | null {
  let content: string
  try {
    content = readFileSync(path, 'utf8')
  } catch {
    return null
  }

  let model: string | null = null
  let cwd: string | null = null
  let lastRequest = 0
  let requests = 0
  let total: Usage = { input: 0, output: 0, cacheRead: 0 }

  for (const line of content.split('\n')) {
    if (!line.trim()) continue
    let entry: Record<string, unknown>
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }

    model = model ?? findModel(entry)
    cwd = cwd ?? findCwd(entry)

    const ts = typeof entry.timestamp === 'string' ? Date.parse(entry.timestamp) : NaN
    if (!isNaN(ts) && ts > lastRequest) lastRequest = ts

    const usage = findTotalUsage(entry)
    if (usage) {
      // total_token_usage is cumulative, so keep the largest snapshot.
      if (usage.input + usage.output > total.input + total.output) total = usage
      requests++
    }
  }

  if (!model && total.input === 0 && total.output === 0) return null
  if (lastRequest === 0) lastRequest = mtime

  const provider = inferProvider(model)
  const totalTokens = total.input + total.output + total.cacheRead
  return {
    id: basename(path, '.jsonl'),
    source: 'codex',
    sourceLabel: 'Codex',
    project: cwd ? basename(cwd) : null,
    cwd,
    model,
    providerSlug: provider.slug,
    providerName: provider.name,
    lastRequest,
    requests,
    inputTokens: total.input,
    outputTokens: total.output,
    totalTokens,
    estimatedCost: estimateCost(model, {
      input: total.input,
      output: total.output,
      cacheCreate: 0,
      cacheRead: total.cacheRead
    })
  }
}

export function getCodexSessions(): AgentSession[] {
  const files: { path: string; mtime: number }[] = []
  walkJsonl(SESSIONS_DIR, files, Date.now() - MAX_AGE_MS)
  files.sort((a, b) => b.mtime - a.mtime)

  const sessions: AgentSession[] = []
  for (const { path, mtime } of files.slice(0, MAX_FILES)) {
    const session = parseRollout(path, mtime)
    if (session) sessions.push(session)
  }
  return sessions
}
