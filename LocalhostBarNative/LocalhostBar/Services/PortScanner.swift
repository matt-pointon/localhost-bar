import Foundation
import Combine

// Constants moved outside the class to avoid Sendable warnings
private let devPortMin = 1024
private let devPortMax = 9999

private let devCommandAllowlist: Set<String> = [
    "node", "bun", "deno",
    "python", "python3", "python2",
    "ruby", "php", "java", "go",
    "vite", "next-se", "cargo", "pnpm",
    "npx", "yarn", "uvicorn", "gunicorn",
    "rails", "flask", "django-adm"
]

private let commandDisplayNames: [String: String] = [
    "node": "Node.js",
    "bun": "Bun",
    "deno": "Deno",
    "python": "Python",
    "python3": "Python",
    "ruby": "Ruby",
    "php": "PHP",
    "java": "Java",
    "go": "Go",
    "next-se": "Next.js",
    "vite": "Vite",
    "cargo": "Rust"
]

@MainActor
class PortScanner: ObservableObject {
    @Published private(set) var services: [ServiceInfo] = []
    @Published private(set) var offlineServices: [OfflineService] = []
    @Published private(set) var isScanning = false
    
    private var scanTimer: Timer?
    private let scanInterval: TimeInterval = 3.0
    
    func startScanning() {
        guard scanTimer == nil else { return }
        
        Task {
            await scan()
        }
        
        scanTimer = Timer.scheduledTimer(withTimeInterval: scanInterval, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                await self?.scan()
            }
        }
    }
    
    func stopScanning() {
        scanTimer?.invalidate()
        scanTimer = nil
    }
    
    private func scan() async {
        isScanning = true
        defer { isScanning = false }
        
        let rawEntries = await runLsof()
        var newServices: [ServiceInfo] = []
        
        for entry in rawEntries {
            let processInfo = await inferProcessInfo(pid: entry.pid, rawCommand: entry.command)
            let gitStatus = GitStatusProvider.getStatus(for: processInfo.cwd)
            let resources = await getResourceUsage(for: entry.pid)
            
            let service = ServiceInfo(
                pid: entry.pid,
                port: entry.port,
                name: processInfo.name,
                command: commandDisplayNames[entry.command] ?? entry.command,
                address: entry.address,
                cwd: processInfo.cwd,
                args: processInfo.args,
                git: gitStatus,
                resources: resources
            )
            newServices.append(service)
        }
        
        // Detect services that went offline
        let currentPorts = Set(newServices.map { $0.port })
        let goneOffline = services.filter { !currentPorts.contains($0.port) }
        
        for service in goneOffline {
            if service.cwd != nil && service.args != nil {
                let offline = OfflineService(
                    port: service.port,
                    name: service.name,
                    cwd: service.cwd,
                    args: service.args,
                    exitedAt: Date()
                )
                if !offlineServices.contains(where: { $0.port == offline.port }) {
                    offlineServices.append(offline)
                }
            }
        }
        
        // Remove from offline if came back online
        offlineServices.removeAll { currentPorts.contains($0.port) }
        
        services = newServices
    }
    
    func killProcess(pid: Int) {
        // Mark as stopping
        if let index = services.firstIndex(where: { $0.pid == pid }) {
            services[index].status = .stopping
        }
        
        kill(pid_t(pid), SIGTERM)
        
        // Refresh after a short delay
        Task {
            try? await Task.sleep(for: .milliseconds(500))
            await scan()
        }
    }
    
    func restartService(_ service: OfflineService) {
        guard let args = service.args, let cwd = service.cwd else { return }
        
        // Convert internal node_modules/.bin commands back to npx equivalents
        var cmd = args
        if let match = args.range(of: #"(?:node\s+)?.*?/node_modules/\.bin/(\S+)(.*)"#, options: .regularExpression) {
            let fullMatch = String(args[match])
            if let binName = fullMatch.split(separator: "/").last?.split(separator: " ").first {
                let rest = args.suffix(from: match.upperBound)
                cmd = "npx \(binName)\(rest)"
            }
        }
        
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = ["-l", "-c", cmd]
        process.currentDirectoryURL = URL(fileURLWithPath: cwd)
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        
        do {
            try process.run()
            offlineServices.removeAll { $0.port == service.port }
        } catch {
            print("Failed to restart service: \(error)")
        }
    }
    
    func dismissOffline(_ service: OfflineService) {
        offlineServices.removeAll { $0.port == service.port }
    }
    
    // MARK: - lsof parsing
    
    private struct RawPortEntry {
        let pid: Int
        let command: String
        let port: Int
        let address: String
    }
    
    private func runLsof() async -> [RawPortEntry] {
        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                var entries: [RawPortEntry] = []
                
                let process = Process()
                process.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
                process.arguments = ["-nP", "-iTCP", "-sTCP:LISTEN"]
                
                let pipe = Pipe()
                process.standardOutput = pipe
                process.standardError = FileHandle.nullDevice
                
                do {
                    try process.run()
                    process.waitUntilExit()
                    
                    let data = pipe.fileHandleForReading.readDataToEndOfFile()
                    guard let output = String(data: data, encoding: .utf8) else {
                        continuation.resume(returning: [])
                        return
                    }
                    
                    let lines = output.components(separatedBy: "\n").dropFirst() // Skip header
                    
                    for line in lines {
                        let parts = line.split(separator: " ", omittingEmptySubsequences: true)
                        guard parts.count >= 9 else { continue }
                        
                        let command = String(parts[0])
                        guard let pid = Int(parts[1]) else { continue }
                        guard devCommandAllowlist.contains(command) else { continue }
                        
                        // lsof appends "(LISTEN)" as a separate token
                        let rawName = String(parts[parts.count - 1])
                        let name = rawName == "(LISTEN)" ? String(parts[parts.count - 2]) : rawName
                        
                        guard let colonIdx = name.lastIndex(of: ":") else { continue }
                        let portStr = String(name[name.index(after: colonIdx)...])
                        let address = String(name[..<colonIdx])
                        
                        guard let port = Int(portStr),
                              port >= devPortMin,
                              port <= devPortMax else { continue }
                        
                        // Deduplicate: same PID+port can appear for both IPv4 and IPv6
                        if !entries.contains(where: { $0.pid == pid && $0.port == port }) {
                            entries.append(RawPortEntry(pid: pid, command: command, port: port, address: address))
                        }
                    }
                } catch {
                    print("lsof error: \(error)")
                }
                
                continuation.resume(returning: entries)
            }
        }
    }
    
    // MARK: - Process info inference
    
    private struct ProcessInfo {
        let name: String
        let cwd: String?
        let args: String?
    }
    
    private func inferProcessInfo(pid: Int, rawCommand: String) async -> ProcessInfo {
        let cwd = await getProcessCwd(pid: pid)
        let args = await getProcessArgs(pid: pid)
        
        // Priority 1: basename of the working directory
        if let cwd = cwd {
            let dirName = URL(fileURLWithPath: cwd).lastPathComponent
            if !dirName.isEmpty && dirName != "/" && dirName != "root" && dirName != "home" {
                return ProcessInfo(
                    name: formatName(dirName),
                    cwd: cwd,
                    args: args
                )
            }
        }
        
        // Priority 2: extract project name from process args
        if let argsName = getNameFromArgs(args) {
            return ProcessInfo(
                name: argsName,
                cwd: cwd,
                args: args
            )
        }
        
        // Fallback: use the command name
        return ProcessInfo(
            name: commandDisplayNames[rawCommand] ?? formatName(rawCommand),
            cwd: cwd,
            args: args
        )
    }
    
    private func getProcessCwd(pid: Int) async -> String? {
        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let process = Process()
                process.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
                process.arguments = ["-a", "-p", "\(pid)", "-d", "cwd", "-Fn"]
                
                let pipe = Pipe()
                process.standardOutput = pipe
                process.standardError = FileHandle.nullDevice
                
                do {
                    try process.run()
                    process.waitUntilExit()
                    
                    let data = pipe.fileHandleForReading.readDataToEndOfFile()
                    guard let output = String(data: data, encoding: .utf8) else {
                        continuation.resume(returning: nil)
                        return
                    }
                    
                    // Look for line starting with 'n' (name field)
                    if let match = output.range(of: #"\nn(.+)"#, options: .regularExpression) {
                        let path = String(output[match]).dropFirst(2).trimmingCharacters(in: .whitespacesAndNewlines)
                        continuation.resume(returning: path)
                    } else {
                        continuation.resume(returning: nil)
                    }
                } catch {
                    continuation.resume(returning: nil)
                }
            }
        }
    }
    
    private func getProcessArgs(pid: Int) async -> String? {
        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let process = Process()
                process.executableURL = URL(fileURLWithPath: "/bin/ps")
                process.arguments = ["-p", "\(pid)", "-o", "args="]
                
                let pipe = Pipe()
                process.standardOutput = pipe
                process.standardError = FileHandle.nullDevice
                
                do {
                    try process.run()
                    process.waitUntilExit()
                    
                    let data = pipe.fileHandleForReading.readDataToEndOfFile()
                    guard let output = String(data: data, encoding: .utf8) else {
                        continuation.resume(returning: nil)
                        return
                    }
                    
                    let trimmed = output.trimmingCharacters(in: .whitespacesAndNewlines)
                    continuation.resume(returning: trimmed.isEmpty ? nil : trimmed)
                } catch {
                    continuation.resume(returning: nil)
                }
            }
        }
    }
    
    private func getResourceUsage(for pid: Int) async -> ResourceUsage? {
        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let process = Process()
                process.executableURL = URL(fileURLWithPath: "/bin/ps")
                process.arguments = ["-p", "\(pid)", "-o", "pid=,pcpu=,rss="]
                
                let pipe = Pipe()
                process.standardOutput = pipe
                process.standardError = FileHandle.nullDevice
                
                do {
                    try process.run()
                    process.waitUntilExit()
                    
                    let data = pipe.fileHandleForReading.readDataToEndOfFile()
                    guard let output = String(data: data, encoding: .utf8) else {
                        continuation.resume(returning: nil)
                        return
                    }
                    
                    let parts = output.trimmingCharacters(in: .whitespacesAndNewlines)
                        .split(separator: " ", omittingEmptySubsequences: true)
                    
                    if parts.count >= 3,
                       let cpu = Double(parts[1]),
                       let rssKb = Int(parts[2]) {
                        continuation.resume(returning: ResourceUsage(cpu: cpu, mem: rssKb / 1024))
                    } else {
                        continuation.resume(returning: nil)
                    }
                } catch {
                    continuation.resume(returning: nil)
                }
            }
        }
    }
    
    private func getNameFromArgs(_ args: String?) -> String? {
        guard let args = args else { return nil }
        
        // Find project-like path segments before node_modules/dist/build
        let pattern = #"([/\w\-.]+?)(?:/node_modules|/dist|/build|\s|$)"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: args, range: NSRange(args.startIndex..., in: args)),
              let range = Range(match.range(at: 1), in: args) else {
            return nil
        }
        
        let path = String(args[range])
        let segments = path.split(separator: "/").filter { segment in
            let s = String(segment)
            return !s.isEmpty && !["node_modules", "bin", ".bin", "usr", "local", "lib", "opt"].contains(s)
        }
        
        if let last = segments.last {
            return formatName(String(last))
        }
        return nil
    }
    
    private func formatName(_ s: String) -> String {
        // "my-cool-app" → "My Cool App"
        s.split(separator: "-")
            .flatMap { $0.split(separator: "_") }
            .map { $0.prefix(1).uppercased() + $0.dropFirst() }
            .joined(separator: " ")
    }
}
