import { useEffect, useMemo, useRef, useState } from 'react'
import { useServices } from './hooks/useServices'
import { useDeployState } from './hooks/useDeployState'
import { useStats } from './hooks/useStats'
import { useTokenStats } from './hooks/useTokenStats'
import { useSessions } from './hooks/useSessions'
import { StatsBar } from './components/StatsBar'
import { ServiceList } from './components/ServiceList'
import { DayProjectList } from './components/DayProjectList'
import { EmptyState } from './components/EmptyState'
import { OfflineRow } from './components/OfflineRow'
import { GradientBackground } from './components/GradientBackground'
import { PortConflictBanner } from './components/PortConflictBanner'
import { SearchBar } from './components/SearchBar'
import { SessionsPanel } from './sessions/SessionsPanel'
import { localDateStr } from '../../shared/dates'
import { X, Bell, BellOff } from 'lucide-react'
import { IconButton } from './components/IconButton'
import type { DetectedTool } from './components/QuickActionsMenu'

export default function App() {
  const [availableTools, setAvailableTools] = useState<DetectedTool[]>([])
  const [search, setSearch] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [hoveredDay, setHoveredDay] = useState<DayActivity | null>(null)
  const [view, setView] = useState<'home' | 'sessions'>('home')
  const firstRenderRef = useRef(true)
  useEffect(() => {
    firstRenderRef.current = false
  }, [])
  const { states: deployStates, deploy, setLastDeploy } = useDeployState()

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

  const projects = useMemo(
    () =>
      services
        .filter(s => s.cwd !== null)
        .map(s => ({ cwd: s.cwd as string, name: s.name })),
    [services]
  )
  const stats = useStats(projects)
  const tokenStats = useTokenStats()
  const sessions = useSessions()

  const hasRunning = services.length > 0
  const hasOffline = offlineServices.length > 0

  const toggleNotifications = async () => {
    const next = !notificationsEnabled
    const s = await window.electronAPI.setNotificationsEnabled(next)
    setNotificationsEnabled(s.notificationsEnabled)
  }

  return (
    <div className="panel-shell">
      <GradientBackground />

      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 20, display: 'flex', gap: 2 }}>
        <IconButton
          title={notificationsEnabled ? 'Notifications on' : 'Notifications off'}
          onClick={() => { void toggleNotifications() }}
        >
          {notificationsEnabled ? <Bell size={12} /> : <BellOff size={12} />}
        </IconButton>
        <IconButton title="Quit" onClick={() => window.electronAPI.quit()}>
          <X size={12} />
        </IconButton>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          background: 'var(--color-surface)',
          display: 'flex'
        }}
      >
        <div
          key={view}
          className={
            firstRenderRef.current
              ? undefined
              : view === 'sessions'
                ? 'view-enter-fwd'
                : 'view-enter-back'
          }
          style={{ flex: 1, display: 'flex', minWidth: 0, height: '100%' }}
        >
        {view === 'sessions' ? (
          <SessionsPanel sessions={sessions} onBack={() => setView('home')} />
        ) : (
        <>
        <div
          className="drag-region"
          style={{ width: '44%', overflow: 'hidden', flexShrink: 0, alignSelf: 'stretch' }}
        >
          <StatsBar
            stats={stats}
            tokenStats={tokenStats}
            sessions={sessions}
            serviceCount={services.length}
            isLoading={isLoading}
            onRefresh={refresh}
            onOpenSessions={() => setView('sessions')}
            onHoverDay={setHoveredDay}
          />
        </div>

        <div
          style={{
            width: 1,
            flexShrink: 0,
            alignSelf: 'stretch',
            margin: '12px 0',
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 20%, rgba(255,255,255,0.07) 80%, transparent)'
          }}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
          <div className="drag-region" style={{
            padding: '12px 16px 4px',
            display: 'flex',
            alignItems: 'center',
            minHeight: 28
          }}>
            <span className="section-label">
              {hoveredDay
                ? `${formatDayLabel(hoveredDay.date)} · ${hoveredDay.commits} commit${hoveredDay.commits !== 1 ? 's' : ''} · ${fmtLines(hoveredDay.lines)} lines`
                : `${services.length} Project${services.length !== 1 ? 's' : ''} Running`}
            </span>
          </div>

          {!hoveredDay && <SearchBar value={search} onChange={setSearch} />}
          <PortConflictBanner conflicts={portConflicts} />

          <div className="flex-1 overflow-y-auto show-scrollbar">
            {hoveredDay ? (
              <DayProjectList day={hoveredDay} search={search} />
            ) : !hasRunning && !hasOffline && !isLoading ? (
              <EmptyState />
            ) : (
              <div>
                {hasRunning && (
                  <ServiceList
                    services={services}
                    search={search}
                    onOpen={openService}
                    onKill={killService}
                    availableTools={availableTools}
                    deployStates={deployStates}
                    onDeploy={deploy}
                    onSetLastDeploy={setLastDeploy}
                    onRefresh={refresh}
                  />
                )}

                {hasOffline && (
                  <>
                    <div style={{ padding: hasRunning ? '16px 16px 4px' : '12px 16px 4px' }}>
                      <span className="section-label">Offline</span>
                    </div>
                    <div style={{ padding: '0 0 8px' }}>
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
        </>
        )}
        </div>
      </div>
    </div>
  )
}

function formatDayLabel(dateStr: string): string {
  if (dateStr === localDateStr()) return 'Today'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtLines(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}
