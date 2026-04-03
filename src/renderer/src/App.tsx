import { useEffect, useMemo, useState } from 'react'
import { useServices } from './hooks/useServices'
import { useDeployState } from './hooks/useDeployState'
import { useTasks } from './hooks/useTasks'
import { useStats } from './hooks/useStats'
import { Header } from './components/Header'
import { StatsBar } from './components/StatsBar'
import { ServiceList } from './components/ServiceList'
import { EmptyState } from './components/EmptyState'
import { OfflineRow } from './components/OfflineRow'
import { GradientBackground } from './components/GradientBackground'
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
  const { tasks, addTask, removeTask } = useTasks(cwds)
  const stats = useStats(cwds)

  const hasRunning = services.length > 0
  const hasOffline = offlineServices.length > 0

  return (
    <div
      style={{
        position: 'relative',
        height: '100vh',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1.5px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(255,255,255,0.05)'
      }}
    >
      {/* Shader gradient — full window background */}
      <GradientBackground />

      {/* Glass content layer */}
      <div
        className="flex flex-col"
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          background: 'rgba(10, 10, 10, 0.3)',
          backdropFilter: 'blur(60px) saturate(1.8) brightness(0.9)',
          WebkitBackdropFilter: 'blur(60px) saturate(1.8) brightness(0.9)'
        }}
      >
        <Header
          serviceCount={services.length}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
        />
        {stats && <StatsBar stats={stats} />}

        <div className="flex-1 overflow-y-auto">
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
                tasks={tasks}
                onAddTask={addTask}
                onRemoveTask={removeTask}
              />
              )}

              {hasOffline && (
                <>
                  <div
                    className="flex items-center px-4 pt-3 pb-1"
                    style={{
                      borderTop: hasRunning ? '1px solid rgba(255,255,255,0.04)' : 'none'
                    }}
                  >
                    <span
                      className="text-[11px] font-medium uppercase tracking-wider"
                      style={{ color: 'var(--color-muted-foreground)' }}
                    >
                      Offline
                    </span>
                  </div>
                  {offlineServices.map(service => (
                    <OfflineRow
                      key={service.port}
                      service={service}
                      onRestart={restartService}
                      onDismiss={dismissOffline}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
