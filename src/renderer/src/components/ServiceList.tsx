import { useState, useMemo } from 'react'
import { ExternalLink, Folder, Square, Copy, Check, Pin, Pencil } from 'lucide-react'
import { QuickActionsMenu } from './QuickActionsMenu'
import { ToolIconRow } from './ToolIcons'
import { TaskList } from './TaskList'
import { IconButton } from './IconButton'
import { useTasks } from '../hooks/useTasks'
import type { ServiceInfo } from '../hooks/useServices'
import type { DetectedTool } from './QuickActionsMenu'
import type { DeployTarget, DeployRecord, DeployState } from '../hooks/useDeployState'

interface ServiceListProps {
  services: ServiceInfo[]
  search: string
  onOpen: (port: number) => void
  onKill: (pid: number) => void
  availableTools: DetectedTool[]
  deployStates: Map<string, DeployState>
  onDeploy: (cwd: string, target: DeployTarget) => void
  onSetLastDeploy: (cwd: string, record: DeployRecord) => void
  onRefresh: () => void
}

export function ServiceList({
  services, search, onOpen, onKill, availableTools,
  deployStates, onDeploy, onSetLastDeploy, onRefresh
}: ServiceListProps) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return services
    return services.filter(s =>
      s.name.toLowerCase().includes(q) ||
      String(s.port).includes(q) ||
      s.stackTags.some(t => t.toLowerCase().includes(q)) ||
      (s.git?.branch.toLowerCase().includes(q) ?? false)
    )
  }, [services, search])

  return (
    <div style={{ padding: '4px 0' }}>
      {filtered.map(service => (
        <ServiceRow
          key={`${service.pid}-${service.port}`}
          service={service}
          onOpen={onOpen}
          onKill={onKill}
          availableTools={availableTools}
          deployState={service.cwd ? deployStates.get(service.cwd) : undefined}
          onDeploy={onDeploy}
          onSetLastDeploy={onSetLastDeploy}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  )
}

function ServiceRow({
  service, onOpen, onKill, availableTools, deployState,
  onDeploy, onSetLastDeploy, onRefresh
}: {
  service: ServiceInfo
  onOpen: (port: number) => void
  onKill: (pid: number) => void
  availableTools: DetectedTool[]
  deployState?: DeployState
  onDeploy: (cwd: string, target: DeployTarget) => void
  onSetLastDeploy: (cwd: string, record: DeployRecord) => void
  onRefresh: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(service.name)
  const isStopping = service.status === 'stopping'
  const { tasks, add, toggle, remove } = useTasks(service.cwd)

  const copyUrl = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`http://localhost:${service.port}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!service.cwd) return
    await window.electronAPI.togglePin(service.cwd)
    onRefresh()
  }

  const handleRename = async () => {
    if (!service.cwd) return
    await window.electronAPI.setRename(service.cwd, renameVal)
    setRenaming(false)
    onRefresh()
  }

  return (
    <div>
      <div
        className={service.status === 'exiting' ? 'row-exit' : 'row-enter'}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => !isStopping && !renaming && onOpen(service.port)}
        style={{
          position: 'relative',
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          cursor: isStopping ? 'not-allowed' : 'pointer',
          background: hovered ? 'var(--color-hover-overlay)' : 'transparent',
          transition: 'background 120ms ease',
          opacity: isStopping ? 0.4 : 1,
          borderRadius: 8,
          margin: '0 6px'
        }}
      >
        <span
          className={isStopping ? 'animate-pulse' : ''}
          style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: isStopping ? 'var(--color-status-stopping)' : 'var(--color-status-running)',
            boxShadow: isStopping ? 'none' : '0 0 6px -1px var(--color-status-running)'
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            {service.pinned && !renaming && (
              <Pin size={9} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
            )}
            {renaming ? (
              <input
                className="no-drag"
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') setRenaming(false)
                }}
                onBlur={handleRename}
                onClick={e => e.stopPropagation()}
                autoFocus
                style={{
                  fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0,
                  background: 'var(--color-input-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 5, padding: '1px 5px', color: 'var(--color-foreground)', outline: 'none'
                }}
              />
            ) : (
              <div style={{
                fontSize: 12.5, fontWeight: 600, color: 'var(--color-foreground)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                lineHeight: 1.35, letterSpacing: '-0.01em', flexShrink: 1, minWidth: 0
              }}>
                {service.name}
              </div>
            )}
            <ToolIconRow originTools={service.originTools} activeAgents={service.activeAgents} />
          </div>

          <div style={{
            fontSize: 10, color: 'var(--color-muted-foreground)', lineHeight: 1.4,
            display: 'flex', gap: 6, alignItems: 'center', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden'
          }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', flexShrink: 0, opacity: 0.85 }}>
              :{service.port}
            </span>
            {service.git && (
              <>
                <MetaDot />
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1
                }}>
                  {service.git.branch}
                </span>
                {service.git.changes > 0 && (
                  <span style={{ color: 'var(--color-warning)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {service.git.changes}Δ
                  </span>
                )}
              </>
            )}
            {service.resources && (
              <>
                <MetaDot />
                <span style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {service.resources.mem}MB
                </span>
              </>
            )}
            {service.stackTags.length > 0 && (
              <span style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 1 }}>
                {service.stackTags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 9, lineHeight: 1.5, padding: '0 5px', borderRadius: 4,
                    background: 'var(--color-muted)', border: '1px solid var(--color-border)',
                    color: 'var(--color-muted-foreground)', fontWeight: 500
                  }}>
                    {tag}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>

        {/* Hover action cluster — absolute overlay so it never reserves width
            nor overlaps the title/meta text underneath */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            paddingLeft: 34,
            opacity: hovered && !renaming ? 1 : 0,
            pointerEvents: hovered && !renaming ? 'auto' : 'none',
            transition: 'opacity 120ms ease',
            background: 'linear-gradient(to right, rgba(15,19,16,0) 0%, rgb(15,19,16) 38px)',
            borderRadius: 8
          }}
        >
          <IconButton title={copied ? 'Copied!' : 'Copy URL'} onClick={copyUrl}>
            {copied ? <Check size={13} style={{ color: 'var(--color-success)' }} /> : <Copy size={13} />}
          </IconButton>
          {service.cwd && (
            <IconButton title="Rename" onClick={e => { e.stopPropagation(); setRenaming(true); setRenameVal(service.name) }}>
              <Pencil size={13} />
            </IconButton>
          )}
          {service.cwd && (
            <IconButton title={service.pinned ? 'Unpin' : 'Pin'} onClick={handlePin} active={service.pinned}>
              <Pin size={13} />
            </IconButton>
          )}
          {service.cwd && (
            <QuickActionsMenu
              cwd={service.cwd}
              tools={availableTools}
              git={service.git}
              deployState={deployState}
              onDeploy={onDeploy}
              onSetLastDeploy={onSetLastDeploy}
            />
          )}
          {service.cwd && (
            <IconButton title="Finder" onClick={() => window.electronAPI.openFolder(service.cwd!)}>
              <Folder size={13} />
            </IconButton>
          )}
          <IconButton title="Open" onClick={() => onOpen(service.port)}>
            <ExternalLink size={13} />
          </IconButton>
          <span style={{ width: 1, height: 16, background: 'var(--color-border)', margin: '0 2px', flexShrink: 0 }} />
          <IconButton title="Stop" onClick={() => onKill(service.pid)} disabled={isStopping} variant="destructive">
            <Square size={13} />
          </IconButton>
        </div>
      </div>

      {service.cwd && (
        <TaskList
          cwd={service.cwd}
          tasks={tasks}
          onAdd={add}
          onToggle={toggle}
          onRemove={remove}
        />
      )}
    </div>
  )
}

function MetaDot() {
  return <span style={{ opacity: 0.35, flexShrink: 0 }}>·</span>
}
