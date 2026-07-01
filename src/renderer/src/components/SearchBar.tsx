import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="no-drag" style={{ padding: '4px 10px 6px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        borderRadius: 6,
        background: 'var(--color-input-bg)',
        border: '1px solid var(--color-border)'
      }}>
        <Search size={11} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Filter projects…"
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 11,
            color: 'var(--color-foreground)',
            minWidth: 0
          }}
        />
      </div>
    </div>
  )
}
