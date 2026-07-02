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
        padding: '8px 16px',
        fontSize: 11, color: 'var(--color-muted-foreground)'
      }}>
        {msg}
      </div>
    )
  }

  return (
    <div style={{ padding: '4px 0' }}>
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => window.electronAPI.openFolder(project.cwd)}
      style={{
        position: 'relative',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        cursor: 'pointer',
        background: hovered ? 'var(--color-hover-overlay)' : 'transparent',
        transition: 'background 120ms ease',
        borderRadius: 8,
        margin: '0 6px'
      }}
    >
      <GitCommit size={12} style={{ color: 'var(--color-status-running)', flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600, color: 'var(--color-foreground)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.35
        }}>
          {project.name}
        </div>
        <div style={{
          fontSize: 10, color: 'var(--color-muted-foreground)', lineHeight: 1.4,
          display: 'flex', gap: 6, alignItems: 'center', marginTop: 2
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
          transition: 'opacity 120ms ease',
          background: 'linear-gradient(to right, rgba(15,19,16,0) 0%, rgb(15,19,16) 28px)',
          borderRadius: 8,
          color: 'var(--color-muted-foreground)'
        }}
      >
        <button
          onClick={() => window.electronAPI.openFolder(project.cwd)}
          title="Open folder"
          className="no-drag"
          style={{
            padding: 4, borderRadius: 6, border: 'none', background: 'transparent',
            cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-hover-overlay)'; e.currentTarget.style.color = 'var(--color-foreground)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-muted-foreground)' }}
        >
          <Folder size={13} />
        </button>
      </div>
    </div>
  )
}
