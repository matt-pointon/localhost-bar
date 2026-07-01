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
  cursor: 'oklch(0.65 0.12 250)',
  claude: 'oklch(0.70 0.14 55)',
  windsurf: 'oklch(0.65 0.14 200)',
  copilot: 'oklch(0.60 0.10 280)',
  codex: 'oklch(0.68 0.12 145)',
  aider: 'oklch(0.62 0.14 25)',
  bolt: 'oklch(0.72 0.15 85)',
  lovable: 'oklch(0.65 0.16 330)'
}

interface ToolBadgeProps {
  toolId: string
  active?: boolean
  size?: 'sm' | 'xs'
}

export function ToolBadge({ toolId, active, size = 'xs' }: ToolBadgeProps) {
  const label = TOOL_LABELS[toolId] ?? toolId
  const color = TOOL_COLORS[toolId] ?? 'var(--color-muted-foreground)'
  const fontSize = size === 'sm' ? 8 : 7
  const padding = size === 'sm' ? '1px 5px' : '1px 4px'

  return (
    <span
      title={active ? `${label} active` : label}
      style={{
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.02em',
        padding,
        borderRadius: 4,
        background: active ? `${color}33` : 'rgba(255,255,255,0.06)',
        color: active ? color : 'var(--color-muted-foreground)',
        border: active ? `1px solid ${color}55` : '1px solid transparent',
        whiteSpace: 'nowrap',
        flexShrink: 0
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

export function ToolIconRow({ originTools, activeAgents }: ToolIconRowProps) {
  const all = [...new Set([...activeAgents, ...originTools])]
  if (all.length === 0) return null

  return (
    <span style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
      {all.map(id => (
        <ToolBadge key={id} toolId={id} active={activeAgents.includes(id)} />
      ))}
    </span>
  )
}
