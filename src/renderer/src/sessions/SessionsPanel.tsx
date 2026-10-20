import { useMemo, useState } from 'react'
import { ChevronLeft, Search } from 'lucide-react'

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

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function fmtTime(ms: number): string {
  if (!ms) return '—'
  const d = new Date(ms)
  return `${MONTHS[d.getMonth()]} ${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
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

export function SessionsPanel({
  sessions,
  onBack
}: {
  sessions: AgentSession[] | null
  onBack: () => void
}) {
  const [search, setSearch] = useState('')

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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      <div
        className="drag-region"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 72px 6px 12px',
          minHeight: 28
        }}
      >
        <button
          className="no-drag"
          onClick={onBack}
          title="Back"
          style={{
            padding: 2,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--color-muted-foreground)',
            display: 'flex'
          }}
        >
          <ChevronLeft size={14} />
        </button>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-muted-foreground)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          Agent Sessions
          {sessions && ` · ${filtered.length}`}
          {filtered.length > 0 && ` · ≈ ${fmtCost(totalCost)}`}
        </span>
      </div>

      <div className="no-drag" style={{ padding: '2px 12px 8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 8px',
            borderRadius: 7,
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)'
          }}
        >
          <Search size={11} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search sessions, models, providers"
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-foreground)',
              fontSize: 11.5,
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto show-scrollbar">
        {filtered.map((s, i) => {
          const providerColor = PROVIDER_COLORS[s.providerSlug] ?? PROVIDER_COLORS.unknown
          return (
            <div
              key={`${s.source}:${s.id}:${i}`}
              className="session-row"
              title={s.cwd ?? undefined}
              style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: providerColor,
                    flexShrink: 0
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 11.5,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    color: s.model ? 'var(--color-foreground)' : 'var(--color-muted-foreground)'
                  }}
                >
                  {s.model ? `${s.providerSlug}/${s.model}` : '—'}
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    color: s.estimatedCost === null ? 'var(--color-muted-foreground)' : 'var(--color-foreground)',
                    flexShrink: 0
                  }}
                >
                  {fmtCost(s.estimatedCost)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 9.5,
                  color: 'var(--color-muted-foreground)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}
              >
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {fmtTime(s.lastRequest)}
                </span>
                <span>·</span>
                <span>{s.sourceLabel}</span>
                <span>·</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {shortId(s.id)}
                </span>
                {s.project && (
                  <>
                    <span>·</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.project}</span>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {sessions && filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '28px 20px',
              color: 'var(--color-muted-foreground)',
              fontSize: 11,
              lineHeight: 1.6
            }}
          >
            {sessions.length === 0
              ? 'No local agent sessions yet. Sessions from Claude Code and Codex appear here once you use them.'
              : `No sessions match “${search}”.`}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '6px 12px',
          borderTop: '1px solid var(--color-border)',
          fontSize: 9,
          color: 'var(--color-muted-foreground)',
          lineHeight: 1.4
        }}
      >
        Costs estimated locally from token usage — may differ from provider billing.
      </div>
    </div>
  )
}
