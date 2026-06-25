import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Code2, Copy, Download, ExternalLink, Folder, GitCommitHorizontal, GitPullRequest, Globe, Loader2, MoreHorizontal, Rocket, Sparkles, Terminal } from 'lucide-react'
import type { DeployTarget, DeployRecord, DeployInfo, DeployState } from '../hooks/useDeployState'
import type { GitStatus } from '../../../preload/index'

export type ToolCategory = 'editor' | 'terminal' | 'ai' | 'other'

export interface DetectedTool {
  id: string
  name: string
  category: ToolCategory
  available: boolean
  hasCli: boolean
  auth?: {
    loggedIn: boolean
    email?: string
    plan?: string
  }
}

interface QuickActionsMenuProps {
  cwd: string
  tools: DetectedTool[]
  git: GitStatus | null
  deployState?: DeployState
  onDeploy: (cwd: string, target: DeployTarget) => void
  onSetLastDeploy: (cwd: string, record: DeployRecord) => void
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '5px 10px',
  fontSize: 12,
  fontWeight: 500,
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  borderRadius: 5,
  color: 'var(--color-foreground)',
  whiteSpace: 'nowrap'
}

const DEPLOY_LABELS: Record<DeployTarget, string> = {
  vercel: 'Deploy to Vercel',
  railway: 'Deploy to Railway',
  netlify: 'Deploy to Netlify'
}

const TOOL_ICONS: Record<string, (size: number) => React.ReactNode> = {
  finder: (s) => <Folder size={s} />,
  vscode: (s) => <Code2 size={s} />,
  cursor: (s) => <Code2 size={s} />,
  windsurf: (s) => <Code2 size={s} />,
  zed: (s) => <Code2 size={s} />,
  xcode: (s) => <Code2 size={s} />,
  terminal: (s) => <Terminal size={s} />,
  iterm2: (s) => <Terminal size={s} />,
  ghostty: (s) => <Terminal size={s} />,
  warp: (s) => <Terminal size={s} />,
  claude: (s) => <Sparkles size={s} />,
  codex: (s) => <Sparkles size={s} />,
  conductor: (s) => <Sparkles size={s} />,
  'github-desktop': (s) => <Globe size={s} />,
}

