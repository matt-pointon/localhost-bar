const TOOL_LABELS: Record<string, string> = {
  cursor: 'Cursor',
  claude: 'Claude',
  windsurf: 'Windsurf',
  copilot: 'Copilot',
  codex: 'Codex',
  aider: 'Aider',
  bolt: 'Bolt',
  lovable: 'Lovable'
}

const TOOL_COLORS: Record<string, string> = {
  cursor: 'oklch(0.72 0.08 230)',
  claude: 'oklch(0.74 0.09 70)',
  windsurf: 'oklch(0.72 0.08 200)',
  copilot: 'oklch(0.70 0.06 250)',
  codex: 'oklch(0.72 0.08 145)',
  aider: 'oklch(0.70 0.08 30)',
  bolt: 'oklch(0.74 0.08 90)',
  lovable: 'oklch(0.72 0.08 340)'
}

interface ToolBadgeProps {
  toolId: string
  active?: boolean
  size?: 'sm' | 'xs'
}

export function ToolBadge({ toolId, active, size = 'xs' }: ToolBadgeProps) {
  const label = TOOL_LABELS[toolId] ?? toolId
  const color = TOOL_COLORS[toolId] ?? 'var(--color-muted-foreground)'
  const fontSize = size === 'sm' ? 8 : 7.5
  const padding = size === 'sm' ? '1px 5px' : '1px 4px'

  return (
    <span
      title={active ? `${label} active` : label}
      style={{
        fontSize,
        fontWeight: 560,
        letterSpacing: '0.02em',
        padding,
        borderRadius: 4,
        background: active ? `${color}28` : 'var(--color-muted)',
        color: active ? color : 'var(--color-muted-foreground)',
        border: active ? `1px solid ${color}40` : '1px solid transparent',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'background var(--duration-fast) ease, color var(--duration-fast) ease, border-color var(--duration-fast) ease'
      }}
    >
      {label}
    </span>
  )
}

interface ToolIconRowProps {
  originTools: string[]
  activeAgents: string[]
}

const MAX_VISIBLE = 2

export function ToolIconRow({ originTools, activeAgents }: ToolIconRowProps) {
  // Active agents first so the most relevant badges stay visible
  const all = [...new Set([...activeAgents, ...originTools])]
  if (all.length === 0) return null

  const visible = all.slice(0, MAX_VISIBLE)
  const overflow = all.length - visible.length

  return (
    <span style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
      {visible.map(id => (
        <ToolBadge key={id} toolId={id} active={activeAgents.includes(id)} />
      ))}
      {overflow > 0 && (
        <span
          title={all.slice(MAX_VISIBLE).map(id => TOOL_LABELS[id] ?? id).join(', ')}
          style={{
            fontSize: 7.5,
            fontWeight: 560,
            letterSpacing: '0.02em',
            padding: '1px 4px',
            borderRadius: 4,
            background: 'var(--color-muted)',
            color: 'var(--color-muted-foreground)',
            flexShrink: 0
          }}
        >
          +{overflow}
        </span>
      )}
    </span>
  )
}
