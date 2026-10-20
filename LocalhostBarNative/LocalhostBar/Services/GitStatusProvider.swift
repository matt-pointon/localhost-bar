import Foundation

/// Branch + change count per working directory, and repo roots. Every scan asks, so
/// status is cached briefly and roots for the life of the app.
actor GitStatusProvider {
    static let shared = GitStatusProvider()

    private var statusCache: [String: (value: GitStatus?, at: Date)] = [:]
    private var rootCache: [String: String?] = [:]
    private var emailCache: [String: String?] = [:]
    private let statusTTL: TimeInterval = 10

    /// nil when git isn't available. `/usr/bin/git` is only a shim until the Command Line
    /// Tools are installed, and calling it pops an install dialog — every 3 seconds.
    static let gitPath: String? = {
        #if os(macOS)
        if let path = Shell.which("git"), path != "/usr/bin/git" { return path }
        let fm = FileManager.default
        let developerToolsInstalled = fm.fileExists(atPath: "/var/db/xcode_select_link")
            || fm.fileExists(atPath: "/Library/Developer/CommandLineTools/usr/bin/git")
            || fm.fileExists(atPath: "/Applications/Xcode.app")
        return developerToolsInstalled ? "/usr/bin/git" : nil
        #else
        return Shell.which("git")
        #endif
    }()

    func repoRoot(for cwd: String) async -> String? {
        if let cached = rootCache[cwd] { return cached }
        let root = await git(["rev-parse", "--show-toplevel"], in: cwd)
        rootCache[cwd] = .some(root)
        return root
    }

    func status(for cwd: String) async -> GitStatus? {
        if let cached = statusCache[cwd], Date().timeIntervalSince(cached.at) < statusTTL {
            return cached.value
        }
        let output = await git(["status", "--porcelain=v1", "--branch"], in: cwd, trim: false)
        let value = output.flatMap(ScanParsing.parseGitStatus)
        statusCache[cwd] = (value, Date())
        return value
    }

    func userEmail(in repo: String) async -> String? {
        if let cached = emailCache[repo] { return cached }
        let email = await git(["config", "user.email"], in: repo)
        emailCache[repo] = .some(email)
        return email
    }

    /// stdout of a successful git command, or nil.
    func git(_ args: [String], in cwd: String, trim: Bool = true, timeout: TimeInterval = 5) async -> String? {
        guard let gitPath = Self.gitPath,
              let output = await Shell.run(gitPath, args, cwd: cwd, timeout: timeout),
              output.status == 0 else { return nil }
        let text = trim ? output.stdout.trimmingCharacters(in: .whitespacesAndNewlines) : output.stdout
        return text.isEmpty ? nil : text
    }
}
