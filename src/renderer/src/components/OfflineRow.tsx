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
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        background: hovered ? 'var(--color-hover-overlay)' : 'transparent',
        transition: 'background var(--duration-fast) ease',
        opacity: hovered ? 0.85 : 0.55,
        borderRadius: 8,
        margin: '0 8px'
      }}
    >
      <span style={{
        width: 6.5, height: 6.5, borderRadius: '50%', flexShrink: 0,
        background: 'var(--color-muted-foreground)',
        opacity: 0.7
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600, color: 'var(--color-foreground)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.35, letterSpacing: '-0.015em'
        }}>
          {service.name}
        </div>
        <div style={{
          fontSize: 10,
          color: 'var(--color-muted-foreground)',
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.4,
          marginTop: 2,
          opacity: 0.9
        }}>
          :{service.port}
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 8,
        display: 'flex', alignItems: 'center', gap: 1, paddingLeft: 34,
        opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none',
        transition: 'opacity var(--duration-fast) ease',
        background: 'linear-gradient(to right, transparent 0%, var(--color-row-fade) 36px)',
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
