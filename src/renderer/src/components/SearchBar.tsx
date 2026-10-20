import { useState } from 'react'
import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="no-drag" style={{ padding: '2px 16px 8px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 9px',
          borderRadius: 7,
          background: focused ? 'rgba(255,255,255,0.07)' : 'var(--color-input-bg)',
          border: `1px solid ${focused ? 'rgba(255,255,255,0.16)' : 'var(--color-border)'}`,
          boxShadow: focused ? '0 0 0 2px rgba(255,255,255,0.04)' : 'none',
          transition: 'border-color var(--duration-fast) ease, background var(--duration-fast) ease, box-shadow var(--duration-fast) ease'
        }}
      >
        <Search
          size={11}
          style={{
            color: focused ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
            flexShrink: 0,
            opacity: focused ? 0.85 : 0.7,
            transition: 'color var(--duration-fast) ease, opacity var(--duration-fast) ease'
          }}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Filter projects…"
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 11.5,
            letterSpacing: '-0.005em',
            color: 'var(--color-foreground)',
            minWidth: 0
          }}
        />
      </div>
    </div>
  )
}
