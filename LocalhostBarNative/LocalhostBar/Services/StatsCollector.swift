import Foundation

/// Your commits and changed lines per day, across every project that has run.
enum StatsCollector {
    static let windowDays = 30
    private static let cache = RepoLogCache()

    static func dailyStats(activeRepoRoots: [String]) async -> DailyStats {
        let known = StatsStore.remember(activeRepoRoots)

        // Older entries (and the Electron build) may store subfolders — resolve to repo roots.
        var roots = Set<String>()
        for path in known {
            if let root = await GitStatusProvider.shared.repoRoot(for: path) { roots.insert(root) }
        }

        let logs = await withTaskGroup(of: RepoLog.self) { group in
            for root in roots {
                group.addTask { await cache.log(for: root) }
            }
            var all: [RepoLog] = []
            for await log in group { all.append(log) }
            return all
        }

        let history = (0..<windowDays).reversed().map { offset -> DayActivity in
            let date = DayFormat.string(daysAgo: offset)
            return DayActivity(
                date: date,
                commits: logs.reduce(0) { $0 + ($1.commits[date] ?? 0) },
                lines: logs.reduce(0) { $0 + ($1.lines[date] ?? 0) }
            )
        }
        return DailyStats(history: history)
    }
}

struct RepoLog: Sendable {
    var commits: [String: Int] = [:]
    var lines: [String: Int] = [:]
}

private actor RepoLogCache {
    private var entries: [String: (log: RepoLog, at: Date)] = [:]
    private let ttl: TimeInterval = 60

    func log(for root: String) async -> RepoLog {
        if let entry = entries[root], Date().timeIntervalSince(entry.at) < ttl { return entry.log }

        var args = [
            "log", "--no-merges", "--since=\(StatsCollector.windowDays + 1) days ago",
            "--date=short-local", "--pretty=format:%x1f%ad", "--numstat"
        ]
        // Only your own work — not teammates' commits pulled into a shared repo.
        if let email = await GitStatusProvider.shared.userEmail(in: root) {
            args.append("--author=\(email)")
        }

        var log = RepoLog()
        if let output = await GitStatusProvider.shared.git(args, in: root, trim: false, timeout: 10) {
            let parsed = ScanParsing.parseGitLog(output)
            log = RepoLog(commits: parsed.commits, lines: parsed.lines)
        }
        entries[root] = (log, Date())
        return log
    }
}

enum DayFormat {
    private static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func string(daysAgo: Int, from now: Date = Date()) -> String {
        let day = Calendar.current.date(byAdding: .day, value: -daysAgo, to: now) ?? now
        return formatter.string(from: day)
    }

    static func date(from string: String) -> Date? {
        formatter.date(from: string)
    }
}
