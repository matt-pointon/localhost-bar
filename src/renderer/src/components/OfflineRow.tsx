import { Folder, Play, X } from 'lucide-react'
import type { OfflineService } from '../hooks/useServices'
import { ToolIcons } from './ToolIcons'
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
      className={`flex items-center gap-3 px-4 py-2.5 ${service.exiting ? 'row-exit' : 'row-enter'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--color-accent)' : 'transparent',
        transition: 'background 100ms',
        opacity: 0.6
      }}
    >
      {/* Offline dot */}
      <span
        className="flex-none w-1.5 h-1.5 rounded-full"
        style={{ background: 'var(--color-muted-foreground)' }}
      />

      {/* Name + command */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-medium truncate leading-tight"
          style={{ color: 'var(--color-foreground)' }}
        >
          {service.name}
        </p>
        <p
          className="text-[11px] truncate leading-tight mt-0.5"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          {service.command}
        </p>
      </div>

      {/* Tool icons */}
      <ToolIcons tools={service.tools} />

      {/* Port badge */}
      <span
        className="flex-none text-[12px] font-mono px-1.5 py-0.5 rounded"
        style={{
          color: 'var(--color-muted-foreground)',
          background: 'var(--color-muted)'
        }}
      >
        :{service.port}
      </span>

      {/* Action buttons */}
      <div
        className="flex-none flex items-center gap-1 transition-opacity"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        {service.cwd && (
          <button
            title="Open in Finder"
            onClick={() => window.electronAPI.openFolder(service.cwd!)}
            className="p-1 rounded transition-colors"
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
            <Folder size={12} />
          </button>
        )}
        {canRestart && (
          <button
            title="Restart"
            onClick={() => onRestart(service)}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--color-muted-foreground)' }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-status-running)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.1)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted-foreground)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            <Play size={12} />
          </button>
        )}
        <button
          title="Dismiss"
          onClick={() => onDismiss(service.port)}
          className="p-1 rounded transition-colors"
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
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
