import { Folder, Play, X } from 'lucide-react'
import type { OfflineService } from '../hooks/useServices'
import { useState } from 'react'
import { IconButton } from './IconButton'

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
        position: 'relative',
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        background: hovered ? 'var(--color-hover-overlay)' : 'transparent',
        transition: 'background 120ms ease',
        opacity: 0.55,
        borderRadius: 8,
        margin: '0 6px'
      }}
    >
      {/* Status dot */}
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: 'var(--color-muted-foreground)'
      }} />

      {/* Name + port */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600, color: 'var(--color-foreground)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.35, letterSpacing: '-0.01em'
        }}>
          {service.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-muted-foreground)', fontFamily: 'ui-monospace, monospace', lineHeight: 1.4, marginTop: 2, opacity: 0.85 }}>
          :{service.port}
        </div>
      </div>

      {/* Actions on hover */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 8,
        display: 'flex', alignItems: 'center', gap: 1, paddingLeft: 34,
        opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none',
        transition: 'opacity 120ms ease',
        background: 'linear-gradient(to right, rgba(15,19,16,0) 0%, rgb(15,19,16) 38px)',
        borderRadius: 8
      }}>
        {service.cwd && (
          <IconButton title="Finder" onClick={() => window.electronAPI.openFolder(service.cwd!)}>
            <Folder size={13} />
          </IconButton>
        )}
        {canRestart && (
          <IconButton title="Restart" onClick={() => onRestart(service)}>
            <Play size={13} />
          </IconButton>
        )}
        <IconButton title="Dismiss" onClick={() => onDismiss(service.port)} variant="destructive">
          <X size={13} />
        </IconButton>
      </div>
    </div>
  )
}
