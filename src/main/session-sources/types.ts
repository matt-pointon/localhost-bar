export type AiToolId = 'cursor' | 'claude' | 'codex'

export interface AiProjectSession {
  tool: AiToolId
  sessionId: string
  cwd: string
  title?: string
  lastActiveAt: number
  messageCount?: number
  gitBranch?: string
  isActive: boolean
}

export interface AiProject {
  cwd: string
  name: string
  tools: AiToolId[]
  sessions: AiProjectSession[]
  lastActiveAt: number
  isActive: boolean
  /** true if a matching running ServiceInfo cwd exists (filled by aggregator or left false in readers) */
  hasRunningServer: boolean
}
