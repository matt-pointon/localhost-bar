import SwiftUI

struct StatsView: View {
    let services: [ServiceInfo]
    @Binding var hoveredDay: DayActivity?

    @State private var stats: DailyStats?
    @State private var copied = false

    var body: some View {
        let displayDay = hoveredDay ?? stats?.history.last

        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Spacer()

                Button {
                    copyStats()
                } label: {
                    Image(systemName: copied ? "checkmark" : "square.and.arrow.up")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(copied ? .green : .secondary)
                }
                .buttonStyle(.plain)
                .frame(width: 24, height: 24)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 5))
                .help(copied ? "Copied!" : "Share stats")
            }
            .padding(.top, 12)
            .padding(.horizontal, 14)

            HStack(spacing: 20) {
                if let day = displayDay {
                    if day.lines > 0 {
                        StatNumber(
                            value: formatNumber(day.lines),
                            label: day.lines == 1 ? "Line" : "Lines"
                        )
                    }

                    if day.commits > 0 {
                        StatNumber(
                            value: formatNumber(day.commits),
                            label: day.commits == 1 ? "Commit" : "Commits"
                        )
                    }

                    if hoveredDay == nil, let streak = stats?.streakDays, streak > 0 {
                        StatNumber(value: "\(streak)d", label: "Streak")
                    }
                } else if stats == nil {
                    StatNumber(value: "…", label: "Loading")
                } else {
                    StatNumber(value: "—", label: "Today")
                }
            }
            .padding(.horizontal, 14)

            ActivityGridView(
                history: stats?.history ?? [],
                hoveredDay: $hoveredDay
            )
            .padding(.horizontal, 14)

            if let day = displayDay {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(hoveredDay == nil ? "Today" : formatDate(day.date))
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(.primary)

                        if day.commits > 0 || day.lines > 0 {
                            Text("\(day.commits) commit\(day.commits == 1 ? "" : "s")")
                                .font(.system(size: 10))
                                .foregroundStyle(.secondary)

                            Text("·")
                                .foregroundStyle(.secondary.opacity(0.5))

                            Text("\(formatNumber(day.lines)) lines")
                                .font(.system(size: 10))
                                .foregroundStyle(.secondary)
                        } else {
                            Text("No activity")
                                .font(.system(size: 10))
                                .foregroundStyle(.secondary.opacity(0.5))
                        }
                    }

                    if let hoveredDay, !hoveredDay.projects.isEmpty {
                        VStack(alignment: .leading, spacing: 3) {
                            ForEach(hoveredDay.projects.prefix(4)) { project in
                                HStack {
                                    Text(project.name)
                                        .font(.system(size: 10, weight: .medium))
                                        .lineLimit(1)
                                    Spacer(minLength: 4)
                                    Text("\(project.commits)c · \(formatNumber(project.lines)) lines")
                                        .font(.system(size: 9))
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .padding(.top, 2)
                    }
                }
                .padding(.horizontal, 14)
            }

            Spacer()
        }
        .task(id: services.map(\.id).joined(separator: ",")) {
            await loadStats()
        }
    }

    private func loadStats() async {
        let projects = StatsCollector.projectRefs(from: services)
        stats = await StatsCollector.getDailyStats(for: projects)
    }

    private func copyStats() {
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            copied = false
        }
    }

    private func formatNumber(_ n: Int) -> String {
        if n >= 10_000 { return "\(n / 1000)K" }
        if n >= 1000 { return String(format: "%.1fK", Double(n) / 1000) }
        return "\(n)"
    }

    private func formatDate(_ dateStr: String) -> String {
        let parser = DateFormatter()
        parser.calendar = Calendar.current
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "yyyy-MM-dd"
        guard let date = parser.date(from: dateStr) else { return dateStr }

        let display = DateFormatter()
        display.dateFormat = "MMM d"
        return display.string(from: date)
    }
}

struct StatNumber: View {
    let value: String
    let label: String
    var color: Color = .primary

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(size: 18, weight: .heavy, design: .rounded))
                .foregroundStyle(color)
                .tracking(-0.5)

            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(.secondary)
                .tracking(0.2)
        }
    }
}

struct ActivityGridView: View {
    let history: [DayActivity]
    @Binding var hoveredDay: DayActivity?

    private let columns = 6
    private let colors: [Color] = [
        Color.white.opacity(0.04),
        Color(red: 0.3, green: 0.63, blue: 0.35).opacity(0.35),
        Color(red: 0.3, green: 0.67, blue: 0.35).opacity(0.55),
        Color(red: 0.27, green: 0.75, blue: 0.33).opacity(0.75),
        Color(red: 0.3, green: 0.8, blue: 0.35)
    ]

    var body: some View {
        let days = generateDays()
        let maxScore = max(
            days.map { score(for: $0, in: days) }.max() ?? 0,
            0.0001
        )

        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 3), count: columns), spacing: 3) {
            ForEach(Array(days.enumerated()), id: \.offset) { index, day in
                let isToday = index == days.count - 1
                let isHovered = hoveredDay?.date == day.date
                let level = getLevel(day: day, maxScore: maxScore, days: days)

                Rectangle()
                    .fill(colors[level])
                    .aspectRatio(1, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: 3))
                    .overlay(
                        RoundedRectangle(cornerRadius: 3)
                            .stroke(
                                (hoveredDay != nil ? isHovered : isToday)
                                    ? Color.white.opacity(0.25)
                                    : Color.clear,
                                lineWidth: 1
                            )
                    )
                    .onHover { hovering in
                        hoveredDay = hovering ? day : nil
                    }
            }
        }
    }

    private func generateDays() -> [DayActivity] {
        var activityMap: [String: DayActivity] = [:]
        for day in history {
            activityMap[day.date] = day
        }

        var days: [DayActivity] = []
        let formatter = DateFormatter()
        formatter.calendar = Calendar.current
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"

        for offset in stride(from: 29, through: 0, by: -1) {
            guard let date = Calendar.current.date(byAdding: .day, value: -offset, to: Date()) else { continue }
            let dateStr = formatter.string(from: date)
            days.append(activityMap[dateStr] ?? DayActivity(date: dateStr, commits: 0, lines: 0))
        }

        return days
    }

    private func score(for day: DayActivity, in days: [DayActivity]) -> Double {
        let maxCommits = max(1, days.map(\.commits).max() ?? 1)
        let maxLines = max(1, days.map(\.lines).max() ?? 1)
        let maxTokens = max(1, days.map(\.tokens).max() ?? 1)
        return 0.4 * Double(day.commits) / Double(maxCommits)
            + 0.35 * Double(day.lines) / Double(maxLines)
            + 0.25 * Double(day.tokens) / Double(maxTokens)
    }

    private func getLevel(day: DayActivity, maxScore: Double, days: [DayActivity]) -> Int {
        guard day.commits > 0 || day.lines > 0 || day.tokens > 0 else { return 0 }
        let ratio = score(for: day, in: days) / maxScore
        if ratio > 0.75 { return 4 }
        if ratio > 0.5 { return 3 }
        if ratio > 0.25 { return 2 }
        return 1
    }
}

#Preview {
    StatsView(services: [], hoveredDay: .constant(nil))
        .frame(width: 220, height: 290)
        .background(.ultraThinMaterial)
}
