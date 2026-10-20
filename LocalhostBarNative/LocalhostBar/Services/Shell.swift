import Foundation

/// Runs command-line tools off the main thread.
///
/// Two details matter for a menu bar app that shells out every few seconds:
/// - stdout is drained *before* waiting for exit. Waiting first deadlocks as soon as a
///   tool writes more than the 64 KB pipe buffer (e.g. `git log --numstat`).
/// - Apps launched from Finder get a bare PATH (`/usr/bin:/bin:/usr/sbin:/sbin`), so
///   Homebrew, nvm, bun, etc. are invisible unless we add their usual locations.
enum Shell {
    struct Output {
        let status: Int32
        let stdout: String
    }

    static let searchPath: [String] = {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let inherited = (Foundation.ProcessInfo.processInfo.environment["PATH"] ?? "")
            .split(separator: ":").map(String.init)
        let extra = [
            "/opt/homebrew/bin", "/opt/homebrew/sbin", "/usr/local/bin",
            "\(home)/.local/bin", "\(home)/.claude/local", "\(home)/.bun/bin",
            "\(home)/.volta/bin", "\(home)/.deno/bin", "\(home)/.cargo/bin",
            "\(home)/.npm-global/bin", "\(home)/Library/pnpm",
            "\(home)/.local/share/fnm/aliases/default/bin", "\(home)/.local/share/mise/shims", "\(home)/.asdf/shims"
        ] + nvmBinDirs(home: home)
        var seen = Set<String>()
        return (extra + inherited + ["/usr/bin", "/bin", "/usr/sbin", "/sbin"])
            .filter { seen.insert($0).inserted }
    }()

    /// Newest installed nvm Node first — where `npm i -g` put CLIs like `claude`.
    private static func nvmBinDirs(home: String) -> [String] {
        let root = "\(home)/.nvm/versions/node"
        let versions = (try? FileManager.default.contentsOfDirectory(atPath: root)) ?? []
        return versions
            .sorted { $0.compare($1, options: .numeric) == .orderedDescending }
            .map { "\(root)/\($0)/bin" }
    }

    static var environment: [String: String] {
        var env = Foundation.ProcessInfo.processInfo.environment
        env["PATH"] = searchPath.joined(separator: ":")
        // Background `git status` must never take index.lock and collide with the user's own git commands.
        env["GIT_OPTIONAL_LOCKS"] = "0"
        env["GIT_TERMINAL_PROMPT"] = "0"
        return env
    }

    /// Absolute path of the first executable named `name` on `searchPath`.
    static func which(_ name: String) -> String? {
        for dir in searchPath {
            let candidate = (dir as NSString).appendingPathComponent(name)
            if FileManager.default.isExecutableFile(atPath: candidate) { return candidate }
        }
        return nil
    }

    /// Returns nil only when the executable could not be launched.
    static func run(
        _ executable: String,
        _ arguments: [String],
        cwd: String? = nil,
        timeout: TimeInterval = 5
    ) async -> Output? {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .utility).async {
                let process = Process()
                process.executableURL = URL(fileURLWithPath: executable)
                process.arguments = arguments
                process.environment = environment
                if let cwd { process.currentDirectoryURL = URL(fileURLWithPath: cwd) }

                let pipe = Pipe()
                process.standardOutput = pipe
                process.standardError = FileHandle.nullDevice
                process.standardInput = FileHandle.nullDevice

                do {
                    try process.run()
                } catch {
                    continuation.resume(returning: nil)
                    return
                }

                DispatchQueue.global().asyncAfter(deadline: .now() + timeout) {
                    if process.isRunning { process.terminate() }
                }

                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                process.waitUntilExit()
                continuation.resume(returning: Output(
                    status: process.terminationStatus,
                    stdout: String(decoding: data, as: UTF8.self)
                ))
            }
        }
    }
}
