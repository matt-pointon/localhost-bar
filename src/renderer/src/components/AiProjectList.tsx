import { useMemo, useState } from 'react'
import { Folder, Play, Sparkles } from 'lucide-react'
import { ToolBadge } from './ToolIcons'
import { IconButton } from './IconButton'

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface AiProjectListProps {
  projects: AiProject[]
  search: string
  /** Hide projects that already appear as running servers */
  hideRunning?: boolean
}

export function AiProjectList({ projects, search, hideRunning = true }: AiProjectListProps) {
  const filtered = useMemo(() => {
    let list = hideRunning ? projects.filter((p) => !p.hasRunningServer) : projects
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.cwd.toLowerCase().includes(q) ||
        p.tools.some((t) => t.includes(q)) ||
        p.sessions.some((s) => s.title?.toLowerCase().includes(q))
    )
  }, [projects, search, hideRunning])

  if (filtered.length === 0) return null

  return (
    <div>
      <div style={{ padding: '12px 16px 4px' }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-muted-foreground)'
          }}
        >
          Recent AI
        </span>
      </div>
      <div style={{ padding: '0 0 8px' }}>
        {filtered.map((project) => (
          <AiProjectRow key={project.cwd} project={project} />
        ))}
      </div>
    </div>
  )
}

function AiProjectRow({ project }: { project: AiProject }) {
  const [hovered, setHovered] = useState(false)
  const latest = project.sessions[0]
  const sessionCount = project.sessions.length

  const resumeLatest = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!latest) return
    await window.electronAPI.resumeAiSession(latest.tool, latest.sessionId, project.cwd)
  }

  return (
    <div
      className="row-enter"
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
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          flexShrink: 0,
          background: project.isActive ? 'var(--color-status-running)' : 'var(--color-muted-foreground)',
          boxShadow: project.isActive ? '0 0 6px var(--color-status-running)' : 'none'
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--color-foreground)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.35,
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</span>
          <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {project.tools.map((id) => (
              <ToolBadge key={id} toolId={id} active={project.isActive} />
            ))}
          </span>
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--color-muted-foreground)',
            lineHeight: 1.4,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            marginTop: 2,
            opacity: 0.85
          }}
        >
          <Sparkles size={9} style={{ flexShrink: 0, opacity: 0.7 }} />
          <span>
            {sessionCount} session{sessionCount !== 1 ? 's' : ''}
          </span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>{relativeTime(project.lastActiveAt)}</span>
          {latest?.gitBranch && (
            <>
              <span style={{ opacity: 0.3 }}>·</span>
              <span
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 80
                }}
              >
                {latest.gitBranch}
              </span>
            </>
          )}
        </div>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          paddingLeft: 34,
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? 'auto' : 'none',
          transition: 'opacity 120ms ease',
          background: 'linear-gradient(to right, rgba(15,19,16,0) 0%, rgb(15,19,16) 38px)',
          borderRadius: 8
        }}
      >
        <IconButton title="Open folder" onClick={() => window.electronAPI.openFolder(project.cwd)}>
          <Folder size={13} />
        </IconButton>
        {latest && (
          <IconButton
            title={
              latest.tool === 'cursor'
                ? 'Open in Cursor'
                : `Resume ${latest.tool === 'claude' ? 'Claude' : 'Codex'} session`
            }
            onClick={resumeLatest}
          >
            <Play size={13} />
          </IconButton>
        )}
      </div>
    </div>
  )
}
