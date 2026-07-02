import { useState, useRef, useCallback } from 'react'
import { Share, Check } from 'lucide-react'

function fmt(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

interface StatsBarProps {
  stats: DailyStats | null
  tokenStats: TokenStats | null
  serviceCount: number
  isLoading: boolean
  onRefresh: () => void
}

export function StatsBar({ stats, tokenStats, serviceCount, isLoading, onRefresh }: StatsBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shared, setShared] = useState(false)

  const handleShare = useCallback(async () => {
    if (!containerRef.current) return
    const height = containerRef.current.offsetHeight
    const result = await window.electronAPI.shareStats(height)
    if (result.success) {
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }, [])

  const commitsToday = stats?.commitsToday ?? 0
  const linesChangedToday = stats?.linesChangedToday ?? 0
  const streakDays = stats?.streakDays ?? 0
  const history = stats?.history ?? []

  const aiItems: { value: string; label: string }[] = []
  if (tokenStats?.claudeDesktop) {
    aiItems.push({ value: fmt(tokenStats.claudeDesktop.tokens), label: 'Tokens' })
  }
  if (tokenStats?.claudeCode) {
    aiItems.push({ value: fmt(tokenStats.claudeCode.prompts), label: tokenStats.claudeCode.prompts === 1 ? 'Prompt' : 'Prompts' })
  }
  if (tokenStats?.cursor?.aiEdits) {
    aiItems.push({ value: fmt(tokenStats.cursor.aiEdits), label: 'AI Edits' })
  }

  const aiPercent = tokenStats?.cursor?.avgAiPercent ?? 0

  return (
    <div
      ref={containerRef}
      className="drag-region"
      style={{ padding: '12px 14px 12px', position: 'relative' }}
    >
      <div
        className="no-drag"
        style={{ position: 'absolute', top: 12, right: 14, display: 'flex', gap: 2 }}
      >
        <HeaderBtn title={shared ? 'Copied!' : 'Share stats'} onClick={handleShare}>
          {shared ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Share size={12} />}
        </HeaderBtn>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
        {linesChangedToday > 0 && (
          <StatNumber value={fmt(linesChangedToday)} label={linesChangedToday === 1 ? 'Line' : 'Lines'} />
        )}
        {commitsToday > 0 && (
          <StatNumber value={fmt(commitsToday)} label={commitsToday === 1 ? 'Commit' : 'Commits'} />
        )}
        {streakDays > 0 && (
          <StatNumber value={`${streakDays}d`} label="Streak" />
        )}
        {aiItems.map((item, i) => (
          <StatNumber key={i} value={item.value} label={item.label} color="var(--color-status-ai)" />
        ))}
        {aiPercent > 0 && (
          <StatNumber value={`${aiPercent}%`} label="AI Code" color="var(--color-status-ai)" />
        )}
        {!isLoading && commitsToday === 0 && linesChangedToday === 0 && streakDays === 0 && aiItems.length === 0 && (
          <StatNumber value="—" label="Today" />
        )}
      </div>

      <ActivityGrid history={history} />
    </div>
  )
}

function StatNumber({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div>
      <div style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 800, fontSize: 18, lineHeight: 1.1,
        color: color ?? 'var(--color-foreground)',
        letterSpacing: '-0.02em'
      }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: 'var(--color-muted-foreground)', marginTop: 2, letterSpacing: '0.02em' }}>
        {label}
      </div>
    </div>
  )
}

function HeaderBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="no-drag"
      style={{
        padding: 4, borderRadius: 5, border: 'none', background: 'transparent',
        cursor: 'pointer', color: 'var(--color-muted-foreground)', display: 'flex', alignItems: 'center'
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-hover-overlay)'; e.currentTarget.style.color = 'var(--color-foreground)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-muted-foreground)' }}
    >
      {children}
    </button>
  )
}

