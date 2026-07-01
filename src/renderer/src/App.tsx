import { useEffect, useMemo, useState } from 'react'
import { useServices } from './hooks/useServices'
import { useDeployState } from './hooks/useDeployState'
import { useStats } from './hooks/useStats'
import { useTokenStats } from './hooks/useTokenStats'
import { useLicense } from './hooks/useLicense'
import { StatsBar } from './components/StatsBar'
import { ServiceList } from './components/ServiceList'
import { EmptyState } from './components/EmptyState'
import { OfflineRow } from './components/OfflineRow'
import { GradientBackground } from './components/GradientBackground'
import { PortConflictBanner } from './components/PortConflictBanner'
import { SearchBar } from './components/SearchBar'
import { LicenseModal } from './components/LicenseModal'
import { X, Bell, BellOff } from 'lucide-react'
import type { DetectedTool } from './components/QuickActionsMenu'

export default function App() {
  const [availableTools, setAvailableTools] = useState<DetectedTool[]>([])
  const [search, setSearch] = useState('')
  const [showLicense, setShowLicense] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const { states: deployStates, deploy, setLastDeploy } = useDeployState()
  const { isPro, activate } = useLicense()

  useEffect(() => {
    window.electronAPI.getAvailableTools().then(setAvailableTools)
    window.electronAPI.getSettings().then(s => setNotificationsEnabled(s.notificationsEnabled))
  }, [])

  const {
    services,
    offlineServices,
    portConflicts,
    isLoading,
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
  const stats = useStats(cwds, isPro)
  const tokenStats = useTokenStats(isPro)

  const hasRunning = services.length > 0
  const hasOffline = offlineServices.length > 0

  const toggleNotifications = async () => {
    const next = !notificationsEnabled
    const s = await window.electronAPI.setNotificationsEnabled(next)
    setNotificationsEnabled(s.notificationsEnabled)
  }

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

      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 20, display: 'flex', gap: 2 }}>
        <button
          className="no-drag"
          onClick={toggleNotifications}
          title={notificationsEnabled ? 'Notifications on' : 'Notifications off'}
          style={{
            padding: 4, borderRadius: 5, border: 'none', background: 'transparent',
            cursor: 'pointer', color: 'var(--color-muted-foreground)', display: 'flex'
          }}
        >
          {notificationsEnabled ? <Bell size={12} /> : <BellOff size={12} />}
        </button>
        <button
          className="no-drag"
          onClick={() => window.electronAPI.quit()}
          title="Quit"
          style={{
            padding: 4, borderRadius: 5, border: 'none', background: 'transparent',
            cursor: 'pointer', color: 'var(--color-muted-foreground)', display: 'flex'
          }}
        >
          <X size={12} />
        </button>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          background: 'rgba(6, 9, 7, 0.88)',
          display: 'flex'
        }}
      >
        <div
          className="drag-region"
          style={{ width: '44%', overflow: 'hidden', flexShrink: 0, alignSelf: 'stretch' }}
        >
          <StatsBar
            stats={stats}
            tokenStats={tokenStats}
            serviceCount={services.length}
            isLoading={isLoading}
            isPro={isPro}
            onRefresh={refresh}
            onUpgrade={() => setShowLicense(true)}
          />
        </div>

        <div style={{ width: 1, height: '60%', background: 'rgba(255,255,255,0.06)', flexShrink: 0, alignSelf: 'center' }} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
          <div className="drag-region" style={{
            padding: '10px 14px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              fontSize: 10, fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--color-muted-foreground)'
            }}>
              {services.length} Project{services.length !== 1 ? 's' : ''} Running
            </span>
            {!isPro && (
              <button
                className="no-drag"
                onClick={() => setShowLicense(true)}
                style={{
                  fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                  border: '1px solid var(--color-status-ai)', background: 'transparent',
                  color: 'var(--color-status-ai)', cursor: 'pointer'
                }}
              >
                Pro
              </button>
            )}
          </div>

          <SearchBar value={search} onChange={setSearch} />
          <PortConflictBanner conflicts={portConflicts} />

          <div className="flex-1 overflow-y-auto show-scrollbar">
            {!hasRunning && !hasOffline && !isLoading ? (
              <EmptyState />
            ) : (
              <div>
                {hasRunning && (
                  <ServiceList
                    services={services}
                    search={search}
                    isPro={isPro}
                    onOpen={openService}
                    onKill={killService}
                    availableTools={availableTools}
                    deployStates={deployStates}
                    onDeploy={deploy}
                    onSetLastDeploy={setLastDeploy}
                    onUpgrade={() => setShowLicense(true)}
                    onRefresh={refresh}
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

      <LicenseModal
        open={showLicense}
        onClose={() => setShowLicense(false)}
        onActivate={activate}
      />
    </div>
  )
}
