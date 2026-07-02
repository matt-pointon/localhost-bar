import Foundation

/// Persists streak, token history, and known project paths (`~/.localhost-bar/stats.json`).
enum StatsStore {
    private static let windowDays = 30
    private static let maxKnownProjects = 40
    private static let retentionDays = 40

    private struct PersistedData: Codable {
        var lastActiveDate: String
        var streakDays: Int
        var tokensByDate: [String: Int]
        var knownProjects: [String]
    }

    private static var statsFile: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".localhost-bar/stats.json")
    }

    private static func load() -> PersistedData {
        guard let data = try? Data(contentsOf: statsFile),
              let raw = try? JSONDecoder().decode(PersistedData.self, from: data) else {
            return PersistedData(lastActiveDate: "", streakDays: 0, tokensByDate: [:], knownProjects: [])
        }
        return raw
    }

    private static func save(_ data: PersistedData) {
        let dir = statsFile.deletingLastPathComponent()
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        if let encoded = try? JSONEncoder().encode(data) {
            try? encoded.write(to: statsFile)
        }
    }

    static func tokensByDate() -> [String: Int] {
        load().tokensByDate
    }

    static func knownProjects() -> [String] {
        load().knownProjects
    }

    @discardableResult
    static func recordDay(hasActivityToday: Bool, tokensToday: Int, runningCwds: [String]) -> Int {
        var data = load()
        let today = localDateStr()

        data.tokensByDate[today] = tokensToday

        for cwd in runningCwds where !data.knownProjects.contains(cwd) {
            data.knownProjects.append(cwd)
        }
        if data.knownProjects.count > maxKnownProjects {
            data.knownProjects = Array(data.knownProjects.suffix(maxKnownProjects))
        }

        let cutoff = localDateStr(offset: retentionDays)
        data.tokensByDate = data.tokensByDate.filter { $0.key >= cutoff }

        if hasActivityToday {
            if data.lastActiveDate == today {
                // already counted today
            } else if data.lastActiveDate == localDateStr(offset: 1) {
                data.streakDays += 1
                data.lastActiveDate = today
            } else {
                data.streakDays = 1
                data.lastActiveDate = today
            }
        }

        save(data)
        return data.streakDays
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