function toolLabel(tool: DetectedTool): string {
  if (tool.category === 'terminal') return `Open ${tool.name} here`
  if (tool.category === 'ai') {
    const suffix = tool.auth?.loggedIn === false ? ' (not logged in)' : ''
    return `Open ${tool.name} here${suffix}`
  }
  return `Open in ${tool.name}`
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function hoverOn(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = 'var(--color-accent)'
}
function hoverOff(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = 'transparent'
}

type GitActionState = 'idle' | 'loading' | 'success' | 'error'

export function QuickActionsMenu({ cwd, tools, git, deployState, onDeploy, onSetLastDeploy }: QuickActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0, maxH: 400 })
  const [deployInfo, setDeployInfo] = useState<DeployInfo | null>(null)
  const [gitInfo, setGitInfo] = useState<{ ghInstalled: boolean; defaultBranch: string | null } | null>(null)
  const [commitState, setCommitState] = useState<GitActionState>('idle')
  const [commitMsg, setCommitMsg] = useState('')
  const [showCommitInput, setShowCommitInput] = useState(false)
  const [pullState, setPullState] = useState<GitActionState>('idle')
  const [prState, setPrState] = useState<GitActionState>('idle')
  const [gitError, setGitError] = useState<string | null>(null)
  const commitInputRef = useRef<HTMLInputElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Tools arrive pre-sorted by MRU from main process — render as flat list
  const totalItems = tools.length

  const lastDeploy = deployState?.lastDeploy ?? deployInfo?.lastDeploy ?? null
  const isDeploying = deployState?.status === 'deploying'
  const anyCliInstalled = deployInfo
    ? deployInfo.installedCLIs.vercel || deployInfo.installedCLIs.railway || deployInfo.installedCLIs.netlify
    : true

  const hasGit = git !== null
  const hasChanges = git !== null && git.changes > 0
  const isDefaultBranch = git !== null && gitInfo !== null && git.branch === gitInfo.defaultBranch
  const canCreatePR = hasGit && gitInfo?.ghInstalled && !isDefaultBranch

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const deployRows = 1 + (lastDeploy ? 2 : 0)
      const gitRows = hasGit ? 3 : 0
      const estimatedH = (totalItems + deployRows + gitRows + 2) * 32 + 24
      const maxH = window.innerHeight - 16
      const menuH = Math.min(estimatedH, maxH)
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const spaceAbove = rect.top - 8
      const openAbove = spaceBelow < estimatedH && spaceAbove > spaceBelow
      const rawY = openAbove ? rect.top - menuH - 4 : rect.bottom + 4
      const clampedY = Math.max(8, Math.min(rawY, window.innerHeight - menuH - 8))
      const rawX = rect.right - 220
      const clampedX = Math.max(8, Math.min(rawX, window.innerWidth - 220 - 8))
      setPos({
        x: clampedX,
        y: clampedY,
        maxH
      })
    }
    if (open) {
      setShowCommitInput(false)
      setCommitMsg('')
      setCommitState('idle')
      setPullState('idle')
      setPrState('idle')
      setGitError(null)
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    window.electronAPI.deployGetInfo(cwd).then(info => {
      setDeployInfo(info)
      if (info.lastDeploy) onSetLastDeploy(cwd, info.lastDeploy)
    })
    if (hasGit) {
      window.electronAPI.gitGetInfo(cwd).then(setGitInfo)
    }
  }, [open, cwd, hasGit, onSetLastDeploy])

  useEffect(() => {
    if (showCommitInput && commitInputRef.current) {
      commitInputRef.current.focus()
    }
  }, [showCommitInput])

  const handleCommit = async () => {
    if (!commitMsg.trim()) return
    setCommitState('loading')
    setGitError(null)
    const result = await window.electronAPI.gitCommit(cwd, commitMsg.trim())
    if (result.success) {
      setCommitState('success')
      setCommitMsg('')
      setTimeout(() => { setShowCommitInput(false); setCommitState('idle') }, 1000)
    } else {
      setCommitState('error')
      setGitError(result.error?.split('\n')[0]?.slice(0, 60) ?? 'Commit failed')
    }
  }

  const handlePull = async () => {
    setPullState('loading')
    setGitError(null)
    const result = await window.electronAPI.gitPull(cwd)
    if (result.success) {
      setPullState('success')
      setTimeout(() => setPullState('idle'), 1500)
    } else {
      setPullState('error')
      setGitError(result.error?.split('\n')[0]?.slice(0, 60) ?? 'Pull failed')
    }
  }

  const handleCreatePR = async () => {
    setPrState('loading')
    setGitError(null)
    const result = await window.electronAPI.gitCreatePR(cwd)
    if (result.success) {
      setPrState('success')
      setTimeout(() => { setPrState('idle'); setOpen(false) }, 1500)
    } else {
      setPrState('error')
      setGitError(result.error?.split('\n')[0]?.slice(0, 60) ?? 'PR creation failed')
    }
  }

  useEffect(() => {
  }, [open])

  const run = (actionKey: string) => {
    window.electronAPI.openWith(actionKey, cwd)
    setOpen(false)
  }

  const handleDeploy = () => {
    if (!deployInfo) return
    const { target, installedCLIs } = deployInfo
    const chosen = installedCLIs[target]
      ? target
      : installedCLIs.vercel
        ? 'vercel'
        : installedCLIs.railway
          ? 'railway'
          : 'netlify'
    onDeploy(cwd, chosen)
    setOpen(false)
  }

  const handleNoCliClick = () => {
    window.electronAPI.openUrl('https://vercel.com/docs/cli')
    setOpen(false)
  }

  const handleOpenLastDeploy = () => {
    if (lastDeploy) window.electronAPI.openUrl(lastDeploy.url)
    setOpen(false)
  }

  const handleCopyLastDeploy = () => {
    if (lastDeploy) navigator.clipboard.writeText(lastDeploy.url)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={btnRef}
        title="Quick actions"
        onClick={toggle}
        className="no-drag p-1 rounded transition-colors"
        style={{ color: 'var(--color-muted-foreground)' }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-foreground)'
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--color-hover-overlay)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted-foreground)'
          ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
      >
        <MoreHorizontal size={12} />
      </button>

      {open &&
        createPortal(
          <>
            {/* Backdrop — catches outside clicks */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
              onClick={() => setOpen(false)}
            />
            <div
              className="no-drag"
              style={{
                position: 'fixed',
              left: pos.x,
              top: pos.y,
              width: 220,
              maxHeight: pos.maxH,
              overflowY: 'auto',
              background: 'rgba(8, 8, 8, 0.88)',
              backdropFilter: 'blur(60px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(60px) saturate(1.2)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 10,
              boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.5), inset 0 0.5px 0 rgba(255,255,255,0.06)',
              padding: '4px',
              zIndex: 9999
            }}
          >
            {/* Open in — label + tool list */}
            {tools.length > 0 && (
              <>
                <div style={{
                  padding: '4px 10px 2px',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-muted-foreground)',
                  userSelect: 'none'
                }}>
                  Open in
                </div>
                {tools.map(tool => {
                  const iconFn = TOOL_ICONS[tool.id]
                  return (
                    <button
                      key={tool.id}
                      onClick={() => run(tool.id)}
                      style={menuItemStyle}
                      onMouseEnter={hoverOn}
                      onMouseLeave={hoverOff}
                    >
                      <span style={{ color: 'var(--color-muted-foreground)', display: 'flex' }}>
                        {iconFn ? iconFn(12) : <Code2 size={12} />}
                      </span>
                      {tool.name}
                    </button>
                  )
                })}
              </>
            )}

            {/* Separator before deploy */}
            <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 6px' }} />

            {/* Deploy button */}
            {!anyCliInstalled ? (
              <button
                onClick={handleNoCliClick}
                style={{ ...menuItemStyle, color: 'var(--color-muted-foreground)' }}
                onMouseEnter={hoverOn}
                onMouseLeave={hoverOff}
              >
                <span style={{ display: 'flex' }}><Rocket size={12} /></span>
                Deploy — install CLI first
              </button>
            ) : (
              <button
                onClick={handleDeploy}
                disabled={isDeploying}
                style={{
                  ...menuItemStyle,
                  opacity: isDeploying ? 0.6 : 1,
                  cursor: isDeploying ? 'default' : 'pointer'
                }}
                onMouseEnter={e => { if (!isDeploying) hoverOn(e) }}
                onMouseLeave={hoverOff}
              >
                <span style={{ color: 'var(--color-muted-foreground)', display: 'flex' }}>
                  <Rocket size={12} />
                </span>
                {isDeploying
                  ? 'Deploying…'
                  : deployInfo
                    ? DEPLOY_LABELS[deployInfo.target]
                    : 'Deploy preview'}
              </button>
            )}

            {/* Last deploy row */}
            {lastDeploy && (
              <>
                <button
                  onClick={handleOpenLastDeploy}
                  title={lastDeploy.url}
                  style={{ ...menuItemStyle, color: 'var(--color-muted-foreground)', fontSize: 11 }}
                  onMouseEnter={e => {
                    hoverOn(e)
                    e.currentTarget.style.color = 'var(--color-foreground)'
                  }}
                  onMouseLeave={e => {
                    hoverOff(e)
                    e.currentTarget.style.color = 'var(--color-muted-foreground)'
                  }}
                >
                  <span style={{ display: 'flex', flexShrink: 0 }}><ExternalLink size={11} /></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                    {shortUrl(lastDeploy.url)}
                  </span>
                  <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 10, opacity: 0.6 }}>
                    {timeAgo(lastDeploy.timestamp)}
                  </span>
                </button>
                <button
                  onClick={handleCopyLastDeploy}
                  style={{ ...menuItemStyle, color: 'var(--color-muted-foreground)', fontSize: 11 }}
                  onMouseEnter={e => {
                    hoverOn(e)
                    e.currentTarget.style.color = 'var(--color-foreground)'
                  }}
                  onMouseLeave={e => {
                    hoverOff(e)
                    e.currentTarget.style.color = 'var(--color-muted-foreground)'
                  }}
                >
                  <span style={{ display: 'flex', flexShrink: 0 }}><Copy size={11} /></span>
                  Copy deploy URL
                </button>
              </>
            )}

            {/* Git actions */}
            {hasGit && (
              <>
                <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 6px' }} />

                {/* Commit */}
                {hasChanges && !showCommitInput && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowCommitInput(true) }}
                    disabled={commitState === 'loading'}
                    style={menuItemStyle}
                    onMouseEnter={hoverOn}
                    onMouseLeave={hoverOff}
                  >
                    <span style={{ color: 'var(--color-muted-foreground)', display: 'flex' }}>
                      <GitCommitHorizontal size={12} />
                    </span>
                    Commit {git!.changes} change{git!.changes !== 1 ? 's' : ''}…
                  </button>
                )}

                {showCommitInput && (
                  <div style={{ padding: '4px 6px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        ref={commitInputRef}
                        type="text"
                        value={commitMsg}
                        onChange={e => setCommitMsg(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCommit()
                          if (e.key === 'Escape') { setShowCommitInput(false); setCommitMsg('') }
                        }}
                        placeholder="Commit message…"
                        disabled={commitState === 'loading'}
                        style={{
                          flex: 1,
                          fontSize: 11,
                          padding: '4px 6px',
                          border: '1px solid var(--color-border)',
                          borderRadius: 4,
                          background: 'transparent',
                          color: 'var(--color-foreground)',
                          outline: 'none',
                          minWidth: 0
                        }}
                      />
                      <button
                        onClick={handleCommit}
                        disabled={commitState === 'loading' || !commitMsg.trim()}
                        style={{
                          ...menuItemStyle,
                          width: 'auto',
                          padding: '4px 8px',
                          opacity: commitState === 'loading' || !commitMsg.trim() ? 0.5 : 1,
                          flexShrink: 0
                        }}
                        onMouseEnter={hoverOn}
                        onMouseLeave={hoverOff}
                      >
                        {commitState === 'loading' ? <Loader2 size={12} className="animate-spin" /> :
                         commitState === 'success' ? <Check size={12} style={{ color: 'var(--color-success)' }} /> :
                         <GitCommitHorizontal size={12} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Pull */}
                <button
                  onClick={(e) => { e.stopPropagation(); handlePull() }}
                  disabled={pullState === 'loading'}
                  style={{
                    ...menuItemStyle,
                    opacity: pullState === 'loading' ? 0.6 : 1,
                    cursor: pullState === 'loading' ? 'default' : 'pointer'
                  }}
                  onMouseEnter={e => { if (pullState !== 'loading') hoverOn(e) }}
                  onMouseLeave={hoverOff}
                >
                  <span style={{ color: 'var(--color-muted-foreground)', display: 'flex' }}>
                    {pullState === 'loading' ? <Loader2 size={12} className="animate-spin" /> :
                     pullState === 'success' ? <Check size={12} style={{ color: 'var(--color-success)' }} /> :
                     <Download size={12} />}
                  </span>
                  {pullState === 'loading' ? 'Pulling…' :
                   pullState === 'success' ? 'Pulled' :
                   'Pull'}
                </button>

                {/* Create PR */}
                {canCreatePR && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCreatePR() }}
                    disabled={prState === 'loading'}
                    style={{
                      ...menuItemStyle,
                      opacity: prState === 'loading' ? 0.6 : 1,
                      cursor: prState === 'loading' ? 'default' : 'pointer'
                    }}
                    onMouseEnter={e => { if (prState !== 'loading') hoverOn(e) }}
                    onMouseLeave={hoverOff}
                  >
                    <span style={{ color: 'var(--color-muted-foreground)', display: 'flex' }}>
                      {prState === 'loading' ? <Loader2 size={12} className="animate-spin" /> :
                       prState === 'success' ? <Check size={12} style={{ color: 'var(--color-success)' }} /> :
                       <GitPullRequest size={12} />}
                    </span>
                    {prState === 'loading' ? 'Creating PR…' :
                     prState === 'success' ? 'Opened' :
                     'Create PR'}
                  </button>
                )}

                {/* Git error message */}
                {gitError && (
                  <div style={{
                    padding: '3px 10px',
                    fontSize: 10,
                    color: 'var(--color-destructive)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {gitError}
                  </div>
                )}
              </>
            )}
          </div>
          </>,
          document.body
        )}
    </>
  )
}
