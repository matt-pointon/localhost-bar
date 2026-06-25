export function GradientBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        background: 'radial-gradient(ellipse at 30% 50%, #1a2e1e 0%, #0d1a16 40%, #060906 100%)',
        opacity: 0.7
      }}
    />
  )
}
