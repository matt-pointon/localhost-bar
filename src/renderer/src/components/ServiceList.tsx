import { useState, useCallback } from 'react'
import { ExternalLink, Folder, Square, MoreHorizontal } from 'lucide-react'
import { QuickActionsMenu } from './QuickActionsMenu'
import type { ServiceInfo } from '../hooks/useServices'
import type { DetectedTool } from './QuickActionsMenu'
import type { DeployTarget, DeployRecord, DeployState } from '../hooks/useDeployState'

interface ServiceListProps {
  services: ServiceInfo[]
  onOpen: (port: number) => void
  onKill: (pid: number) => void
  availableTools: DetectedTool[]
  deployStates: Map<string, DeployState>
  onDeploy: (cwd: string, target: DeployTarget) => void
  onSetLastDeploy: (cwd: string, record: DeployRecord) => void
}

export function ServiceList({ services, onOpen, onKill, availableTools, deployStates, onDeploy, onSetLastDeploy }: ServiceListProps) {
  return (
    <div style={{ padding: '4px 0' }}>
      {services.map(service => (
        <ServiceRow
          key={`${service.pid}-${service.port}`}
          service={service}
          onOpen={onOpen}
          onKill={onKill}
          availableTools={availableTools}
          deployState={service.cwd ? deployStates.get(service.cwd) : undefined}
          onDeploy={onDeploy}
          onSetLastDeploy={onSetLastDeploy}
        />
      ))}
    </div>
  )
}

function ServiceRow({ service, onOpen, onKill, availableTools, deployState, onDeploy, onSetLastDeploy }: {
  service: ServiceInfo
  onOpen: (port: number) => void
  onKill: (pid: number) => void
  availableTools: DetectedTool[]
  deployState?: DeployState
  onDeploy: (cwd: string, target: DeployTarget) => void
  onSetLastDeploy: (cwd: string, record: DeployRecord) => void
}) {
  const [hovered, setHovered] = useState(false)
  const isStopping = service.status === 'stopping'

  return (
    <div
      className={service.status === 'exiting' ? 'row-exit' : 'row-enter'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isStopping && onOpen(service.port)}
      style={{
        padding: '8px 12px',
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
      {/* Status dot */}
      <span
        className={isStopping ? 'animate-pulse' : ''}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          flexShrink: 0,
          background: isStopping ? 'var(--color-status-stopping)' : 'var(--color-status-running)'
        }}
      />

      {/* Name + port */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-foreground)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.3
        }}>
          {service.name}
        </div>
        <div style={{
          fontSize: 9,
          color: 'var(--color-muted-foreground)',
          lineHeight: 1.2,
          display: 'flex',
          gap: 4,
          alignItems: 'center'
        }}>
          <span style={{ fontFamily: 'monospace' }}>:{service.port}</span>
          {service.resources && (
            <>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>{service.resources.mem}MB</span>
            </>
          )}
        </div>
      </div>

      {/* Inline actions — visible on hover */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 100ms'
      }}>
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
          <RowBtn title="Finder" onClick={() => window.electronAPI.openFolder(service.cwd!)}>
            <Folder size={12} />
          </RowBtn>
        )}
        <RowBtn title="Open" onClick={() => onOpen(service.port)}>
          <ExternalLink size={12} />
        </RowBtn>
        <RowBtn
          title="Stop"
          onClick={() => onKill(service.pid)}
          disabled={isStopping}
          hoverColor="var(--color-destructive)"
        >
          <Square size={12} />
        </RowBtn>
      </div>
    </div>
  )
}

function RowBtn({ title, onClick, disabled, hoverColor, children }: {
  title: string; onClick: () => void; disabled?: boolean; hoverColor?: string; children: React.ReactNode
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        padding: 4, borderRadius: 6, border: 'none', background: 'transparent',
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
