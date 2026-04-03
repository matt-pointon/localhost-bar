import { contextBridge, ipcRenderer } from 'electron'

export type ToolCategory = 'editor' | 'terminal' | 'ai' | 'other'
export type DeployTarget = 'vercel' | 'railway' | 'netlify'

export interface ToolAuth {
  loggedIn: boolean
  email?: string
  plan?: string
}

export interface DetectedTool {
  id: string
  name: string
  category: ToolCategory
  available: boolean
  hasCli: boolean
  auth?: ToolAuth
}

export interface DeployRecord {
  cwd: string
  target: DeployTarget
  url: string
  timestamp: number
}

export interface DeployInfo {
  target: DeployTarget
  installedCLIs: { vercel: boolean; railway: boolean; netlify: boolean }
  lastDeploy: DeployRecord | null
}

export interface DeployProgress {
  cwd: string
  status: 'deploying' | 'success' | 'error'
  url?: string
  output?: string
}

export interface TaskItem {
  id: string
  text: string
  done: boolean
  createdAt: number
}

export interface TaskRecord {
  cwd: string
  tasks: TaskItem[]
  updatedAt: number
}

export interface GitStatus {
  branch: string
  changes: number
  lastCommit: string
}

export interface ServiceInfo {
  pid: number
  port: number
  name: string
  command: string
  address: string
  status: 'running'
  cwd: string | null
  args: string | null
  git: GitStatus | null
}

export interface GitActionResult {
  success: boolean
  error?: string
  url?: string
}

export interface DailyStats {
  commitsToday: number
  linesChangedToday: number
  activeProjects: number
  streakDays: number
}

export interface GitInfo {
  ghInstalled: boolean
  defaultBranch: string | null
}

export interface ElectronAPI {
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
  gitCommit: (cwd: string, message: string) => Promise<GitActionResult>
  gitPull: (cwd: string) => Promise<GitActionResult>
  gitCreatePR: (cwd: string) => Promise<GitActionResult>
  gitGetInfo: (cwd: string) => Promise<GitInfo>
  taskGetAll: () => Promise<Record<string, TaskRecord>>
  taskAdd: (cwd: string, text: string) => Promise<{ success: boolean; task?: TaskItem }>
  taskToggle: (cwd: string, taskId: string) => Promise<{ success: boolean }>
  taskRemove: (cwd: string, taskId: string) => Promise<{ success: boolean }>
  taskClear: (cwd: string) => Promise<{ success: boolean }>
  taskSync: (cwd: string) => Promise<{ changed: boolean; tasks?: TaskItem[] }>
  getDailyStats: (cwds: string[]) => Promise<DailyStats>
}

contextBridge.exposeInMainWorld('electronAPI', {
  scanPorts: () => ipcRenderer.invoke('ports:scan'),
  killProcess: (pid: number) => ipcRenderer.invoke('ports:kill', pid),
  openInBrowser: (port: number) => ipcRenderer.invoke('shell:openExternal', `http://localhost:${port}`),
  quit: () => ipcRenderer.invoke('app:quit'),
  restartService: (args: string, cwd: string) => ipcRenderer.invoke('app:restart-service', { args, cwd }),
  openFolder: (folderPath: string) => ipcRenderer.invoke('shell:openFolder', folderPath),
  getAvailableTools: () => ipcRenderer.invoke('app:get-available-tools'),
  openWith: (action: string, cwd: string) => ipcRenderer.invoke('app:open-with', { action, cwd }),
  openUrl: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  deployGetInfo: (cwd: string) => ipcRenderer.invoke('deploy:get-info', cwd),
  deployRun: (cwd: string, target: string) => ipcRenderer.invoke('deploy:run', { cwd, target }),
  gitCommit: (cwd: string, message: string) => ipcRenderer.invoke('git:commit', { cwd, message }),
  gitPull: (cwd: string) => ipcRenderer.invoke('git:pull', { cwd }),
  gitCreatePR: (cwd: string) => ipcRenderer.invoke('git:create-pr', { cwd }),
  gitGetInfo: (cwd: string) => ipcRenderer.invoke('git:info', { cwd }),
  onDeployProgress: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, data: DeployProgress) => callback(data)
    ipcRenderer.on('deploy:progress', handler)
    return () => ipcRenderer.off('deploy:progress', handler)
  },
  taskGetAll: () => ipcRenderer.invoke('tasks:get-all'),
  taskAdd: (cwd: string, text: string) => ipcRenderer.invoke('tasks:add', { cwd, text }),
  taskToggle: (cwd: string, taskId: string) => ipcRenderer.invoke('tasks:toggle', { cwd, taskId }),
  taskRemove: (cwd: string, taskId: string) => ipcRenderer.invoke('tasks:remove', { cwd, taskId }),
  taskClear: (cwd: string) => ipcRenderer.invoke('tasks:clear', cwd),
  taskSync: (cwd: string) => ipcRenderer.invoke('tasks:sync', cwd),
  getDailyStats: (cwds: string[]) => ipcRenderer.invoke('stats:get-daily', cwds)
} satisfies ElectronAPI)
