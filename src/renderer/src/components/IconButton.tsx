import type { CSSProperties, MouseEvent, ReactNode } from 'react'

type IconButtonVariant = 'default' | 'destructive'

interface IconButtonProps {
  title: string
  onClick: (e: MouseEvent) => void
  disabled?: boolean
  active?: boolean
  variant?: IconButtonVariant
  children: ReactNode
}

const SIZE = 24

/**
 * Shared hover icon button used across service / offline rows and the
 * quick-actions trigger. Keeps hit area, radius, and hover treatment
 * consistent for a calm shadcn-style action cluster.
 */
export function IconButton({
  title,
  onClick,
  disabled,
  active,
  variant = 'default',
  children
}: IconButtonProps) {
  const restColor = active ? 'var(--color-warning)' : 'var(--color-muted-foreground)'
  const hoverColor = variant === 'destructive' ? 'var(--color-destructive)' : 'var(--color-foreground)'
  const hoverBg = variant === 'destructive' ? 'var(--color-destructive-overlay)' : 'var(--color-hover-overlay)'

  const base: CSSProperties = {
    width: SIZE,
    height: SIZE,
    padding: 0,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: restColor,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'color 120ms ease, background 120ms ease'
  }

  return (
    <button
      title={title}
      disabled={disabled}
      className="no-drag"
      onClick={e => {
        e.stopPropagation()
        if (!disabled) onClick(e)
      }}
      style={base}
      onMouseEnter={e => {
        if (disabled) return
        e.currentTarget.style.color = hoverColor
        e.currentTarget.style.background = hoverBg
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = restColor
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}
