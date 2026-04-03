import { useRef, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { TaskInput } from './TaskInput'

interface TaskAccordionProps {
  cwd: string
  tasks: TaskItem[]
  expanded: boolean
  onAdd: (cwd: string, text: string) => void
  onRemove: (cwd: string, taskId: string) => void
}

export function TaskAccordion({ cwd, tasks, expanded, onAdd, onRemove }: TaskAccordionProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  const [newTaskId, setNewTaskId] = useState<string | null>(null)

  // Measure content height whenever tasks change or expansion state changes
  useEffect(() => {
    if (contentRef.current && expanded) {
      setHeight(contentRef.current.scrollHeight)
    }
  }, [expanded, tasks.length, tasks])

  // Track newly added tasks for animation
  const prevCountRef = useRef(tasks.length)
  useEffect(() => {
    if (tasks.length > prevCountRef.current) {
      const newest = tasks[tasks.length - 1]
      setNewTaskId(newest.id)
      const timer = setTimeout(() => setNewTaskId(null), 250)
      if (contentRef.current) {
        requestAnimationFrame(() => {
          if (contentRef.current) setHeight(contentRef.current.scrollHeight)
        })
      }
      return () => clearTimeout(timer)
    }
    prevCountRef.current = tasks.length
  }, [tasks.length])

  return (
    <div
      style={{
        maxHeight: expanded ? `${height}px` : '0px',
        opacity: expanded ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 250ms ease, opacity 200ms ease'
      }}
    >
      <div ref={contentRef} className="pl-7 pr-4 pb-2 pt-0.5">
        {/* Task list */}
        {tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            isNew={task.id === newTaskId}
            onRemove={() => onRemove(cwd, task.id)}
          />
        ))}

        {/* Add task input */}
        <div className="mt-1">
          <TaskInput
            cwd={cwd}
            onAdd={onAdd}
            onCancel={() => {}}
          />
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, isNew, onRemove }: {
  task: TaskItem
  isNew: boolean
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={`flex items-center gap-1.5 py-0.5 ${isNew ? 'task-enter' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={e => e.stopPropagation()}
    >
      {/* Status circle — filled when done by AI, empty when pending */}
      <span
        className="flex-none w-3 h-3 rounded-full flex items-center justify-center"
        style={{
          border: task.done ? 'none' : '1.5px solid var(--color-border)',
          background: task.done ? 'var(--color-task-accent)' : 'transparent',
          transition: 'all 200ms ease'
        }}
      >
        {task.done && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>

      {/* Task text */}
      <span
        className="flex-1 text-[10px] leading-tight truncate"
        style={{
          color: task.done ? 'var(--color-muted-foreground)' : 'var(--color-foreground)',
          textDecoration: task.done ? 'line-through' : 'none',
          opacity: task.done ? 0.6 : 1,
          transition: 'all 150ms ease'
        }}
      >
        {task.text}
      </span>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="flex-none p-0.5 rounded transition-opacity"
        style={{
          opacity: hovered ? 0.6 : 0,
          color: 'var(--color-muted-foreground)'
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-destructive)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.opacity = hovered ? '0.6' : '0'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted-foreground)'
        }}
      >
        <X size={10} />
      </button>
    </div>
  )
}
