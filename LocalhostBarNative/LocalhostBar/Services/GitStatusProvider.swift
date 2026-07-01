import Foundation

actor GitStatusCache {
    private var cache: [String: (data: GitStatus?, timestamp: Date)] = [:]
    private let ttl: TimeInterval = 30.0
    
    func get(_ key: String) -> GitStatus? {
        guard let entry = cache[key],
              Date().timeIntervalSince(entry.timestamp) < ttl else {
            return nil
        }
        return entry.data
    }
    
    func set(_ key: String, value: GitStatus?) {
        cache[key] = (value, Date())
    }
    
    func has(_ key: String) -> Bool {
        guard let entry = cache[key] else { return false }
        return Date().timeIntervalSince(entry.timestamp) < ttl
    }
}

enum GitStatusProvider {
    private static let cache = GitStatusCache()
    
    static func getStatus(for cwd: String?) -> GitStatus? {
        guard let cwd = cwd else { return nil }
        
        // Check if .git exists
        let gitPath = URL(fileURLWithPath: cwd).appendingPathComponent(".git")
        guard FileManager.default.fileExists(atPath: gitPath.path) else {
            return nil
        }
        
        // This is a synchronous call - for the native app we could make it async
        // but keeping it simple for now to match the Electron behavior
        return fetchGitStatus(cwd: cwd)
    }
    
    private static func fetchGitStatus(cwd: String) -> GitStatus? {
        do {
            // Get branch name
            let branch = try runGitCommand(["rev-parse", "--abbrev-ref", "HEAD"], in: cwd)
            
            // Get number of changes
            let porcelain = try runGitCommand(["status", "--porcelain"], in: cwd)
            let changes = porcelain.isEmpty ? 0 : porcelain.components(separatedBy: "\n").filter { !$0.isEmpty }.count
            
            // Get last commit message
            let lastCommit = try runGitCommand(["log", "-1", "--format=%s"], in: cwd)
            let truncatedCommit = String(lastCommit.prefix(40))
            
            return GitStatus(branch: branch, changes: changes, lastCommit: truncatedCommit)
        } catch {
            return nil
        }
    }
    
    private static func runGitCommand(_ args: [String], in cwd: String) throws -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/git")
        process.arguments = args
        process.currentDirectoryURL = URL(fileURLWithPath: cwd)
        
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = FileHandle.nullDevice
        
        try process.run()
        process.waitUntilExit()
        
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        return String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    }
}
