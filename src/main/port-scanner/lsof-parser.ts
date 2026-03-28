import { execSync } from 'child_process'

export interface RawPortEntry {
  pid: number
  command: string
  port: number
  address: string
}

const DEV_PORT_MIN = 1024
const DEV_PORT_MAX = 9999

// Only show processes running through a known dev runtime
const DEV_COMMAND_ALLOWLIST = new Set([
  'node', 'bun', 'deno',
  'python', 'python3', 'python2',
  'ruby', 'php', 'java', 'go',
  'vite', 'next-se', 'cargo', 'pnpm',
  'npx', 'yarn', 'uvicorn', 'gunicorn',
  'rails', 'flask', 'django-adm'
])

export function runLsof(): RawPortEntry[] {
  let stdout: string
  try {
    stdout = execSync('lsof -nP -iTCP -sTCP:LISTEN', {
      timeout: 3000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
  } catch {
    return []
  }

  const entries: RawPortEntry[] = []
  const lines = stdout.trim().split('\n').slice(1) // Skip header

  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 9) continue

    const command = parts[0]
    const pid = parseInt(parts[1], 10)
    // lsof appends "(LISTEN)" as a separate token — the address:port is second-to-last
    const rawName = parts[parts.length - 1]
    const name = rawName === '(LISTEN)' ? parts[parts.length - 2] : rawName

    if (!DEV_COMMAND_ALLOWLIST.has(command)) continue
    if (isNaN(pid)) continue

    const colonIdx = name.lastIndexOf(':')
    if (colonIdx === -1) continue

    const port = parseInt(name.slice(colonIdx + 1), 10)
    const address = name.slice(0, colonIdx)

    if (isNaN(port)) continue
    if (port < DEV_PORT_MIN || port > DEV_PORT_MAX) continue

    // Deduplicate: same PID+port can appear for both IPv4 and IPv6
    const alreadyExists = entries.some(e => e.pid === pid && e.port === port)
    if (!alreadyExists) {
      entries.push({ pid, command, port, address })
    }
  }

  return entries
}
