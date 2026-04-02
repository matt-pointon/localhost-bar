import { useState, useCallback } from 'react'
import { ServiceRow } from './ServiceRow'
import type { ServiceInfo } from '../hooks/useServices'
import type { DetectedTool } from './QuickActionsMenu'
import type { DeployTarget, DeployRecord, DeployState } from '../hooks/useDeployState'

interface ServiceListProps {
  services: ServiceInfo[]
  onOpen: (port: number) => void
  onKill: (pid: number) => void
  availableTools: DetectedTool[]
  deployStates: Map<string, DeployState>
  onDeploy: (cwd: string, target: DeployTarget) => void
  onSetLastDeploy: (cwd: string, record: DeployRecord) => void
  tasks: Map<string, TaskItem[]>
  onAddTask: (cwd: string, text: string) => void
  onRemoveTask: (cwd: string, taskId: string) => void
}

export function ServiceList({ services, onOpen, onKill, availableTools, deployStates, onDeploy, onSetLastDeploy, tasks, onAddTask, onRemoveTask }: ServiceListProps) {
  const [expandedCwds, setExpandedCwds] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((cwd: string) => {
    setExpandedCwds(prev => {
      const next = new Set(prev)
      if (next.has(cwd)) next.delete(cwd)
      else next.add(cwd)
      return next
    })
  }, [])

  return (
    <div>
      {services.map(service => (
        <ServiceRow
          key={`${service.pid}-${service.port}`}
          service={service}
          onOpen={onOpen}
          onKill={onKill}
          availableTools={availableTools}
          deployState={service.cwd ? deployStates.get(service.cwd) : undefined}
          onDeploy={onDeploy}
          onSetLastDeploy={onSetLastDeploy}
          tasks={service.cwd ? tasks.get(service.cwd) ?? [] : []}
          expanded={service.cwd ? expandedCwds.has(service.cwd) : false}
          onToggleExpand={() => service.cwd && toggleExpand(service.cwd)}
          onAddTask={onAddTask}
          onRemoveTask={onRemoveTask}
        />
      ))}
    </div>
  )
}
