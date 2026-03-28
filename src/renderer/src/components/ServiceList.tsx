import { ServiceRow } from './ServiceRow'
import type { ServiceInfo } from '../hooks/useServices'
import type { InstalledTools } from './QuickActionsMenu'
import type { DeployTarget, DeployRecord, DeployState } from '../hooks/useDeployState'

interface ServiceListProps {
  services: ServiceInfo[]
  onOpen: (port: number) => void
  onKill: (pid: number) => void
  installedTools: InstalledTools
  deployStates: Map<string, DeployState>
  onDeploy: (cwd: string, target: DeployTarget) => void
  onSetLastDeploy: (cwd: string, record: DeployRecord) => void
}

export function ServiceList({ services, onOpen, onKill, installedTools, deployStates, onDeploy, onSetLastDeploy }: ServiceListProps) {
  return (
    <div>
      {services.map(service => (
        <ServiceRow
          key={`${service.pid}-${service.port}`}
          service={service}
          onOpen={onOpen}
          onKill={onKill}
          installedTools={installedTools}
          deployState={service.cwd ? deployStates.get(service.cwd) : undefined}
          onDeploy={onDeploy}
          onSetLastDeploy={onSetLastDeploy}
        />
      ))}
    </div>
  )
}
