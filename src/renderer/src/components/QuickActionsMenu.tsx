import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Code2, Copy, ExternalLink, Folder, MoreHorizontal, Rocket, Sparkles, Terminal, Wind } from 'lucide-react'
import type { DeployTarget, DeployRecord, DeployInfo, DeployState } from '../hooks/useDeployState'

export interface InstalledTools {
  vscode: boolean
  cursor: boolean
  windsurf: boolean
  claude: boolean
  iterm2: boolean
}

interface Action {
  label: string
  icon: React.ReactNode
  actionKey: string
  show: boolean
}

interface QuickActionsMenuProps {
  cwd: string
  tools: InstalledTools
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

export function QuickActionsMenu({ cwd, tools, deployState, onDeploy, onSetLastDeploy }: QuickActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [deployInfo, setDeployInfo] = useState<DeployInfo | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const editorActions: Action[] = [
    { label: 'Open in Finder', icon: <Folder size={12} />, actionKey: 'finder', show: true },
    { label: 'Open in VS Code', icon: <Code2 size={12} />, actionKey: 'vscode', show: tools.vscode },
    { label: 'Open in Cursor', icon: <Code2 size={12} />, actionKey: 'cursor', show: tools.cursor },
    { label: 'Open in Windsurf', icon: <Wind size={12} />, actionKey: 'windsurf', show: tools.windsurf },
    { label: 'Open terminal here', icon: <Terminal size={12} />, actionKey: 'terminal', show: true },
    { label: 'Open Claude Code here', icon: <Sparkles size={12} />, actionKey: 'claude', show: tools.claude }
  ]
  const visibleActions = editorActions.filter(a => a.show)

  const lastDeploy = deployState?.lastDeploy ?? deployInfo?.lastDeploy ?? null
  const isDeploying = deployState?.status === 'deploying'
  const anyCliInstalled = deployInfo
    ? deployInfo.installedCLIs.vercel || deployInfo.installedCLIs.railway || deployInfo.installedCLIs.netlify
    : true // optimistic until info loads

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const deployRows = 1 + (lastDeploy ? 2 : 0)
      const menuH = (visibleActions.length + deployRows + 1) * 28 + 20
      const spaceBelow = window.innerHeight - rect.bottom
      const above = spaceBelow < menuH && rect.top > menuH
      setPos({
        x: rect.right - 220,
        y: above ? rect.top - menuH - 4 : rect.bottom + 4
      })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    window.electronAPI.deployGetInfo(cwd).then(info => {
      setDeployInfo(info)
      if (info.lastDeploy) onSetLastDeploy(cwd, info.lastDeploy)
    })
  }, [open, cwd, onSetLastDeploy])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
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
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'
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
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: pos.x,
              top: pos.y,
              width: 220,
              background: 'rgba(252,252,252,0.96)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
              padding: '4px',
              zIndex: 9999
            }}
          >
            {/* Editor / terminal actions */}
            {visibleActions.map(action => (
              <button
                key={action.actionKey}
                onClick={() => run(action.actionKey)}
                style={menuItemStyle}
                onMouseEnter={hoverOn}
                onMouseLeave={hoverOff}
              >
                <span style={{ color: 'var(--color-muted-foreground)', display: 'flex' }}>
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}

            {/* Separator */}
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
          </div>,
          document.body
        )}
    </>
  )
}
