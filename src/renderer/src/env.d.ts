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
  target: DeployTarget
  installedCLIs: { vercel: boolean; railway: boolean; netlify: boolean }
  lastDeploy: DeployRecord | null
}

interface DayProject {
  cwd: string
  name: string
  commits: number
  lines: number
}

interface DayActivity {
  date: string
  commits: number
  lines: number
  tokens: number
  projects: DayProject[]
}

interface ProjectRef {
  cwd: string
  name: string
}

interface DailyStats {
  commitsToday: number
  linesChangedToday: number
  tokensToday: number
  activeProjects: number
  streakDays: number
  history: DayActivity[]
}

interface TokenStats {
  claudeDesktop: { tokens: number } | null
  cursor: { aiEdits: number; aiLines: number; avgAiPercent: number } | null
  claudeCode: { prompts: number; sessions: number } | null
}

type AiToolId = 'cursor' | 'claude' | 'codex'

interface AiProjectSession {
  tool: AiToolId
  sessionId: string
  cwd: string
  title?: string
  lastActiveAt: number
  messageCount?: number
  gitBranch?: string
  isActive: boolean
}

interface AiProject {
  cwd: string
  name: string
  tools: AiToolId[]
  sessions: AiProjectSession[]
  lastActiveAt: number
  isActive: boolean
  hasRunningServer: boolean
}

interface DeployProgress {
  cwd: string
  status: 'deploying' | 'success' | 'error'
  url?: string
  output?: string
}

interface AppSettings {
  notificationsEnabled: boolean
  launchAtLogin: boolean
  pins: string[]
  renames: Record<string, string>
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
  getDailyStats: (projects: ProjectRef[]) => Promise<DailyStats>
  getTokenStats: () => Promise<TokenStats>
  getAiProjects: (runningCwds?: string[]) => Promise<AiProject[]>
  resumeAiSession: (tool: AiToolId, sessionId: string, cwd: string) => Promise<{ success: boolean; error?: string }>
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

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
