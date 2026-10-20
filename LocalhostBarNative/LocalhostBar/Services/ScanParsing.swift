import Foundation

/// A process with at least one TCP port in LISTEN state.
struct ListeningProcess: Equatable {
    let pid: Int
    let command: String
    /// Ascending. The first one is shown; the rest are usually HMR / debugger sockets.
    var ports: [Int]
    var address: String
}

/// Pure parsing helpers, kept free of AppKit/SwiftUI so they can be unit-tested anywhere.
enum ScanParsing {
    static let devPorts = 1024...9999

    /// Known dev runtimes, lowercased. `lsof` truncates command names (`next-server` can
    /// arrive as `next-serv` or `next-se`), and macOS framework Python reports itself as
    /// `Python`, so names are lowercased and version suffixes stripped before matching.
    private static let devRuntimes: Set<String> = [
        "node", "nodejs", "bun", "deno",
        "python", "ruby", "php", "java", "go", "dotnet", "beam.smp",
        "vite", "esbuild", "workerd", "hugo",
        "next-server", "next-serv", "next-se",
        "cargo", "pnpm", "npx", "yarn",
        "uvicorn", "gunicorn", "hypercorn", "uwsgi",
        "rails", "puma", "flask", "django-admin", "django-adm", "django-ad"
    ]

    static func isDevRuntime(_ command: String) -> Bool {
        let lower = command.lowercased()
        if devRuntimes.contains(lower) { return true }
        // python3.12 → python, php8.3 → php, node20 → node
        let stripped = String(lower.reversed().drop(while: { $0.isNumber || $0 == "." || $0 == "-" }).reversed())
        return devRuntimes.contains(stripped)
    }

    /// Runtimes that ship inside desktop apps (Adobe CC, Raycast, …) are not dev servers.
    static func isBundledWithApp(_ path: String) -> Bool {
        if path.contains("/Library/Application Support/") { return true }
        return path.contains("/Applications/") && !path.contains("/Applications/Xcode")
    }

    /// Parses `lsof -nP +c 0 -iTCP -sTCP:LISTEN -Fpcn`.
    static func parseListening(_ output: String) -> [ListeningProcess] {
        var result: [ListeningProcess] = []
        var indexByPid: [Int: Int] = [:]
        var pid: Int?
        var command: String?

        for line in output.split(separator: "\n") {
            guard let tag = line.first else { continue }
            let value = String(line.dropFirst())
            switch tag {
            case "p":
                pid = Int(value)
                command = nil
            case "c":
                command = value
            case "n":
                guard let pid, let command, isDevRuntime(command) else { continue }
                let local = value.components(separatedBy: "->")[0]
                guard let colon = local.lastIndex(of: ":"),
                      let port = Int(local[local.index(after: colon)...]),
                      devPorts.contains(port) else { continue }
                let address = String(local[..<colon])

                if let i = indexByPid[pid] {
                    if !result[i].ports.contains(port) {
                        result[i].ports.append(port)
                        result[i].ports.sort()
                    }
                } else {
                    indexByPid[pid] = result.count
                    result.append(ListeningProcess(pid: pid, command: command, ports: [port], address: address))
                }
            default:
                continue
            }
        }
        return result
    }

    /// Parses `lsof -a -p <pids> -d cwd,txt -Fpfn` into working directory and executable per pid.
    static func parseCwdAndExecutable(_ output: String) -> (cwd: [Int: String], executable: [Int: String]) {
        var cwd: [Int: String] = [:]
        var executable: [Int: String] = [:]
        var pid: Int?
        var fd = ""

        for line in output.split(separator: "\n") {
            guard let tag = line.first else { continue }
            let value = String(line.dropFirst())
            switch tag {
            case "p": pid = Int(value); fd = ""
            case "f": fd = value
            case "n":
                guard let pid else { continue }
                // The first txt entry is the program itself; the rest are dylibs.
                if fd == "cwd" { cwd[pid] = value }
                else if fd == "txt", executable[pid] == nil { executable[pid] = value }
            default: continue
            }
        }
        return (cwd, executable)
    }

    /// Parses `ps -ww -o pid=,command= -p <pids>`.
    static func parseArgs(_ output: String) -> [Int: String] {
        var args: [Int: String] = [:]
        for line in output.split(separator: "\n") {
            let trimmed = line.drop(while: { $0 == " " })
            guard let space = trimmed.firstIndex(of: " "),
                  let pid = Int(trimmed[..<space]) else { continue }
            let rest = trimmed[space...].trimmingCharacters(in: .whitespaces)
            if !rest.isEmpty { args[pid] = rest }
        }
        return args
    }

