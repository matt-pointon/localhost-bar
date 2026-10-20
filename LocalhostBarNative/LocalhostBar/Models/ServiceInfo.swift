import Foundation

struct ServiceInfo: Identifiable, Equatable {
    var id: Int { pid }

    let pid: Int
    /// Lowest listening port — the one a browser should open.
    let port: Int
    let otherPorts: [Int]
    let name: String
    let command: String
    let cwd: String?
    let repoRoot: String?
    let args: String?
    let executable: String?
    let git: GitStatus?

    var status: ServiceStatus = .running

    var url: URL { URL(string: "http://localhost:\(port)")! }
}

enum ServiceStatus: String {
    case running
    case stopping
}

struct OfflineService: Identifiable, Equatable {
    var id: String { "\(cwd ?? name):\(port)" }

    let port: Int
    let name: String
    let cwd: String?
    let args: String?
    let executable: String?
    let exitedAt: Date
}
