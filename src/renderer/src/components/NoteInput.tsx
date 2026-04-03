import { useState, useRef, useEffect } from 'react'

interface NoteInputProps {
  cwd: string
  initialText: string
  onSave: (cwd: string, text: string) => void
  onClear: (cwd: string) => void
  onCancel: () => void
}

export function NoteInput({ cwd, initialText, onSave, onClear, onCancel }: NoteInputProps) {
  const [text, setText] = useState(initialText)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (trimmed) {
      onSave(cwd, trimmed)
    } else {
      onClear(cwd)
    }
    onCancel()
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
      onBlur={handleSubmit}
      placeholder="Add a note for AI tools..."
      className="w-full text-[10px] leading-tight mt-0.5 px-1 py-0.5 rounded outline-none"
      style={{
        color: 'var(--color-foreground)',
        background: 'var(--color-input-bg)',
        border: '1px solid var(--color-border)',
        caretColor: 'var(--color-foreground)'
      }}
    />
  )
}
