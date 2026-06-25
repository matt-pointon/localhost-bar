import { Folder, Play, X } from 'lucide-react'
import type { OfflineService } from '../hooks/useServices'
import { useState } from 'react'

interface OfflineRowProps {
  service: OfflineService
  onRestart: (service: OfflineService) => void
  onDismiss: (port: number) => void
}

export function OfflineRow({ service, onRestart, onDismiss }: OfflineRowProps) {
  const [hovered, setHovered] = useState(false)
  const canRestart = !!(service.args && service.cwd)

  return (
    <div
      className={`${service.exiting ? 'row-exit' : 'row-enter'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '7px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        transition: 'background 100ms',
        opacity: 0.5,
        borderRadius: 6,
        margin: '0 4px'
      }}
    >
      {/* Status dot */}
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: 'var(--color-muted-foreground)'
      }} />

      {/* Name + port */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3
        }}>
          {service.name}
        </div>
        <div style={{ fontSize: 9, color: 'var(--color-muted-foreground)', fontFamily: 'monospace', lineHeight: 1.2 }}>
          :{service.port}
        </div>
      </div>

      {/* Actions on hover */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 1,
        opacity: hovered ? 1 : 0, transition: 'opacity 100ms'
      }}>
        {service.cwd && (
          <OfflineBtn title="Finder" onClick={() => window.electronAPI.openFolder(service.cwd!)}>
            <Folder size={12} />
          </OfflineBtn>
        )}
        {canRestart && (
          <OfflineBtn title="Restart" onClick={() => onRestart(service)} hoverColor="var(--color-status-running)">
            <Play size={12} />
          </OfflineBtn>
        )}
        <OfflineBtn title="Dismiss" onClick={() => onDismiss(service.port)}>
          <X size={12} />
        </OfflineBtn>
      </div>
    </div>
  )
}

function OfflineBtn({ title, onClick, hoverColor, children }: {
  title: string; onClick: () => void; hoverColor?: string; children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        padding: 4, borderRadius: 5, border: 'none', background: 'transparent',
        cursor: 'pointer', color: 'var(--color-muted-foreground)',
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
