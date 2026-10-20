import SwiftUI

/// Thirty days of your commits as a quiet bar strip. Hovering a day swaps the summary
/// line in place — the server list above never changes underneath you.
struct ActivityFooter: View {
    let stats: DailyStats?

    @State private var hoveredDate: String?

    private var history: [DayActivity] { stats?.history ?? [] }
    private var maxCommits: Int { max(1, history.map(\.commits).max() ?? 1) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            summary
            bars
        }
        .padding(.horizontal, Theme.inset)
        .padding(.top, 10)
        .padding(.bottom, 14)
    }

    private var summary: some View {
        let day = hoveredDate.flatMap { date in history.first { $0.date == date } } ?? stats?.today

        return HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(verbatim: hoveredDate.map(Self.label) ?? (stats == nil ? "Activity" : "Today"))
                .font(.system(size: 11, weight: .medium))
            if let day {
                Text(verbatim: Self.describe(day))
                    .font(Theme.meta)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            if hoveredDate == nil, let streak = stats?.streakDays, streak >= 2 {
                Text(verbatim: "\(streak)-day streak")
                    .font(Theme.meta)
                    .foregroundStyle(.secondary)
            }
        }
        .monospacedDigit()
        .lineLimit(1)
    }

    private var bars: some View {
        HStack(alignment: .bottom, spacing: 0) {
            ForEach(history.isEmpty ? Self.placeholder : history) { day in
                let hovered = day.date == hoveredDate
                RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                    .fill(color(for: day, hovered: hovered))
                    .frame(height: height(for: day))
                    .padding(.horizontal, 1)
                    // Full-height, gapless hit areas so the summary doesn't flicker between bars.
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                    .contentShape(Rectangle())
                    .onHover { inside in
                        if inside { hoveredDate = day.date }
                        else if hoveredDate == day.date { hoveredDate = nil }
                    }
            }
        }
        .frame(height: 24)
        .animation(Theme.snappy, value: hoveredDate)
        .animation(.easeOut(duration: 0.3), value: history)
    }

    private func height(for day: DayActivity) -> CGFloat {
        guard day.commits > 0 else { return 2 }
        // Square root so one huge day doesn't flatten the rest.
        return 5 + 19 * (Double(day.commits) / Double(maxCommits)).squareRoot()
    }

    private func color(for day: DayActivity, hovered: Bool) -> Color {
        if hovered { return .primary.opacity(0.9) }
        if day.commits == 0 { return .primary.opacity(0.1) }
        return .primary.opacity(day.date == history.last?.date ? 0.55 : 0.3)
    }

    private static let placeholder = (0..<StatsCollector.windowDays).reversed().map {
        DayActivity(date: DayFormat.string(daysAgo: $0), commits: 0, lines: 0)
    }

    private static func describe(_ day: DayActivity) -> String {
        guard day.commits > 0 else { return "No commits" }
        let commits = "\(day.commits) commit\(day.commits == 1 ? "" : "s")"
        return day.lines > 0 ? "\(commits) · \(compact(day.lines)) lines" : commits
    }

    private static func compact(_ n: Int) -> String {
        n >= 1000 ? String(format: "%.1fK", Double(n) / 1000).replacingOccurrences(of: ".0K", with: "K") : "\(n)"
    }

    private static let labelFormatter: DateFormatter = {
        let f = DateFormatter()
        f.setLocalizedDateFormatFromTemplate("EEE MMM d")
        return f
    }()

    private static func label(_ date: String) -> String {
        if date == DayFormat.string(daysAgo: 0) { return "Today" }
        if date == DayFormat.string(daysAgo: 1) { return "Yesterday" }
        return DayFormat.date(from: date).map { labelFormatter.string(from: $0) } ?? date
    }
}
