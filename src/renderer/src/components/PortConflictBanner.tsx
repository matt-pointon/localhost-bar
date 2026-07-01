import type { PortConflict } from '../../../preload/index'

interface PortConflictBannerProps {
  conflicts: PortConflict[]
}

export function PortConflictBanner({ conflicts }: PortConflictBannerProps) {
  if (conflicts.length === 0) return null

  return (
    <div
      className="no-drag"
      style={{
        margin: '4px 8px 0',
        padding: '6px 10px',
        borderRadius: 6,
        background: 'rgba(200, 140, 30, 0.12)',
        border: '1px solid rgba(200, 140, 30, 0.25)',
        fontSize: 10,
        color: 'var(--color-warning)',
        lineHeight: 1.4
      }}
    >
      {conflicts.map(c => (
        <div key={c.port}>
          Port {c.port} conflict: {c.services.map(s => s.name).join(' vs ')}
        </div>
      ))}
    </div>
  )
}
