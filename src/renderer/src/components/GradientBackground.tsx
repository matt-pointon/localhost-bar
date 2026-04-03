import { ShaderGradientCanvas, ShaderGradient } from 'shadergradient'

export function GradientBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0
      }}
    >
      <ShaderGradientCanvas
        style={{ width: '100%', height: '100%' }}
        pixelDensity={1}
        fov={45}
      >
        <ShaderGradient
          control="props"
          type="waterPlane"
          animate="on"
          uSpeed={0.3}
          uStrength={1.5}
          uDensity={1.8}
          uFrequency={3.5}
          uAmplitude={0.3}
          color1="#ff8f3e"
          color2="#c876e0"
          color3="#5b8fc9"
          positionX={0}
          positionY={0}
          positionZ={0}
          rotationX={0}
          rotationY={0}
          rotationZ={0}
          reflection={0.1}
          wireframe={false}
          grain="off"
          cAzimuthAngle={180}
          cPolarAngle={80}
          cDistance={2.5}
          cameraZoom={1}
          lightType="env"
          brightness={1.6}
          envPreset="dawn"
        />
      </ShaderGradientCanvas>
    </div>
  )
}
