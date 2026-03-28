import { contextBridge, ipcRenderer } from 'electron'

export type DevTool = 'cursor' | 'claude' | 'windsurf' | 'copilot' | 'codex' | 'aider'
export type DeployTarget = 'vercel' | 'railway' | 'netlify'

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

export interface ServiceInfo {
  pid: number
  port: number
  name: string
  command: string
  address: string
  status: 'running'
  tools: DevTool[]
  cwd: string | null
  args: string | null
  git: GitStatus | null
}

export interface InstalledTools {
  vscode: boolean
  cursor: boolean
  windsurf: boolean
  claude: boolean
  iterm2: boolean
}

export interface ElectronAPI {
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

contextBridge.exposeInMainWorld('electronAPI', {
  scanPorts: () => ipcRenderer.invoke('ports:scan'),
  killProcess: (pid: number) => ipcRenderer.invoke('ports:kill', pid),
  openInBrowser: (port: number) => ipcRenderer.invoke('shell:openExternal', `http://localhost:${port}`),
  quit: () => ipcRenderer.invoke('app:quit'),
  restartService: (args: string, cwd: string) => ipcRenderer.invoke('app:restart-service', { args, cwd }),
  openFolder: (folderPath: string) => ipcRenderer.invoke('shell:openFolder', folderPath),
  getInstalledTools: () => ipcRenderer.invoke('app:get-installed-tools'),
  openWith: (action: string, cwd: string) => ipcRenderer.invoke('app:open-with', { action, cwd }),
  openUrl: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  deployGetInfo: (cwd: string) => ipcRenderer.invoke('deploy:get-info', cwd),
  deployRun: (cwd: string, target: string) => ipcRenderer.invoke('deploy:run', { cwd, target }),
  onDeployProgress: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, data: DeployProgress) => callback(data)
    ipcRenderer.on('deploy:progress', handler)
    return () => ipcRenderer.off('deploy:progress', handler)
  }
} satisfies ElectronAPI)
