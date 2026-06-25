import { useEffect, useMemo, useState } from 'react'
import { useServices } from './hooks/useServices'
import { useDeployState } from './hooks/useDeployState'
import { useStats } from './hooks/useStats'
import { useTokenStats } from './hooks/useTokenStats'
import { StatsBar } from './components/StatsBar'
import { ServiceList } from './components/ServiceList'
import { EmptyState } from './components/EmptyState'
import { OfflineRow } from './components/OfflineRow'
import { GradientBackground } from './components/GradientBackground'
import { X } from 'lucide-react'
import type { DetectedTool } from './components/QuickActionsMenu'

export default function App() {
  const [availableTools, setAvailableTools] = useState<DetectedTool[]>([])
  const { states: deployStates, deploy, setLastDeploy } = useDeployState()

  useEffect(() => {
    window.electronAPI.getAvailableTools().then(setAvailableTools)
  }, [])

  const {
    services,
    offlineServices,
    isLoading,
    lastUpdated,
    refresh,
    killService,
    openService,
    restartService,
    dismissOffline
  } = useServices()

  const cwds = useMemo(
    () => services.map(s => s.cwd).filter((c): c is string => c !== null),
    [services]
  )
  const stats = useStats(cwds)
  const tokenStats = useTokenStats()

  const hasRunning = services.length > 0
  const hasOffline = offlineServices.length > 0

  return (
    <div
      style={{
        position: 'relative',
        height: '100vh',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.6)'
      }}
    >
      <GradientBackground />

      {/* Close button — top right of panel, above everything */}
      <button
        className="no-drag"
        onClick={() => window.electronAPI.quit()}
        title="Quit"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 20,
          padding: 4,
          borderRadius: 5,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--color-muted-foreground)',
          display: 'flex',
          alignItems: 'center'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-hover-overlay)'; e.currentTarget.style.color = 'var(--color-foreground)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-muted-foreground)' }}
      >
        <X size={12} />
      </button>

      {/* Glass content layer — side by side */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          background: 'rgba(6, 9, 7, 0.88)',
          display: 'flex'
        }}
      >
        {/* Left: Stats + heatmap */}
        <div
          className="drag-region"
          style={{
            width: '44%',
            overflow: 'hidden',
            flexShrink: 0,
            alignSelf: 'stretch'
          }}
        >
          <StatsBar
            stats={stats}
            tokenStats={tokenStats}
            serviceCount={services.length}
            isLoading={isLoading}
            onRefresh={refresh}
          />
        </div>

        {/* Center divider — short, centered */}
        <div style={{
          width: 1,
          height: '60%',
          background: 'rgba(255,255,255,0.06)',
          flexShrink: 0
        }} />

        {/* Right: Project list */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            height: '100%'
          }}
        >
          {/* Title */}
          <div className="drag-region" style={{
            padding: '10px 14px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-muted-foreground)'
            }}>
              {services.length} Project{services.length !== 1 ? 's' : ''} Running
            </span>
          </div>

          <div className="flex-1 overflow-y-auto show-scrollbar">
            {!hasRunning && !hasOffline && !isLoading ? (
              <EmptyState />
            ) : (
              <div>
                {hasRunning && (
                  <ServiceList
                    services={services}
                    onOpen={openService}
                    onKill={killService}
                    availableTools={availableTools}
                    deployStates={deployStates}
                    onDeploy={deploy}
                    onSetLastDeploy={setLastDeploy}
                  />
                )}

                {hasOffline && (
                  <>
                    <div style={{
                      padding: '12px 14px 6px',
                      borderTop: hasRunning ? '1px solid rgba(255,255,255,0.04)' : 'none'
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted-foreground)' }}>
                        Offline
                      </span>
                    </div>
                    <div style={{ padding: '0 8px 8px' }}>
                      {offlineServices.map(service => (
                        <OfflineRow
                          key={service.port}
                          service={service}
                          onRestart={restartService}
                          onDismiss={dismissOffline}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
