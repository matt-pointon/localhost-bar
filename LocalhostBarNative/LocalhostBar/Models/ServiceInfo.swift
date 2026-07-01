import Foundation

struct ServiceInfo: Identifiable, Equatable {
    var id: String { "\(pid)-\(port)" }
    
    let pid: Int
    let port: Int
    let name: String
    let command: String
    let address: String
    let cwd: String?
    let args: String?
    let git: GitStatus?
    let resources: ResourceUsage?
    
    var status: ServiceStatus = .running
}

enum ServiceStatus: String {
    case running
    case stopping
    case exiting
}

struct ResourceUsage: Equatable {
    let cpu: Double   // percentage (0-100+)
    let mem: Int      // RSS in MB
}

struct OfflineService: Identifiable, Equatable {
    var id: String { "\(port)" }
    
    let port: Int
    let name: String
    let cwd: String?
    let args: String?
    let exitedAt: Date
}
