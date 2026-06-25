import { execSync } from 'child_process'
import { basename } from 'path'

const COMMAND_DISPLAY_NAMES: Record<string, string> = {
  node: 'Node.js',
  bun: 'Bun',
  deno: 'Deno',
  python: 'Python',
  python3: 'Python',
  ruby: 'Ruby',
  php: 'PHP',
  java: 'Java',
  go: 'Go',
  'next-se': 'Next.js',
  vite: 'Vite',
  cargo: 'Rust'
}

export interface ProcessInfo {
  name: string
  command: string
  cwd: string | null
  args: string | null
}

export function inferProcessInfo(pid: number, rawCommand: string): ProcessInfo {
  const cwd = getProcessCwd(pid)
  const args = getProcessArgs(pid)

  // Priority 1: basename of the working directory
  if (cwd) {
    const dirName = basename(cwd)
    if (dirName && dirName !== '/' && dirName !== 'root' && dirName !== 'home') {
      return {
        name: formatName(dirName),
        command: COMMAND_DISPLAY_NAMES[rawCommand] ?? rawCommand,
        cwd,
        args
      }
    }
  }

  // Priority 2: extract project name from process args
  const argsName = getNameFromArgs(args)
  if (argsName) {
    return {
      name: argsName,
      command: COMMAND_DISPLAY_NAMES[rawCommand] ?? rawCommand,
      cwd,
      args
    }
  }

  // Fallback: use the command name
  return {
    name: COMMAND_DISPLAY_NAMES[rawCommand] ?? formatName(rawCommand),
    command: rawCommand,
    cwd,
    args
  }
}

function getProcessCwd(pid: number): string | null {
  try {
    const out = execSync(`lsof -a -p ${pid} -d cwd -Fn`, {
      timeout: 1000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    const match = out.match(/\nn(.+)/)
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}

function getProcessArgs(pid: number): string | null {
  try {
    return execSync(`ps -p ${pid} -o args=`, {
      timeout: 500,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim() || null
  } catch {
    return null
  }
}

function getNameFromArgs(args: string | null): string | null {
  if (!args) return null
  // Find project-like path segments before node_modules/dist/build
  const matches = args.match(/([/\w\-.]+?)(?:\/node_modules|\/dist|\/build|\s|$)/g)
  if (matches) {
    const longest = matches.sort((a, b) => b.length - a.length)[0]
    const segments = longest.split('/').filter(
      s => s && !['node_modules', 'bin', '.bin', 'usr', 'local', 'lib', 'opt'].includes(s)
    )
    if (segments.length > 0) {
      return formatName(segments[segments.length - 1])
    }
  }
  return null
}

function formatName(s: string): string {
  // "my-cool-app" → "My Cool App", "workshopapp" → "Workshopapp"
  return s
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
