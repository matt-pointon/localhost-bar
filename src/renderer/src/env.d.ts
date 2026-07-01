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

interface ResourceUsage {
  cpu: number
  mem: number
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
  resources: ResourceUsage | null
  stackTags: string[]
  originTools: string[]
  activeAgents: string[]
  pinned: boolean
}

interface PortConflict {
  port: number
  services: { name: string; pid: number }[]
}

interface ScanResult {
  services: ServiceInfo[]
  portConflicts: PortConflict[]
}

interface Task {
  id: string
  text: string
  done: boolean
}

interface DeployRecord {
  cwd: string
  target: DeployTarget
  url: string
  timestamp: number
}

interface DeployInfo {
  proRequired?: boolean
  target?: DeployTarget
  installedCLIs?: { vercel: boolean; railway: boolean; netlify: boolean }
  lastDeploy?: DeployRecord | null
  error?: string
}

interface DayActivity {
  date: string
  commits: number
  lines: number
}

interface DailyStats {
  proRequired?: boolean
  commitsToday: number
  linesChangedToday: number
  activeProjects: number
  streakDays: number
  history: DayActivity[]
  error?: string
}

interface TokenStats {
  proRequired?: boolean
  claudeDesktop: { tokens: number } | null
  cursor: { aiEdits: number; aiLines: number; avgAiPercent: number } | null
  claudeCode: { prompts: number; sessions: number } | null
  error?: string
}

interface DeployProgress {
  cwd: string
  status: 'deploying' | 'success' | 'error'
  url?: string
  output?: string
}

interface LicenseStatus {
  isPro: boolean
  email: string | null
  key: string | null
}

interface AppSettings {
  notificationsEnabled: boolean
  launchAtLogin: boolean
  pins: string[]
  renames: Record<string, string>
  licenseKey: string | null
  licenseEmail: string | null
}

interface ElectronAPI {
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
  gitCommit: (cwd: string, message: string) => Promise<{ success: boolean; error?: string; url?: string }>
  gitPull: (cwd: string) => Promise<{ success: boolean; error?: string }>
  gitCreatePR: (cwd: string) => Promise<{ success: boolean; error?: string; url?: string }>
  gitGetInfo: (cwd: string) => Promise<{ ghInstalled: boolean; defaultBranch: string | null }>
  getDailyStats: (cwds: string[]) => Promise<DailyStats>
  getTokenStats: () => Promise<TokenStats>
  shareStats: (height: number) => Promise<{ success: boolean; error?: string }>
  getTasks: (cwd: string) => Promise<Task[]>
  addTask: (cwd: string, text: string) => Promise<{ success: boolean; tasks?: Task[]; error?: string }>
  toggleTask: (cwd: string, id: string) => Promise<{ success: boolean; tasks?: Task[]; error?: string }>
  removeTask: (cwd: string, id: string) => Promise<{ success: boolean; tasks?: Task[]; error?: string }>
  getLicenseStatus: () => Promise<LicenseStatus>
  activateLicense: (key: string) => Promise<{ success: boolean; error?: string; email?: string }>
  deactivateLicense: () => Promise<{ success: boolean }>
  getSettings: () => Promise<AppSettings>
  setNotificationsEnabled: (enabled: boolean) => Promise<AppSettings>
  togglePin: (cwd: string) => Promise<boolean>
  setRename: (cwd: string, name: string) => Promise<{ success: boolean }>
  checkForUpdates: () => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