    /// Parses `git status --porcelain=v1 --branch`.
    static func parseGitStatus(_ output: String) -> GitStatus? {
        let lines = output.split(separator: "\n", omittingEmptySubsequences: true)
        guard let header = lines.first, header.hasPrefix("## ") else { return nil }
        var branch = String(header.dropFirst(3))
        if branch.hasPrefix("No commits yet on ") { branch = String(branch.dropFirst("No commits yet on ".count)) }
        if let dots = branch.range(of: "...") { branch = String(branch[..<dots.lowerBound]) }
        if let space = branch.firstIndex(of: " ") { branch = String(branch[..<space]) }
        if branch == "HEAD" { branch = "detached" }
        return GitStatus(branch: branch, changes: lines.count - 1)
    }

    /// Parses `git log --date=short --pretty=format:%x1f%cd --numstat`.
    static func parseGitLog(_ output: String) -> (commits: [String: Int], lines: [String: Int]) {
        var commits: [String: Int] = [:]
        var lines: [String: Int] = [:]
        var date = ""

        for raw in output.split(separator: "\n") {
            if raw.first == "\u{1F}" {
                date = raw.dropFirst().trimmingCharacters(in: .whitespaces)
                if !date.isEmpty { commits[date, default: 0] += 1 }
            } else if !date.isEmpty {
                // "12\t3\tpath" — binary files report "-\t-"
                let parts = raw.split(separator: "\t", maxSplits: 2)
                guard parts.count == 3 else { continue }
                let delta = (Int(parts[0]) ?? 0) + (Int(parts[1]) ?? 0)
                if delta > 0 { lines[date, default: 0] += delta }
            }
        }
        return (commits, lines)
    }

    /// Folder name as typed in a terminal ("acme-web"), prefixed by the repo when the
    /// server runs from a subfolder of a monorepo ("acme/web").
    static func projectName(cwd: String?, repoRoot: String?, args: String?, command: String, home: String) -> String {
        if let cwd, cwd != "/", cwd != home {
            let base = (cwd as NSString).lastPathComponent
            if let repoRoot, repoRoot != cwd, cwd.hasPrefix(repoRoot + "/") {
                return "\((repoRoot as NSString).lastPathComponent)/\(base)"
            }
            return base
        }
        if let name = nameFromArgs(args) { return name }
        return command
    }

    private static let ignoredSegments: Set<String> = [
        "node_modules", "bin", ".bin", "usr", "local", "lib", "opt", "dist", "build",
        "users", "home", "homebrew", "cellar"
    ]

    private static func nameFromArgs(_ args: String?) -> String? {
        guard let args else { return nil }
        // The first script path that reaches into a project: /Users/me/acme/server.js → acme.
        // argv[0] is the runtime binary itself, so it's skipped.
        for token in args.split(separator: " ").dropFirst() where token.hasPrefix("/") {
            let segments = token.split(separator: "/").map(String.init)
            let cut = segments.firstIndex { $0 == "node_modules" || $0.contains(".") } ?? segments.count
            if let name = segments[..<cut].last(where: { !ignoredSegments.contains($0.lowercased()) }) {
                return name
            }
        }
        return nil
    }

    /// Shell command that brings a stopped server back.
    ///
    /// Returns the original command line, with a bare `node`/`bun`/`deno` swapped for its
    /// absolute path — a GUI app can't see nvm/volta shims. Python is left alone: its
    /// resolved binary would bypass the project's virtualenv.
    static func restartCommand(args: String, executable: String?) -> String {
        let trimmed = args.trimmingCharacters(in: .whitespaces)
        // Next.js renames its server process to "next-server (vX.Y.Z)", which isn't runnable.
        if trimmed.hasPrefix("next-server") { return "node_modules/.bin/next dev" }

        guard let executable, let space = trimmed.firstIndex(of: " ") else { return trimmed }
        let first = String(trimmed[..<space])
        guard ["node", "bun", "deno"].contains(first),
              (executable as NSString).lastPathComponent == first else {
            return trimmed
        }
        return "'\(executable.replacingOccurrences(of: "'", with: "'\\''"))'\(trimmed[space...])"
    }
}
