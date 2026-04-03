interface StatsBarProps {
  stats: DailyStats
}

export function StatsBar({ stats }: StatsBarProps) {
  const { commitsToday, linesChangedToday, activeProjects, streakDays } = stats

  if (commitsToday === 0 && linesChangedToday === 0 && activeProjects === 0) {
    return null
  }

  const lines: { value: number; label: string }[] = []

  if (linesChangedToday > 0) {
    lines.push({ value: linesChangedToday, label: linesChangedToday === 1 ? 'Line' : 'Lines' })
  }

  if (commitsToday > 0) {
    lines.push({ value: commitsToday, label: commitsToday === 1 ? 'Commit' : 'Commits' })
  }

  if (streakDays >= 1) {
    lines.push({ value: streakDays, label: 'Day Streak' })
  }

  lines.push({ value: activeProjects, label: activeProjects === 1 ? 'Project' : 'Projects' })

  return (
    <div
      style={{
        padding: '10px 16px 8px',
        background: 'rgba(15,15,15,0.75)',
        backdropFilter: 'blur(50px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(50px) saturate(1.4)',
        borderBottom: '1px solid rgba(255,255,255,0.04)'
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: 24,
            lineHeight: 1.15,
            color: 'var(--color-foreground)',
            letterSpacing: '-0.02em'
          }}
        >
          {line.value.toLocaleString()} {line.label}
        </div>
      ))}
    </div>
  )
}
