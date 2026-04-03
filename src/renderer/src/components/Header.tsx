import { RefreshCw, X } from 'lucide-react'

interface HeaderProps {
  serviceCount: number
  isLoading: boolean
  lastUpdated: Date | null
  onRefresh: () => void
}

export function Header({ serviceCount, isLoading, onRefresh }: HeaderProps) {
  return (
    <div
      className="drag-region flex items-center justify-between px-4 py-3"
      style={{
        background: 'rgba(15,15,15,0.75)',
        backdropFilter: 'blur(50px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(50px) saturate(1.4)',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full flex-none"
          style={{ background: 'var(--color-status-running)' }}
        />
        <span
          className="text-[13px] font-semibold tracking-tight"
          style={{ color: 'var(--color-foreground)' }}
        >
          Localhost Bar
        </span>
        {serviceCount > 0 && (
          <span
            className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
            style={{
              color: 'var(--color-muted-foreground)',
              background: 'var(--color-muted)'
            }}
          >
            {serviceCount}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onRefresh}
          className="no-drag p-1 rounded-md transition-colors"
          style={{ color: 'var(--color-muted-foreground)' }}
          title="Refresh now"
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-foreground)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted-foreground)'
          }}
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() => window.electronAPI.quit()}
          className="no-drag p-1 rounded-md transition-colors"
          style={{ color: 'var(--color-muted-foreground)' }}
          title="Quit Localhost Bar"
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-foreground)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted-foreground)'
          }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
