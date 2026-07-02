import { useState, useRef, useCallback } from 'react'
import { Share, Check } from 'lucide-react'
import { localDateStr, localDateStrOffset } from '../../../shared/dates'

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
  onHoverDay?: (day: DayActivity | null) => void
}

export function StatsBar({ stats, tokenStats, serviceCount, isLoading, onRefresh, onHoverDay }: StatsBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shared, setShared] = useState(false)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

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
  const todayStr = localDateStr()

  const activityMap = new Map<string, DayActivity>()
  for (const day of history) {
    activityMap.set(day.date, day)
  }

  const displayDate = hoveredDate ?? selectedDate ?? todayStr
  const displayDay = activityMap.get(displayDate) ?? {
    date: displayDate,
    commits: displayDate === todayStr ? commitsToday : 0,
    lines: displayDate === todayStr ? linesChangedToday : 0,
    tokens: displayDate === todayStr ? (stats?.tokensToday ?? 0) : 0,
    projects: [] as DayProject[]
  }
  const isViewingToday = displayDate === todayStr && !hoveredDate && !selectedDate

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
      style={{ padding: '12px 16px', position: 'relative' }}
    >
      <div
        className="no-drag"
        style={{ position: 'absolute', top: 12, right: 16, display: 'flex', gap: 2 }}
      >
        <HeaderBtn title={shared ? 'Copied!' : 'Share stats'} onClick={handleShare}>
          {shared ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Share size={12} />}
        </HeaderBtn>
      </div>

      <div style={{ marginBottom: 16 }}>
        {!isViewingToday && (
          <div style={{
            fontSize: 10, fontWeight: 600, color: 'var(--color-foreground)',
            marginBottom: 8, letterSpacing: '0.01em'
          }}>
            {fmtDisplayDate(displayDate)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
          {displayDay.lines > 0 && (
            <StatNumber value={fmt(displayDay.lines)} label={displayDay.lines === 1 ? 'Line' : 'Lines'} />
          )}
          {displayDay.commits > 0 && (
            <StatNumber value={fmt(displayDay.commits)} label={displayDay.commits === 1 ? 'Commit' : 'Commits'} />
          )}
          {isViewingToday && streakDays > 0 && (
            <StatNumber value={`${streakDays}d`} label="Streak" />
          )}
          {isViewingToday && aiItems.map((item, i) => (
            <StatNumber key={i} value={item.value} label={item.label} color="var(--color-status-ai)" />
          ))}
          {isViewingToday && aiPercent > 0 && (
            <StatNumber value={`${aiPercent}%`} label="AI Code" color="var(--color-status-ai)" />
          )}
          {!isViewingToday && displayDay.tokens > 0 && (
            <StatNumber value={fmt(displayDay.tokens)} label="Tokens" color="var(--color-status-ai)" />
          )}
          {!isLoading && displayDay.commits === 0 && displayDay.lines === 0 && displayDay.tokens === 0 && (
            <StatNumber value="—" label={isViewingToday ? 'Today' : 'No activity'} />
          )}
          {isLoading && !stats && (
            <StatNumber value="…" label="Loading" />
          )}
        </div>
      </div>

      <ActivityGrid
        history={history}
        hoveredDate={hoveredDate}
        selectedDate={selectedDate}
        onHoverDay={(day) => {
          setHoveredDate(day?.date ?? null)
          onHoverDay?.(day)
        }}
        onSelectDate={setSelectedDate}
      />
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
        padding: 4, borderRadius: 6, border: 'none', background: 'transparent',
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

interface GridDay {
  date: string
  level: number
  lines: number
  commits: number
  tokens: number
  projects: DayProject[]
}

function fmtDisplayDate(dateStr: string): string {
  if (dateStr === localDateStr()) return 'Today'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ActivityGrid({
  history,
  hoveredDate,
  selectedDate,
  onHoverDay,
  onSelectDate
}: {
  history: DayActivity[]
  hoveredDate: string | null
  selectedDate: string | null
  onHoverDay: (day: DayActivity | null) => void
  onSelectDate: (date: string | null) => void
}) {

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

  const days: GridDay[] = []
  for (let i = 29; i >= 0; i--) {
    const dateStr = localDateStrOffset(i)
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
    days.push({ date: dateStr, level, lines, commits, tokens, projects: activity?.projects ?? [] })
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
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const toDayActivity = (day: GridDay): DayActivity => ({
    date: day.date,
    commits: day.commits,
    lines: day.lines,
    tokens: day.tokens,
    projects: day.projects
  })

  const byDate = new Map(days.map(d => [d.date, d]))
  const todayDay = days[days.length - 1]
  const selectedDay = selectedDate ? byDate.get(selectedDate) ?? null : null
  const hoveredDay = hoveredDate ? byDate.get(hoveredDate) ?? null : null

  const toggleSelect = (day: GridDay) => {
    if (day.commits === 0 && day.lines === 0 && day.tokens === 0) {
      onSelectDate(null)
      return
    }
    onSelectDate(selectedDate === day.date ? null : day.date)
  }

  return (
    <div className="no-drag" style={{ position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 4 }}>
        {days.map((day, i) => {
          const isToday = i === days.length - 1
          const isSelected = selectedDate === day.date
          const isHovered = hoveredDate === day.date
          const showBorder = isSelected || isHovered || (!selectedDate && !hoveredDate && isToday)
          const borderColor = isSelected ? 'oklch(0.80 0.15 145)' : 'rgba(255, 255, 255, 0.25)'
          const hasActivity = day.commits > 0 || day.lines > 0 || day.tokens > 0
          return (
            <div
              key={day.date}
              onMouseEnter={() => onHoverDay(toDayActivity(day))}
              onMouseLeave={() => onHoverDay(null)}
              onClick={() => toggleSelect(day)}
              style={{
                aspectRatio: '1',
                borderRadius: 4,
                background: colors[day.level],
                border: showBorder ? `1px solid ${borderColor}` : '1px solid transparent',
                transition: 'border 100ms, background 300ms',
                cursor: hasActivity ? 'pointer' : 'default'
              }}
            />
          )
        })}
      </div>

      {hoveredDay && !selectedDay && hoveredDay.projects.length > 0 && (
        <div style={{
          marginTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 6
        }}>
          <div style={{
            fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em',
            color: 'var(--color-muted-foreground)', marginBottom: 4
          }}>
            {hoveredDay === todayDay ? 'Today' : fmtDate(hoveredDay.date)} · Projects
          </div>
          <div style={{ maxHeight: 72, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }} className="show-scrollbar">
            {hoveredDay.projects.map(p => (
              <div key={p.cwd} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{
                  fontSize: 11, color: 'var(--color-foreground)', fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }} title={p.name}>
                  {p.name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-muted-foreground)', flexShrink: 0 }}>
                  {p.commits}c · {fmt(p.lines)} lines
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDay && (
        <div style={{
          marginTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 6
        }}>
          <div style={{
            fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em',
            color: 'var(--color-muted-foreground)', marginBottom: 4
          }}>
            {selectedDay === todayDay ? 'Today' : fmtDate(selectedDay.date)} · Projects
          </div>
          {selectedDay.projects.length > 0 ? (
            <div style={{ maxHeight: 96, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }} className="show-scrollbar">
              {selectedDay.projects.map(p => (
                <div key={p.cwd} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{
                    fontSize: 11, color: 'var(--color-foreground)', fontWeight: 500,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }} title={p.name}>
                    {p.name}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--color-muted-foreground)', flexShrink: 0 }}>
                    {p.commits}c · {fmt(p.lines)} lines
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: 'var(--color-muted-foreground)', opacity: 0.6 }}>
              No projects recorded
            </div>
          )}
        </div>
      )}
    </div>
  )
}
