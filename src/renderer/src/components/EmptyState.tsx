import { Wifi } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3.5 px-8 text-center py-10">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--color-muted)',
          border: '1px solid var(--color-border)'
        }}
      >
        <Wifi size={15} style={{ color: 'var(--color-muted-foreground)', opacity: 0.85 }} />
      </div>
      <div>
        <p
          style={{
            fontSize: 12.5,
            fontWeight: 560,
            letterSpacing: '-0.01em',
            color: 'var(--color-foreground)',
            margin: 0
          }}
        >
          No services running
        </p>
        <p
          style={{
            fontSize: 11,
            marginTop: 5,
            lineHeight: 1.45,
            color: 'var(--color-muted-foreground)',
            marginBottom: 0
          }}
        >
          Start a dev server and it will appear here
        </p>
      </div>
    </div>
  )
}
