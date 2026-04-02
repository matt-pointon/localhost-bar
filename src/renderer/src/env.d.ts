/// <reference types="vite/client" />

type ToolCategory = 'editor' | 'terminal' | 'ai' | 'other'
type DeployTarget = 'vercel' | 'railway' | 'netlify'

interface ToolAuth {
  loggedIn: boolean
  email?: string
  plan?: string
}

interface DetectedTool {
  id: string
  name: string
  category: ToolCategory
  available: boolean
  hasCli: boolean
  auth?: ToolAuth
}

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
  cwd: string | null
  args: string | null
  git: GitStatus | null
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

interface TaskItem {
  id: string
  text: string
  done: boolean
  createdAt: number
}

interface TaskRecord {
  cwd: string
  tasks: TaskItem[]
  updatedAt: number
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
  getAvailableTools: () => Promise<DetectedTool[]>
  openWith: (action: string, cwd: string) => Promise<{ success: boolean; error?: string }>
  openUrl: (url: string) => Promise<void>
  deployGetInfo: (cwd: string) => Promise<DeployInfo>
  deployRun: (cwd: string, target: DeployTarget) => Promise<void>
  onDeployProgress: (callback: (data: DeployProgress) => void) => () => void
  taskGetAll: () => Promise<Record<string, TaskRecord>>
  taskAdd: (cwd: string, text: string) => Promise<{ success: boolean; task?: TaskItem }>
  taskToggle: (cwd: string, taskId: string) => Promise<{ success: boolean }>
  taskRemove: (cwd: string, taskId: string) => Promise<{ success: boolean }>
  taskClear: (cwd: string) => Promise<{ success: boolean }>
  taskSync: (cwd: string) => Promise<{ changed: boolean; tasks?: TaskItem[] }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
