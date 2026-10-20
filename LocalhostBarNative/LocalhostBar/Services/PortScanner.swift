import Foundation
import Combine

@MainActor
final class PortScanner: ObservableObject {
    static let shared = PortScanner()

    @Published private(set) var services: [ServiceInfo] = []
    @Published private(set) var offlineServices: [OfflineService] = []
    /// False until the first scan finishes — lets the panel tell "loading" from "nothing running".
    @Published private(set) var hasScanned = false
    @Published private(set) var scanFailed = false

    private var timer: Timer?
    private var isScanning = false
    private let interval: TimeInterval = 3
    private let maxOffline = 5

    /// Called at launch, not when the panel opens, so the menu bar count is live and
    /// servers that stop while the panel is closed still show up under "Stopped".
    func start() {
        guard timer == nil else { return }
        Task { await scan() }
        let timer = Timer(timeInterval: interval, repeats: true) { [weak self] _ in
            Task { @MainActor in await self?.scan() }
        }
        timer.tolerance = 0.5
        // .common keeps it firing while a menu is open.
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    func scan() async {
        guard !isScanning else { return }
        isScanning = true
        defer { isScanning = false }

        let found: [ServiceInfo]
        do {
            found = try await ServiceDiscovery.discover()
        } catch {
            scanFailed = true
            hasScanned = true
            return
        }

        let stopping = Set(services.filter { $0.status == .stopping }.map(\.pid))
        let next = found.map { service -> ServiceInfo in
            var service = service
            if stopping.contains(service.pid) { service.status = .stopping }
            return service
        }

        trackOffline(previous: services, current: next)

        if services != next { services = next }
        scanFailed = false
        hasScanned = true
    }

    private func trackOffline(previous: [ServiceInfo], current: [ServiceInfo]) {
        let livePids = Set(current.map(\.pid))
        var offline = offlineServices

        for gone in previous where !livePids.contains(gone.pid) {
            guard gone.cwd != nil, gone.args != nil else { continue }
            // Same project back on the same port (e.g. a watcher restart) isn't "stopped".
            if current.contains(where: { $0.port == gone.port && $0.cwd == gone.cwd }) { continue }
            let entry = OfflineService(
                port: gone.port, name: gone.name, cwd: gone.cwd,
                args: gone.args, executable: gone.executable, exitedAt: Date()
            )
            offline.removeAll { $0.id == entry.id }
            offline.insert(entry, at: 0)
        }

        // Back up again (same folder, same port) — no longer stopped. A project can run
        // several servers, so a folder match alone isn't enough.
        offline.removeAll { entry in
            current.contains { $0.port == entry.port && $0.cwd == entry.cwd }
        }
        offline = Array(offline.prefix(maxOffline))
        if offline != offlineServices { offlineServices = offline }
    }

    func stop(_ service: ServiceInfo) {
        guard let index = services.firstIndex(where: { $0.pid == service.pid }) else { return }
        services[index].status = .stopping
        kill(pid_t(service.pid), SIGTERM)
        Task {
            try? await Task.sleep(for: .milliseconds(600))
            await scan()
            // Most servers exit on SIGTERM; the rest would otherwise sit at "Stopping…".
            try? await Task.sleep(for: .seconds(3))
            guard services.contains(where: { $0.pid == service.pid }) else { return }
            kill(pid_t(service.pid), SIGKILL)
            try? await Task.sleep(for: .milliseconds(300))
            await scan()
        }
    }

    func restart(_ service: OfflineService) {
        guard let args = service.args, let cwd = service.cwd else { return }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = ["-c", ScanParsing.restartCommand(args: args, executable: service.executable)]
        process.currentDirectoryURL = URL(fileURLWithPath: cwd)
        var environment = Shell.environment
        if let executable = service.executable {
            // So child processes (npm scripts calling `node`) find the same runtime.
            let dir = (executable as NSString).deletingLastPathComponent
            environment["PATH"] = dir + ":" + (environment["PATH"] ?? "")
        }
        process.environment = environment
        process.standardInput = FileHandle.nullDevice
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice

        guard (try? process.run()) != nil else { return }
        offlineServices.removeAll { $0.id == service.id }
        Task {
            try? await Task.sleep(for: .seconds(2))
            await scan()
        }
    }

    func dismiss(_ service: OfflineService) {
        offlineServices.removeAll { $0.id == service.id }
    }
}
