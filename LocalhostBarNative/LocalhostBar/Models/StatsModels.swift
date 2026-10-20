import Foundation

struct DayActivity: Equatable, Identifiable {
    var id: String { date }
    /// Local calendar day, yyyy-MM-dd.
    let date: String
    let commits: Int
    let lines: Int
}

struct DailyStats: Equatable {
    /// Oldest first; the last entry is today.
    let history: [DayActivity]

    var today: DayActivity? { history.last }

    /// Consecutive days with commits, ending today — or yesterday, so the streak
    /// doesn't read as broken first thing in the morning.
    var streakDays: Int {
        var days = Array(history.reversed())
        if days.first?.commits == 0 { days.removeFirst() }
        return days.prefix { $0.commits > 0 }.count
    }
}
