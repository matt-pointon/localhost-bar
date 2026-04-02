import { ExternalLink, Folder, Square, Circle, CircleCheckBig } from 'lucide-react'
import type { ServiceInfo } from '../hooks/useServices'
import { QuickActionsMenu } from './QuickActionsMenu'
import type { DetectedTool } from './QuickActionsMenu'
import type { DeployTarget, DeployRecord, DeployState } from '../hooks/useDeployState'
import { TaskAccordion } from './TaskAccordion'
import { useState } from 'react'

interface ServiceRowProps {
  service: ServiceInfo
  onOpen: (port: number) => void
  onKill: (pid: number) => void
  availableTools: DetectedTool[]
  deployState?: DeployState
  onDeploy: (cwd: string, target: DeployTarget) => void
  onSetLastDeploy: (cwd: string, record: DeployRecord) => void
  tasks: TaskItem[]
  expanded: boolean
  onToggleExpand: () => void
  onAddTask: (cwd: string, text: string) => void
  onRemoveTask: (cwd: string, taskId: string) => void
}

export function ServiceRow({ service, onOpen, onKill, availableTools, deployState, onDeploy, onSetLastDeploy, tasks, expanded, onToggleExpand, onAddTask, onRemoveTask }: ServiceRowProps) {
  const [hovered, setHovered] = useState(false)
  const isStopping = service.status === 'stopping'
  const taskCount = tasks.length
  const doneCount = tasks.filter(t => t.done).length

  return (
    <div className={service.status === 'exiting' ? 'row-exit' : 'row-enter'}>
      {/* Main clickable row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !isStopping && onOpen(service.port)}
        onKeyDown={e => e.key === 'Enter' && !isStopping && onOpen(service.port)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          opacity: isStopping ? 0.5 : 1,
          cursor: isStopping ? 'not-allowed' : 'pointer',
          background: hovered ? 'var(--color-accent)' : 'transparent',
          transition: 'background 100ms'
        }}
        className="flex items-center gap-3 px-4 py-2.5"
      >
        {/* Status dot */}
        <span
          className={`flex-none w-1.5 h-1.5 rounded-full transition-colors ${isStopping ? 'animate-pulse' : ''}`}
          style={{
            background: isStopping ? 'var(--color-status-stopping)' : 'var(--color-status-running)'
          }}
        />

        {/* Name + command + git */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-medium truncate leading-tight"
            style={{ color: 'var(--color-foreground)' }}
          >
            {service.name}
          </p>
          <p
            className="text-[11px] truncate leading-tight mt-0.5"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            {service.command}
          </p>
          {service.git && (
            <p
              className="text-[10px] truncate leading-tight mt-0.5 flex items-center gap-1"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              <span>{service.git.branch}</span>
              {service.git.changes > 0 && (
                <>
                  <span>·</span>
                  <span style={{ color: '#f59e0b' }}>{service.git.changes} change{service.git.changes !== 1 ? 's' : ''}</span>
                </>
              )}
              {service.git.lastCommit && (
                <>
                  <span>·</span>
                  <span style={{ opacity: 0.6 }}>last commit:</span>
                  <span className="truncate">"{service.git.lastCommit}"</span>
                </>
              )}
            </p>
          )}
        </div>

        {/* Port badge */}
        <span
          className="flex-none text-[12px] font-mono px-1.5 py-0.5 rounded"
          style={{
            color: 'var(--color-muted-foreground)',
            background: 'var(--color-muted)'
          }}
        >
          :{service.port}
        </span>

        {/* Action buttons — visible on hover */}
        <div
          className="flex-none flex items-center gap-1 transition-opacity"
          style={{ opacity: hovered ? 1 : 0 }}
        >
          {service.cwd && (
            <QuickActionsMenu
              cwd={service.cwd}
              tools={availableTools}
              deployState={deployState}
              onDeploy={onDeploy}
              onSetLastDeploy={onSetLastDeploy}
            />
          )}
          {/* Tasks toggle button */}
          {service.cwd && (
            <button
              title={taskCount > 0 ? `${doneCount}/${taskCount} tasks` : 'Add tasks'}
              onClick={e => {
                e.stopPropagation()
                onToggleExpand()
              }}
              className="p-1 rounded transition-colors flex items-center gap-0.5"
              style={{ color: taskCount > 0 ? '#8b5cf6' : 'var(--color-muted-foreground)' }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.color = taskCount > 0 ? '#7c3aed' : 'var(--color-foreground)'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.color = taskCount > 0 ? '#8b5cf6' : 'var(--color-muted-foreground)'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              {taskCount > 0 && doneCount === taskCount ? (
                <CircleCheckBig size={12} />
              ) : (
                <Circle size={12} />
              )}
              {taskCount > 0 && (
                <span className="text-[9px] font-medium">{doneCount}/{taskCount}</span>
              )}
            </button>
          )}
          {service.cwd && (
            <button
              title="Open in Finder"
              onClick={e => {
                e.stopPropagation()
                window.electronAPI.openFolder(service.cwd!)
              }}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--color-muted-foreground)' }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-foreground)'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted-foreground)'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              <Folder size={12} />
            </button>
          )}
          <button
            title={`Open localhost:${service.port}`}
            onClick={e => {
              e.stopPropagation()
              onOpen(service.port)
            }}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--color-muted-foreground)' }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-foreground)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted-foreground)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            <ExternalLink size={12} />
          </button>
          <button
            title="Stop process"
            onClick={e => {
              e.stopPropagation()
              onKill(service.pid)
            }}
            disabled={isStopping}
            className="p-1 rounded transition-colors disabled:pointer-events-none"
            style={{ color: 'var(--color-muted-foreground)' }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-destructive)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.08)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted-foreground)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            <Square size={12} />
          </button>
        </div>
      </div>

      {/* Task accordion */}
      {service.cwd && (
        <TaskAccordion
          cwd={service.cwd}
          tasks={tasks}
          expanded={expanded}
          onAdd={onAddTask}
          onRemove={onRemoveTask}
        />
      )}
    </div>
  )
}
