import { useState } from 'react'
import { Folder, GitCommit } from 'lucide-react'
import { IconButton } from './IconButton'

function fmt(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

interface DayProjectListProps {
  day: DayActivity
  search: string
}

export function DayProjectList({ day, search }: DayProjectListProps) {
  const q = search.trim().toLowerCase()
  const projects = q
    ? day.projects.filter(p => p.name.toLowerCase().includes(q) || p.cwd.toLowerCase().includes(q))
    : day.projects

  if (projects.length === 0) {
    const msg = day.tokens > 0
      ? 'AI activity only — no commits this day'
      : 'No project activity on this day'
    return (
      <div style={{
        padding: '10px 16px',
        fontSize: 11, color: 'var(--color-muted-foreground)', lineHeight: 1.4
      }}>
        {msg}
      </div>
    )
  }

  return (
    <div style={{ padding: '2px 0 4px' }}>
      {projects.map(project => (
        <ProjectRow key={project.cwd} project={project} />
      ))}
    </div>
  )
}

function ProjectRow({ project }: { project: DayProject }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onClick={() => window.electronAPI.openFolder(project.cwd)}
      style={{
        position: 'relative',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        cursor: 'pointer',
        background: pressed
          ? 'var(--color-press-overlay)'
          : hovered
            ? 'var(--color-hover-overlay)'
            : 'transparent',
        transition: 'background var(--duration-fast) ease',
        borderRadius: 8,
        margin: '0 8px'
      }}
    >
      <GitCommit size={12} style={{ color: 'var(--color-status-running)', flexShrink: 0, opacity: 0.9 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600, color: 'var(--color-foreground)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.35, letterSpacing: '-0.015em'
        }}>
          {project.name}
        </div>
        <div style={{
          fontSize: 10, color: 'var(--color-muted-foreground)', lineHeight: 1.4,
          display: 'flex', gap: 6, alignItems: 'center', marginTop: 2
        }}>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {project.commits} commit{project.commits !== 1 ? 's' : ''}
          </span>
          {project.lines > 0 && (
            <>
              <span style={{ opacity: 0.3 }}>·</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(project.lines)} lines</span>
            </>
          )}
        </div>
      </div>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 8,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 24,
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? 'auto' : 'none',
          transition: 'opacity var(--duration-fast) ease',
          background: 'linear-gradient(to right, transparent 0%, var(--color-row-fade) 28px)',
          borderRadius: 8
        }}
      >
        <IconButton title="Open folder" onClick={() => window.electronAPI.openFolder(project.cwd)}>
          <Folder size={13} />
        </IconButton>
      </div>
    </div>
  )
}
