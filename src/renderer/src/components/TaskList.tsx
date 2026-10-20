import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, X, Check } from 'lucide-react'
import type { Task } from '../../../preload/index'

interface TaskListProps {
  cwd: string
  tasks: Task[]
  onAdd: (text: string) => Promise<{ success: boolean; error?: string }>
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export function TaskList({ tasks, onAdd, onToggle, onRemove }: TaskListProps) {
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [toggleHover, setToggleHover] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const openCount = tasks.filter(t => !t.done).length

  useEffect(() => {
    if (expanded && inputRef.current) inputRef.current.focus()
  }, [expanded])

  const handleAdd = async () => {
    if (!input.trim()) return
    const result = await onAdd(input.trim())
    if (result.success) setInput('')
  }

  return (
    <div className="no-drag" style={{ margin: '0 8px 2px 26px' }}>
      <button
        onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
        onMouseEnter={() => setToggleHover(true)}
        onMouseLeave={() => setToggleHover(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 4px',
          marginLeft: -4,
          border: 'none',
          background: toggleHover ? 'var(--color-hover-overlay)' : 'transparent',
          borderRadius: 5,
          cursor: 'pointer',
          fontSize: 9.5,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: toggleHover ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
          transition: 'color var(--duration-fast) ease, background var(--duration-fast) ease'
        }}
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <span>
          Tasks{openCount > 0 ? ` (${openCount})` : ''}
        </span>
      </button>

      {expanded && (
        <div className="detail-expand" style={{ paddingLeft: 12, paddingBottom: 4 }}>
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }} onClick={e => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Add task…"
              style={{
                flex: 1,
                fontSize: 10,
                padding: '4px 7px',
                border: `1px solid ${inputFocused ? 'rgba(255,255,255,0.16)' : 'var(--color-border)'}`,
                borderRadius: 5,
                background: inputFocused ? 'rgba(255,255,255,0.05)' : 'transparent',
                color: 'var(--color-foreground)',
                outline: 'none',
                minWidth: 0,
                boxShadow: inputFocused ? '0 0 0 2px rgba(255,255,255,0.04)' : 'none',
                transition: 'border-color var(--duration-fast) ease, background var(--duration-fast) ease, box-shadow var(--duration-fast) ease'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function TaskRow({
  task,
  onToggle,
  onRemove
}: {
  task: Task
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="task-enter"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '3px 2px',
        borderRadius: 4,
        background: hovered ? 'var(--color-hover-overlay)' : 'transparent',
        fontSize: 10.5,
        color: task.done ? 'var(--color-muted-foreground)' : 'var(--color-foreground)',
        opacity: task.done ? 0.55 : 1,
        transition: 'background var(--duration-fast) ease, opacity var(--duration-fast) ease'
      }}
    >
      <button
        type="button"
        aria-checked={task.done}
        role="checkbox"
        onClick={e => { e.stopPropagation(); onToggle(task.id) }}
        style={{
          width: 12,
          height: 12,
          borderRadius: 3.5,
          border: task.done
            ? '1px solid color-mix(in oklab, var(--color-status-running) 70%, transparent)'
            : '1px solid rgba(255,255,255,0.18)',
          background: task.done
            ? 'color-mix(in oklab, var(--color-status-running) 55%, transparent)'
            : 'transparent',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background var(--duration-fast) ease, border-color var(--duration-fast) ease'
        }}
      >
        {task.done && (
          <Check size={8} strokeWidth={3} className="check-pop" style={{ color: 'var(--color-foreground)' }} />
        )}
      </button>
      <span style={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textDecoration: task.done ? 'line-through' : 'none',
        letterSpacing: '-0.01em'
      }}>
        {task.text}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onRemove(task.id) }}
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--color-muted-foreground)',
          padding: 2,
          display: 'flex',
          opacity: hovered ? 0.85 : 0,
          transition: 'opacity var(--duration-fast) ease',
          borderRadius: 4
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-destructive)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted-foreground)' }}
      >
        <X size={10} />
      </button>
    </div>
  )
}
