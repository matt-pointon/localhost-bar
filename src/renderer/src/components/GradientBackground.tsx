export function GradientBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        background:
          'radial-gradient(ellipse 80% 70% at 28% 42%, rgba(36, 58, 42, 0.55) 0%, transparent 58%),' +
          'radial-gradient(ellipse 60% 50% at 85% 90%, rgba(18, 32, 28, 0.4) 0%, transparent 50%),' +
          'linear-gradient(180deg, #0a100c 0%, #060906 100%)',
        opacity: 0.85
      }}
    />
  )
}
