import { Wifi } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center py-10">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'var(--color-muted)' }}
      >
        <Wifi size={18} style={{ color: 'var(--color-muted-foreground)' }} />
      </div>
      <div>
        <p
          className="text-[13px] font-medium"
          style={{ color: 'var(--color-foreground)' }}
        >
          No services running
        </p>
        <p
          className="text-[12px] mt-1 leading-relaxed"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          Start a dev server and it will appear here automatically
        </p>
      </div>
    </div>
  )
}
