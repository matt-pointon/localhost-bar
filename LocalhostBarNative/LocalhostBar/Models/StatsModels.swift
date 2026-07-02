import Foundation

struct DayProject: Equatable, Identifiable {
    var id: String { cwd }
    let cwd: String
    let name: String
    let commits: Int
    let lines: Int
}

struct DayActivity: Equatable, Identifiable {
    var id: String { date }
    let date: String
    let commits: Int
    let lines: Int
    let tokens: Int
    let projects: [DayProject]

    init(date: String, commits: Int, lines: Int, tokens: Int = 0, projects: [DayProject] = []) {
        self.date = date
        self.commits = commits
        self.lines = lines
        self.tokens = tokens
        self.projects = projects
    }
}

struct DailyStats: Equatable {
    let commitsToday: Int
    let linesChangedToday: Int
    let tokensToday: Int
    let streakDays: Int
    let history: [DayActivity]
}

struct ProjectRef: Equatable {
    let cwd: String
    let name: String
}
