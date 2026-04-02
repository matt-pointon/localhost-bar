import { useState, useRef, useEffect } from 'react'

interface TaskInputProps {
  cwd: string
  onAdd: (cwd: string, text: string) => void
  onCancel: () => void
}

export function TaskInput({ cwd, onAdd, onCancel }: TaskInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (trimmed) {
      onAdd(cwd, trimmed)
      setText('')
      // Keep input open for rapid entry
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      maxLength={200}
      value={text}
      onChange={e => setText(e.target.value)}
      onKeyDown={e => {
        e.stopPropagation()
        if (e.key === 'Enter') handleSubmit()
        if (e.key === 'Escape') onCancel()
      }}
      onClick={e => e.stopPropagation()}
      placeholder="Add a task..."
      className="w-full text-[10px] leading-tight px-1.5 py-1 rounded outline-none"
      style={{
        color: 'var(--color-foreground)',
        background: 'rgba(0,0,0,0.04)',
        border: '1px solid var(--color-border)',
        caretColor: 'var(--color-foreground)'
      }}
    />
  )
}
