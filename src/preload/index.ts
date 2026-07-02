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

export interface GitStatus {
  branch: string
  changes: number
  lastCommit: string
}

export interface ResourceUsage {
  cpu: number
  mem: number
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
  resources: ResourceUsage | null
  stackTags: string[]
  originTools: string[]
  activeAgents: string[]
  pinned: boolean
}

export interface PortConflict {
  port: number
  services: { name: string; pid: number }[]
}

export interface ScanResult {
  services: ServiceInfo[]
  portConflicts: PortConflict[]
}

export interface Task {
  id: string
  text: string
  done: boolean
}

export interface GitActionResult {
  success: boolean
  error?: string
  url?: string
}

export interface ProjectActivity {
  name: string
  cwd: string
  commits: number
  lines: number
}

export interface DayActivity {
  date: string
  commits: number
  lines: number
  projects: ProjectActivity[]
}

export interface ProjectRef {
  cwd: string
  name: string
}

export interface DailyStats {
  commitsToday: number
  linesChangedToday: number
  activeProjects: number
  streakDays: number
  history: DayActivity[]
}

export interface TokenStats {
  claudeDesktop: { tokens: number } | null
  cursor: { aiEdits: number; aiLines: number; avgAiPercent: number } | null
  claudeCode: { prompts: number; sessions: number } | null
}

export interface GitInfo {
  ghInstalled: boolean
  defaultBranch: string | null
}

export interface AppSettings {
  notificationsEnabled: boolean
  launchAtLogin: boolean
  pins: string[]
  renames: Record<string, string>
}

export interface ElectronAPI {
  scanPorts: () => Promise<ScanResult>
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
  getDailyStats: (projects: ProjectRef[]) => Promise<DailyStats>
  getTokenStats: () => Promise<TokenStats>
  shareStats: (height: number) => Promise<{ success: boolean; error?: string }>
  getTasks: (cwd: string) => Promise<Task[]>
  addTask: (cwd: string, text: string) => Promise<{ success: boolean; tasks?: Task[]; error?: string }>
  toggleTask: (cwd: string, id: string) => Promise<{ success: boolean; tasks?: Task[]; error?: string }>
  removeTask: (cwd: string, id: string) => Promise<{ success: boolean; tasks?: Task[]; error?: string }>
  getSettings: () => Promise<AppSettings>
  setNotificationsEnabled: (enabled: boolean) => Promise<AppSettings>
  togglePin: (cwd: string) => Promise<boolean>
  setRename: (cwd: string, name: string) => Promise<{ success: boolean }>
  checkForUpdates: () => Promise<{ success: boolean }>
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
  getDailyStats: (projects: ProjectRef[]) => ipcRenderer.invoke('stats:get-daily', projects),
  getTokenStats: () => ipcRenderer.invoke('stats:get-tokens'),
  shareStats: (height: number) => ipcRenderer.invoke('stats:share', { height }),
  getTasks: (cwd: string) => ipcRenderer.invoke('tasks:get', cwd),
  addTask: (cwd: string, text: string) => ipcRenderer.invoke('tasks:add', { cwd, text }),
  toggleTask: (cwd: string, id: string) => ipcRenderer.invoke('tasks:toggle', { cwd, id }),
  removeTask: (cwd: string, id: string) => ipcRenderer.invoke('tasks:remove', { cwd, id }),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setNotificationsEnabled: (enabled: boolean) => ipcRenderer.invoke('settings:set-notifications', enabled),
  togglePin: (cwd: string) => ipcRenderer.invoke('settings:toggle-pin', cwd),
  setRename: (cwd: string, name: string) => ipcRenderer.invoke('settings:set-rename', { cwd, name }),
  checkForUpdates: () => ipcRenderer.invoke('app:check-updates')
} satisfies ElectronAPI)
