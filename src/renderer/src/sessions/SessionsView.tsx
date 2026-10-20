import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Search, Layers } from 'lucide-react'

const POLL_INTERVAL_MS = 30_000

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'oklch(0.70 0.14 55)',
  openai: 'oklch(0.78 0.04 170)',
  google: 'oklch(0.65 0.15 250)',
  moonshotai: 'oklch(0.65 0.16 285)',
  meta: 'oklch(0.62 0.14 250)',
  mistral: 'oklch(0.72 0.15 55)',
  xai: 'oklch(0.80 0.02 250)',
  deepseek: 'oklch(0.66 0.14 265)',
  unknown: 'var(--color-muted-foreground)'
}

const SOURCE_COLORS: Record<string, string> = {
  'claude-code': 'oklch(0.70 0.14 55)',
  codex: 'oklch(0.68 0.12 145)'
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function fmtTime(ms: number): { date: string; time: string } {
  if (!ms) return { date: '—', time: '' }
  const d = new Date(ms)
  return {
    date: `${MONTHS[d.getMonth()]} ${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
}

function shortId(id: string): string {
  if (id.length <= 11) return id
  return `${id.slice(0, 4)}…${id.slice(-4)}`
}

function fmtCost(cost: number | null): string {
  if (cost === null) return '—'
  if (cost === 0) return '$0.00'
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return `${n}`
}

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        flexShrink: 0
      }}
    />
  )
}

export function SessionsView() {
  const [sessions, setSessions] = useState<AgentSession[] | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = () => window.electronAPI.getSessions().then(setSessions).catch(() => setSessions([]))
    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const filtered = useMemo(() => {
    if (!sessions) return []
    const q = search.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter(s =>
      [s.id, s.model ?? '', s.providerName, s.sourceLabel, s.project ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [sessions, search])

  const totalCost = useMemo(
    () => filtered.reduce((sum, s) => sum + (s.estimatedCost ?? 0), 0),
    [filtered]
  )

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(6, 9, 11, 0.92)',
        color: 'var(--color-foreground)',
        overflow: 'hidden'
      }}
    >
      <div
        className="drag-region"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          paddingTop: 28,
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={14} style={{ color: 'var(--color-muted-foreground)' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Agent Sessions</span>
          <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>
            {sessions ? `${filtered.length}` : ''}
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>
          {filtered.length > 0 && `≈ ${fmtCost(totalCost)} est.`}
        </span>
      </div>

      <div className="no-drag" style={{ padding: '0 20px 10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)'
          }}
        >
          <Search size={13} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search sessions, models, or providers"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-foreground)',
              fontSize: 13,
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto show-scrollbar" style={{ padding: '0 8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ color: 'var(--color-muted-foreground)', textAlign: 'left' }}>
              <Th>Last Request</Th>
              <Th>Session</Th>
              <Th>Source</Th>
              <Th>Project</Th>
              <Th right>Cost (est.)</Th>
              <Th>Provider</Th>
              <Th>Model</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const t = fmtTime(s.lastRequest)
              const providerColor = PROVIDER_COLORS[s.providerSlug] ?? PROVIDER_COLORS.unknown
              const sourceColor = SOURCE_COLORS[s.source] ?? 'var(--color-muted-foreground)'
              return (
                <tr
                  key={`${s.source}:${s.id}:${i}`}
                  className="session-row"
                  title={s.cwd ?? undefined}
                >
                  <Td mono muted>
                    <span style={{ color: 'var(--color-muted-foreground)' }}>{t.date} </span>
                    <span style={{ color: 'var(--color-foreground)' }}>{t.time}</span>
                  </Td>
                  <Td mono>{shortId(s.id)}</Td>
                  <Td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Dot color={sourceColor} />
                      {s.sourceLabel}
                    </span>
                  </Td>
                  <Td muted>{s.project ?? '—'}</Td>
                  <Td right mono>
                    {fmtCost(s.estimatedCost)}
                  </Td>
                  <Td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Dot color={providerColor} />
                      {s.providerName}
                    </span>
                  </Td>
                  <Td muted mono title={`${fmtTokens(s.totalTokens)} tokens · ${s.requests} requests`}>
                    {s.model ? `${s.providerSlug}/${s.model}` : '—'}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {sessions && filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: 'var(--color-muted-foreground)',
              fontSize: 13,
              lineHeight: 1.6
            }}
          >
            {sessions.length === 0 ? (
              <>
                No local agent sessions found yet.
                <br />
                Sessions from Claude Code (<code>~/.claude/projects</code>) and Codex
                (<code>~/.codex/sessions</code>) show up here once you've used them.
              </>
            ) : (
              <>No sessions match “{search}”.</>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '8px 20px',
          borderTop: '1px solid var(--color-border)',
          fontSize: 10.5,
          color: 'var(--color-muted-foreground)'
        }}
      >
        Costs are estimated locally from session token usage and a bundled price table — they may
        differ from provider billing.
      </div>
    </div>
  )
}

function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <th
      style={{
        fontSize: 10,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '8px 12px',
        textAlign: right ? 'right' : 'left',
        position: 'sticky',
        top: 0,
        background: 'rgba(6, 9, 11, 0.98)',
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  mono,
  muted,
  right,
  title
}: {
  children: ReactNode
  mono?: boolean
  muted?: boolean
  right?: boolean
  title?: string
}) {
  return (
    <td
      title={title}
      style={{
        padding: '7px 12px',
        textAlign: right ? 'right' : 'left',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 260,
        color: muted ? 'var(--color-muted-foreground)' : 'var(--color-foreground)',
        fontFamily: mono
          ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
          : 'inherit'
      }}
    >
      {children}
    </td>
  )
}
