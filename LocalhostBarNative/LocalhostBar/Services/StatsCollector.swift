import Foundation

enum StatsCollector {
    private static let windowDays = 30
    private static var repoCache: [String: (data: RepoDaily, ts: Date)] = [:]
    private static let cacheTTL: TimeInterval = 60

    private struct RepoDaily {
        var commitsByDate: [String: Int]
        var linesByDate: [String: Int]
    }

    static func getDailyStats(for projects: [ProjectRef]) async -> DailyStats {
        let uniqueProjects = dedupeGitProjects(projects)
        let runningCwds = uniqueProjects.map(\.cwd)
        let runningNames = Dictionary(uniqueKeysWithValues: uniqueProjects.map { ($0.cwd, $0.name) })

        let knownCwds = Array(Set(runningCwds + StatsStore.knownProjects())).filter { cwd in
            FileManager.default.fileExists(atPath: URL(fileURLWithPath: cwd).appendingPathComponent(".git").path)
        }

        let repos = knownCwds.map { cwd in
            (
                cwd: cwd,
                name: runningNames[cwd] ?? projectName(for: cwd),
                daily: getRepoDaily(cwd: cwd)
            )
        }

        let tokensByDate = StatsStore.tokensByDate()
        let tokensToday = 0
        let todayStr = localDateStr()

        var history: [DayActivity] = []
        for offset in stride(from: windowDays - 1, through: 0, by: -1) {
            let dateStr = localDateStr(offset: offset)
            var commits = 0
            var lines = 0
            var dayProjects: [DayProject] = []

            for repo in repos {
                let c = repo.daily.commitsByDate[dateStr] ?? 0
                let l = repo.daily.linesByDate[dateStr] ?? 0
                if c > 0 || l > 0 {
                    commits += c
                    lines += l
                    dayProjects.append(DayProject(cwd: repo.cwd, name: repo.name, commits: c, lines: l))
                }
            }

            dayProjects.sort { a, b in
                if a.commits != b.commits { return a.commits > b.commits }
                return a.lines > b.lines
            }

            let tokens = dateStr == todayStr ? tokensToday : (tokensByDate[dateStr] ?? 0)
            history.append(DayActivity(date: dateStr, commits: commits, lines: lines, tokens: tokens, projects: dayProjects))
        }

        let todayEntry = history.last ?? DayActivity(date: todayStr, commits: 0, lines: 0)
        let hasActivity = todayEntry.commits > 0 || todayEntry.lines > 0 || tokensToday > 0
        let streakDays = StatsStore.recordDay(
            hasActivityToday: hasActivity,
            tokensToday: tokensToday,
            runningCwds: runningCwds
        )

        return DailyStats(
            commitsToday: todayEntry.commits,
            linesChangedToday: todayEntry.lines,
            tokensToday: tokensToday,
            streakDays: streakDays,
            history: history
        )
    }

    static func projectRefs(from services: [ServiceInfo]) -> [ProjectRef] {
        services.compactMap { service in
            guard let cwd = service.cwd else { return nil }
            return ProjectRef(cwd: cwd, name: service.name)
        }
    }

    // MARK: - Git log parsing

    private static func getRepoDaily(cwd: String) -> RepoDaily {
        if let cached = repoCache[cwd], Date().timeIntervalSince(cached.ts) < cacheTTL {
            return cached.data
        }

        var commitsByDate: [String: Int] = [:]
        var linesByDate: [String: Int] = [:]

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/bash")
        process.arguments = [
            "-lc",
            "git log --since=\"\(windowDays + 1) days ago 00:00:00\" --date=short --pretty=format:$'\\x1f%cd' --numstat"
        ]
        process.currentDirectoryURL = URL(fileURLWithPath: cwd)

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = FileHandle.nullDevice

        if (try? process.run()) != nil {
            process.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            if let output = String(data: data, encoding: .utf8) {
                var currentDate = ""
                for line in output.split(separator: "\n", omittingEmptySubsequences: false) {
                    let text = String(line)
                    if text.hasPrefix("\u{001F}") {
                        currentDate = String(text.dropFirst()).trimmingCharacters(in: .whitespacesAndNewlines)
                        if !currentDate.isEmpty {
                            commitsByDate[currentDate, default: 0] += 1
                        }
                    } else if !currentDate.isEmpty, text.contains("\t") {
                        let parts = text.split(separator: "\t", maxSplits: 2).map(String.init)
                        guard parts.count >= 2 else { continue }
                        let added = Int(parts[0]) ?? 0
                        let removed = Int(parts[1]) ?? 0
                        let delta = added + removed
                        if delta > 0 {
                            linesByDate[currentDate, default: 0] += delta
                        }
                    }
                }
            }
        }

        let data = RepoDaily(commitsByDate: commitsByDate, linesByDate: linesByDate)
        repoCache[cwd] = (data, Date())
        return data
    }

    private static func dedupeGitProjects(_ projects: [ProjectRef]) -> [ProjectRef] {
        var seen = Set<String>()
        return projects.filter { project in
            guard !seen.contains(project.cwd) else { return false }
            seen.insert(project.cwd)
            return FileManager.default.fileExists(
                atPath: URL(fileURLWithPath: project.cwd).appendingPathComponent(".git").path
            )
        }
    }

    private static func projectName(for cwd: String) -> String {
        let base = URL(fileURLWithPath: cwd).lastPathComponent
        return base
            .replacingOccurrences(of: "-", with: " ")
            .replacingOccurrences(of: "_", with: " ")
            .split(separator: " ")
            .map { $0.prefix(1).uppercased() + $0.dropFirst() }
            .joined(separator: " ")
    }

    private static func localDateStr(from date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar.current
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private static func localDateStr(offset: Int, from date: Date = Date()) -> String {
        guard let day = Calendar.current.date(byAdding: .day, value: -offset, to: date) else {
            return localDateStr(from: date)
        }
        return localDateStr(from: day)
    }
}
