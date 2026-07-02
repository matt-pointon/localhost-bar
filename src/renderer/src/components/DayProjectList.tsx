import { GitCommit, Folder } from 'lucide-react'
import { useState } from 'react'

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
        padding: '24px 16px', textAlign: 'center',
        fontSize: 11, color: 'var(--color-muted-foreground)'
      }}>
        {msg}
      </div>
    )
  }

  return (
    <div style={{ padding: '6px 0' }}>
      {projects.map(project => (
        <ProjectRow key={project.cwd} project={project} />
      ))}
    </div>
  )
}

function ProjectRow({ project }: { project: DayProject }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="row-enter"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => window.electronAPI.openFolder(project.cwd)}
      style={{
        padding: '7px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'background 100ms',
        borderRadius: 6,
        margin: '0 4px'
      }}
    >
      <GitCommit size={12} style={{ color: 'var(--color-status-running)', flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3
        }}>
          {project.name}
        </div>
        <div style={{
          fontSize: 9, color: 'var(--color-muted-foreground)', lineHeight: 1.2,
          display: 'flex', gap: 5, alignItems: 'center', marginTop: 1
        }}>
          <span>{project.commits} commit{project.commits !== 1 ? 's' : ''}</span>
          {project.lines > 0 && (
            <>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>{fmt(project.lines)} lines</span>
            </>
          )}
        </div>
      </div>

      <div style={{ opacity: hovered ? 1 : 0, transition: 'opacity 100ms', color: 'var(--color-muted-foreground)', display: 'flex' }}>
        <Folder size={12} />
      </div>
    </div>
  )
}
