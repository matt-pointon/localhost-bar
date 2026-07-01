import { useState, useMemo } from 'react'
import { ExternalLink, Folder, Square, Copy, Check, Pin, Pencil } from 'lucide-react'
import { QuickActionsMenu } from './QuickActionsMenu'
import { ToolIconRow } from './ToolIcons'
import { TaskList } from './TaskList'
import { useTasks } from '../hooks/useTasks'
import type { ServiceInfo } from '../hooks/useServices'
import type { DetectedTool } from './QuickActionsMenu'
import type { DeployTarget, DeployRecord, DeployState } from '../hooks/useDeployState'

interface ServiceListProps {
  services: ServiceInfo[]
  search: string
  isPro: boolean
  onOpen: (port: number) => void
  onKill: (pid: number) => void
  availableTools: DetectedTool[]
  deployStates: Map<string, DeployState>
  onDeploy: (cwd: string, target: DeployTarget) => void
  onSetLastDeploy: (cwd: string, record: DeployRecord) => void
  onUpgrade: () => void
  onRefresh: () => void
}

export function ServiceList({
  services, search, isPro, onOpen, onKill, availableTools,
  deployStates, onDeploy, onSetLastDeploy, onUpgrade, onRefresh
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
    <div style={{ padding: '6px 0' }}>
      {filtered.map(service => (
        <ServiceRow
          key={`${service.pid}-${service.port}`}
          service={service}
          isPro={isPro}
          onOpen={onOpen}
          onKill={onKill}
          availableTools={availableTools}
          deployState={service.cwd ? deployStates.get(service.cwd) : undefined}
          onDeploy={onDeploy}
          onSetLastDeploy={onSetLastDeploy}
          onUpgrade={onUpgrade}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  )
}

function ServiceRow({
  service, isPro, onOpen, onKill, availableTools, deployState,
  onDeploy, onSetLastDeploy, onUpgrade, onRefresh
}: {
  service: ServiceInfo
  isPro: boolean
  onOpen: (port: number) => void
  onKill: (pid: number) => void
  availableTools: DetectedTool[]
  deployState?: DeployState
  onDeploy: (cwd: string, target: DeployTarget) => void
  onSetLastDeploy: (cwd: string, record: DeployRecord) => void
  onUpgrade: () => void
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
          padding: '7px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: isStopping ? 'not-allowed' : 'pointer',
          background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
          transition: 'background 100ms',
          opacity: isStopping ? 0.4 : 1,
          borderRadius: 6,
          margin: '0 4px'
        }}
      >
        <span
          className={isStopping ? 'animate-pulse' : ''}
          style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: isStopping ? 'var(--color-status-stopping)' : 'var(--color-status-running)'
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            {service.pinned && <Pin size={9} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />}
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
                  fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0,
                  background: 'var(--color-input-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 4, padding: '1px 4px', color: 'var(--color-foreground)', outline: 'none'
                }}
              />
            ) : (
              <div style={{
                fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3, flex: 1
              }}>
                {service.name}
              </div>
            )}
            <ToolIconRow originTools={service.originTools} activeAgents={service.activeAgents} />
          </div>

          <div style={{
            fontSize: 9, color: 'var(--color-muted-foreground)', lineHeight: 1.2,
            display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', marginTop: 1
          }}>
            <span style={{ fontFamily: 'monospace' }}>:{service.port}</span>
            {service.git && (
              <>
                <span style={{ opacity: 0.3 }}>·</span>
                <span>{service.git.branch}</span>
                {service.git.changes > 0 && (
                  <span style={{ color: 'var(--color-warning)' }}>{service.git.changes}Δ</span>
                )}
              </>
            )}
            {service.resources && (
              <>
                <span style={{ opacity: 0.3 }}>·</span>
                <span>{service.resources.mem}MB</span>
              </>
            )}
            {service.stackTags.map(tag => (
              <span key={tag} style={{
                fontSize: 8, padding: '0 4px', borderRadius: 3,
                background: 'rgba(255,255,255,0.06)', color: 'var(--color-muted-foreground)'
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 1,
          opacity: hovered ? 1 : 0, transition: 'opacity 100ms'
        }}>
          <RowBtn title={copied ? 'Copied!' : 'Copy URL'} onClick={copyUrl}>
            {copied ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Copy size={12} />}
          </RowBtn>
          {service.cwd && (
            <RowBtn title="Rename" onClick={e => { e.stopPropagation(); setRenaming(true); setRenameVal(service.name) }}>
              <Pencil size={12} />
            </RowBtn>
          )}
          {service.cwd && (
            <RowBtn title={service.pinned ? 'Unpin' : 'Pin'} onClick={handlePin}>
              <Pin size={12} style={service.pinned ? { color: 'var(--color-warning)' } : undefined} />
            </RowBtn>
          )}
          {service.cwd && (
            <QuickActionsMenu
              cwd={service.cwd}
              tools={availableTools}
              git={service.git}
              isPro={isPro}
              deployState={deployState}
              onDeploy={onDeploy}
              onSetLastDeploy={onSetLastDeploy}
              onUpgrade={onUpgrade}
            />
          )}
          {service.cwd && (
            <RowBtn title="Finder" onClick={() => window.electronAPI.openFolder(service.cwd!)}>
              <Folder size={12} />
            </RowBtn>
          )}
          <RowBtn title="Open" onClick={() => onOpen(service.port)}>
            <ExternalLink size={12} />
          </RowBtn>
          <RowBtn title="Stop" onClick={() => onKill(service.pid)} disabled={isStopping} hoverColor="var(--color-destructive)">
            <Square size={12} />
          </RowBtn>
        </div>
      </div>

      {service.cwd && (
        <TaskList
          cwd={service.cwd}
          tasks={tasks}
          isPro={isPro}
          onAdd={add}
          onToggle={toggle}
          onRemove={remove}
          onUpgrade={onUpgrade}
        />
      )}
    </div>
  )
}

function RowBtn({ title, onClick, disabled, hoverColor, children }: {
  title: string; onClick: (e: React.MouseEvent) => void; disabled?: boolean; hoverColor?: string; children: React.ReactNode
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={e => { e.stopPropagation(); onClick(e) }}
      style={{
        padding: 4, borderRadius: 5, border: 'none', background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: 'var(--color-muted-foreground)',
        display: 'flex', alignItems: 'center', transition: 'all 100ms'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = hoverColor ?? 'var(--color-foreground)'
        e.currentTarget.style.background = 'var(--color-hover-overlay)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--color-muted-foreground)'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}
