import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import type { Task } from '../../../preload/index'

interface TaskListProps {
  cwd: string
  tasks: Task[]
  onAdd: (text: string) => Promise<{ success: boolean; error?: string }>
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export function TaskList({ cwd, tasks, onAdd, onToggle, onRemove }: TaskListProps) {
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
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
    <div className="no-drag" style={{ margin: '0 4px 2px 22px' }}>
      <button
        onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 0',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 9,
          color: 'var(--color-muted-foreground)'
        }}
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <span>
          Tasks{openCount > 0 ? ` (${openCount})` : ''}
        </span>
      </button>

      {expanded && (
        <div className="detail-expand" style={{ paddingLeft: 14, paddingBottom: 4 }}>
          {tasks.map(task => (
            <div key={task.id} className="task-enter" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 0',
              fontSize: 10,
              color: task.done ? 'var(--color-muted-foreground)' : 'var(--color-foreground)',
              textDecoration: task.done ? 'line-through' : 'none',
              opacity: task.done ? 0.6 : 1
            }}>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => onToggle(task.id)}
                onClick={e => e.stopPropagation()}
                style={{ width: 11, height: 11, cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.text}
              </span>
              <button
                onClick={e => { e.stopPropagation(); onRemove(task.id) }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted-foreground)', padding: 0, display: 'flex' }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }} onClick={e => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="Add task…"
              style={{
                flex: 1,
                fontSize: 10,
                padding: '3px 6px',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                background: 'transparent',
                color: 'var(--color-foreground)',
                outline: 'none',
                minWidth: 0
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
