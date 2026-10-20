import Foundation

/// Finds dev servers: listening sockets → owning processes → project + git details.
///
/// Three subprocesses per scan regardless of how many servers are running (plus git,
/// which is cached), all off the main thread.
enum ServiceDiscovery {
    struct LsofUnavailable: Error {}

    static func discover() async throws -> [ServiceInfo] {
        let lsof = Shell.which("lsof") ?? "/usr/sbin/lsof"
        // +c 0: full command names (otherwise truncated to 9 characters).
        guard let listen = await Shell.run(lsof, ["-nP", "+c", "0", "-iTCP", "-sTCP:LISTEN", "-Fpcn"]) else {
            throw LsofUnavailable()
        }
        let listening = ScanParsing.parseListening(listen.stdout)
        guard !listening.isEmpty else { return [] }

        let pids = listening.map { String($0.pid) }.joined(separator: ",")
        async let details = Shell.run(lsof, ["-a", "-p", pids, "-d", "cwd,txt", "-Fpfn"])
        async let processList = Shell.run(Shell.which("ps") ?? "/bin/ps", ["-ww", "-o", "pid=,command=", "-p", pids])
        let (cwds, executables) = ScanParsing.parseCwdAndExecutable(await details?.stdout ?? "")
        let argsByPid = ScanParsing.parseArgs(await processList?.stdout ?? "")
        let home = FileManager.default.homeDirectoryForCurrentUser.path

        let services = await withTaskGroup(of: ServiceInfo?.self) { group in
            for process in listening {
                let cwd = cwds[process.pid]
                let executable = executables[process.pid]
                let args = argsByPid[process.pid]

                // Launchd daemons and runtimes bundled inside desktop apps aren't dev servers.
                if cwd == "/" { continue }
                if let executable, ScanParsing.isBundledWithApp(executable) { continue }
                if let args, ScanParsing.isBundledWithApp(args) { continue }

                group.addTask {
                    var repoRoot: String?
                    var git: GitStatus?
                    if let cwd {
                        repoRoot = await GitStatusProvider.shared.repoRoot(for: cwd)
                        if repoRoot != nil { git = await GitStatusProvider.shared.status(for: cwd) }
                    }
                    return ServiceInfo(
                        pid: process.pid,
                        port: process.ports[0],
                        otherPorts: Array(process.ports.dropFirst()),
                        name: ScanParsing.projectName(
                            cwd: cwd, repoRoot: repoRoot, args: args, command: process.command, home: home
                        ),
                        command: process.command,
                        cwd: cwd,
                        repoRoot: repoRoot,
                        args: args,
                        executable: executable,
                        git: git
                    )
                }
            }
            var found: [ServiceInfo] = []
            for await service in group { if let service { found.append(service) } }
            return found
        }
        // Stable order so rows don't shuffle between scans.
        return services.sorted { $0.port < $1.port }
    }
}
