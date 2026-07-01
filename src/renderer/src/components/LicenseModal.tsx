import { useState } from 'react'
import { X } from 'lucide-react'

interface LicenseModalProps {
  open: boolean
  onClose: () => void
  onActivate: (key: string) => Promise<{ success: boolean; error?: string }>
}

export function LicenseModal({ open, onClose, onActivate }: LicenseModalProps) {
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    const result = await onActivate(key)
    setLoading(false)
    if (result.success) {
      setKey('')
      onClose()
    } else {
      setError(result.error ?? 'Activation failed')
    }
  }

  return (
    <>
      <div
        className="no-drag"
        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div
        className="no-drag"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: 280,
          padding: 16,
          borderRadius: 12,
          background: 'rgba(12, 14, 12, 0.96)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)' }}>Activate Pro</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}>
            <X size={14} />
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-muted-foreground)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Unlock stats, deploy, git actions, tasks, and share cards.
        </p>
        <input
          type="text"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="LB-XXXX-XXXX-XXXX"
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: 12,
            borderRadius: 6,
            border: '1px solid var(--color-border)',
            background: 'var(--color-input-bg)',
            color: 'var(--color-foreground)',
            outline: 'none',
            marginBottom: 8,
            boxSizing: 'border-box'
          }}
        />
        {error && (
          <p style={{ fontSize: 10, color: 'var(--color-destructive)', margin: '0 0 8px' }}>{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || !key.trim()}
          style={{
            width: '100%',
            padding: '8px 0',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: 'none',
            cursor: loading ? 'default' : 'pointer',
            background: 'var(--color-status-running)',
            color: 'rgba(0,0,0,0.85)',
            opacity: loading || !key.trim() ? 0.5 : 1
          }}
        >
          {loading ? 'Activating…' : 'Activate'}
        </button>
      </div>
    </>
  )
}
