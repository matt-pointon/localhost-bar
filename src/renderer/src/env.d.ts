/// <reference types="vite/client" />

type DevTool = 'cursor' | 'claude' | 'windsurf' | 'copilot' | 'codex' | 'aider'
type DeployTarget = 'vercel' | 'railway' | 'netlify'

interface GitStatus {
  branch: string
  changes: number
  lastCommit: string
}

interface ServiceInfo {
  pid: number
  port: number
  name: string
  command: string
  address: string
  status: 'running' | 'stopping' | 'exiting'
  tools: DevTool[]
  cwd: string | null
  args: string | null
  git: GitStatus | null
}

interface InstalledTools {
  vscode: boolean
  cursor: boolean
  windsurf: boolean
  claude: boolean
  iterm2: boolean
}

interface DeployRecord {
  cwd: string
  target: DeployTarget
  url: string
  timestamp: number
}

interface DeployInfo {
  target: DeployTarget
  installedCLIs: { vercel: boolean; railway: boolean; netlify: boolean }
  lastDeploy: DeployRecord | null
}

interface DeployProgress {
  cwd: string
  status: 'deploying' | 'success' | 'error'
  url?: string
  output?: string
}

interface ElectronAPI {
  scanPorts: () => Promise<ServiceInfo[]>
  killProcess: (pid: number) => Promise<{ success: boolean; error?: string }>
  openInBrowser: (port: number) => Promise<void>
  quit: () => Promise<void>
  restartService: (args: string, cwd: string) => Promise<{ success: boolean; error?: string }>
  openFolder: (folderPath: string) => Promise<{ success: boolean }>
  getInstalledTools: () => Promise<InstalledTools>
  openWith: (action: string, cwd: string) => Promise<{ success: boolean; error?: string }>
  openUrl: (url: string) => Promise<void>
  deployGetInfo: (cwd: string) => Promise<DeployInfo>
  deployRun: (cwd: string, target: DeployTarget) => Promise<void>
  onDeployProgress: (callback: (data: DeployProgress) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