// Relative weights for the composite activity score. Commits are the strongest
// signal of a shipped unit of work, with lines and AI tokens filling in the effort
// that never made it into a commit yet.
const WEIGHT_COMMITS = 0.4
const WEIGHT_LINES = 0.35
const WEIGHT_TOKENS = 0.25

function ActivityGrid({ history }: { history: DayActivity[] }) {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; commits: number; lines: number; tokens: number } | null>(null)

  const activityMap = new Map<string, DayActivity>()
  for (const day of history) {
    activityMap.set(day.date, day)
  }

  // Each metric is normalized against its own max in the window, so no single
  // large-magnitude metric (e.g. tokens) drowns out the others.
  const maxCommits = Math.max(1, ...history.map(h => h.commits))
  const maxLines = Math.max(1, ...history.map(h => h.lines))
  const maxTokens = Math.max(1, ...history.map(h => h.tokens ?? 0))

  const score = (commits: number, lines: number, tokens: number) =>
    WEIGHT_COMMITS * (commits / maxCommits) +
    WEIGHT_LINES * (lines / maxLines) +
    WEIGHT_TOKENS * (tokens / maxTokens)

  const maxScore = Math.max(
    ...history.map(h => score(h.commits, h.lines, h.tokens ?? 0)),
    0.0001
  )

  const days: { date: string; level: number; lines: number; commits: number; tokens: number }[] = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const activity = activityMap.get(dateStr)
    const lines = activity?.lines ?? 0
    const commits = activity?.commits ?? 0
    const tokens = activity?.tokens ?? 0
    let level = 0
    if (commits > 0 || lines > 0 || tokens > 0) {
      const ratio = score(commits, lines, tokens) / maxScore
      if (ratio > 0.75) level = 4
      else if (ratio > 0.5) level = 3
      else if (ratio > 0.25) level = 2
      else level = 1
    }
    days.push({ date: dateStr, level, lines, commits, tokens })
  }

  const COLS = 6

  const colors = [
    'rgba(255, 255, 255, 0.04)',
    'rgba(80, 160, 90, 0.35)',
    'rgba(80, 170, 90, 0.55)',
    'rgba(70, 190, 85, 0.75)',
    'oklch(0.70 0.17 145)'
  ]

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const todayDay = days[days.length - 1]
  const displayDay = hoveredDay ?? todayDay

  return (
    <div className="no-drag" style={{ position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 3 }}>
        {days.map((day, i) => {
          const isToday = i === days.length - 1
          const isHovered = hoveredDay?.date === day.date
          const showBorder = hoveredDay ? isHovered : isToday
          return (
            <div
              key={day.date}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                aspectRatio: '1',
                borderRadius: 3,
                background: colors[day.level],
                border: showBorder ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid transparent',
                transition: 'border 100ms, background 300ms',
                cursor: 'default'
              }}
            />
          )
        })}
      </div>

      {displayDay && (
        <div style={{
          marginTop: 6, fontSize: 10, color: 'var(--color-muted-foreground)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>
            {!hoveredDay || displayDay === todayDay ? 'Today' : fmtDate(displayDay.date)}
          </span>
          {displayDay.commits > 0 || displayDay.lines > 0 || displayDay.tokens > 0 ? (
            <>
              {displayDay.commits > 0 && (
                <span>{displayDay.commits} commit{displayDay.commits !== 1 ? 's' : ''}</span>
              )}
              {displayDay.lines > 0 && (
                <>
                  {displayDay.commits > 0 && <span style={{ opacity: 0.4 }}>·</span>}
                  <span>{fmt(displayDay.lines)} lines</span>
                </>
              )}
              {displayDay.tokens > 0 && (
                <>
                  {(displayDay.commits > 0 || displayDay.lines > 0) && <span style={{ opacity: 0.4 }}>·</span>}
                  <span>{fmt(displayDay.tokens)} tokens</span>
                </>
              )}
            </>
          ) : (
            <span style={{ opacity: 0.5 }}>No activity</span>
          )}
        </div>
      )}
    </div>
  )
}
