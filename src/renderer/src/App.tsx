import { useEffect, useMemo, useState } from 'react'
import { useServices } from './hooks/useServices'
import { useDeployState } from './hooks/useDeployState'
import { useTasks } from './hooks/useTasks'
import { Header } from './components/Header'
import { ServiceList } from './components/ServiceList'
import { EmptyState } from './components/EmptyState'
import { OfflineRow } from './components/OfflineRow'
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

  const hasRunning = services.length > 0
  const hasOffline = offlineServices.length > 0

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: '100vh',
        background: 'var(--color-background)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)'
      }}
    >
      <Header
        serviceCount={services.length}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
      />

      <div className="flex-1 overflow-y-auto">
        {!hasRunning && !hasOffline && !isLoading ? (
          <EmptyState />
        ) : (
          <div className="py-1">
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
                    borderTop: hasRunning ? '1px solid var(--color-border)' : 'none',
                    marginTop: hasRunning ? '4px' : 0
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
  )
}
