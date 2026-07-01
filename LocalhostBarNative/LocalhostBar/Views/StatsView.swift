import SwiftUI

struct StatsView: View {
    let services: [ServiceInfo]
    
    @State private var stats: DailyStats?
    @State private var hoveredDay: DayActivity?
    @State private var copied = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header with share button
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
            
            // Stats numbers
            HStack(spacing: 20) {
                if let stats = stats {
                    if stats.linesChangedToday > 0 {
                        StatNumber(
                            value: formatNumber(stats.linesChangedToday),
                            label: stats.linesChangedToday == 1 ? "Line" : "Lines"
                        )
                    }
                    
                    if stats.commitsToday > 0 {
                        StatNumber(
                            value: formatNumber(stats.commitsToday),
                            label: stats.commitsToday == 1 ? "Commit" : "Commits"
                        )
                    }
                    
                    if stats.streakDays > 0 {
                        StatNumber(value: "\(stats.streakDays)d", label: "Streak")
                    }
                }
            }
            .padding(.horizontal, 14)
            
            // Activity grid
            ActivityGridView(
                history: stats?.history ?? [],
                hoveredDay: $hoveredDay
            )
            .padding(.horizontal, 14)
            
            // Day info
            if let day = hoveredDay ?? stats?.history.last {
                HStack(spacing: 8) {
                    Text(hoveredDay == nil ? "Today" : formatDate(day.date))
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.primary)
                    
                    if day.commits > 0 {
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
                .padding(.horizontal, 14)
            }
            
            Spacer()
        }
        .onAppear {
            loadStats()
        }
    }
    
    private func loadStats() {
        let cwds = services.compactMap { $0.cwd }
        Task {
            stats = await StatsCollector.getDailyStats(for: cwds)
        }
    }
    
    private func copyStats() {
        // In production, this would capture the stats view as an image
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            copied = false
        }
    }
    
    private func formatNumber(_ n: Int) -> String {
        if n >= 10_000 {
            return "\(n / 1000)K"
        } else if n >= 1000 {
            return String(format: "%.1fK", Double(n) / 1000)
        }
        return "\(n)"
    }
    
    private func formatDate(_ dateStr: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: dateStr) else { return dateStr }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "MMM d"
        return displayFormatter.string(from: date)
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
        let maxLines = max(1, days.map { $0.lines }.max() ?? 1)
        
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 3), count: columns), spacing: 3) {
            ForEach(Array(days.enumerated()), id: \.offset) { index, day in
                let isToday = index == days.count - 1
                let isHovered = hoveredDay?.date == day.date
                let level = getLevel(lines: day.lines, maxLines: maxLines)
                
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
        let today = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        for i in (0..<30).reversed() {
            guard let date = Calendar.current.date(byAdding: .day, value: -i, to: today) else { continue }
            let dateStr = formatter.string(from: date)
            let activity = activityMap[dateStr] ?? DayActivity(date: dateStr, commits: 0, lines: 0)
            days.append(activity)
        }
        
        return days
    }
    
    private func getLevel(lines: Int, maxLines: Int) -> Int {
        guard lines > 0 else { return 0 }
        let ratio = Double(lines) / Double(maxLines)
        if ratio > 0.75 { return 4 }
        if ratio > 0.5 { return 3 }
        if ratio > 0.25 { return 2 }
        return 1
    }
}

// Stats models
struct DailyStats {
    let commitsToday: Int
    let linesChangedToday: Int
    let streakDays: Int
    let history: [DayActivity]
}

struct DayActivity: Equatable {
    let date: String
    let commits: Int
    let lines: Int
}

// Stats collector (simplified)
enum StatsCollector {
    static func getDailyStats(for cwds: [String]) async -> DailyStats? {
        // This would collect stats from git repos
        // Simplified implementation for now
        var totalCommits = 0
        var totalLines = 0
        var history: [DayActivity] = []
        
        for cwd in cwds {
            if let repoStats = await getRepoStats(cwd: cwd) {
                totalCommits += repoStats.commits
                totalLines += repoStats.lines
            }
        }
        
        // Generate sample history for the last 30 days
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let today = Date()
        
        for i in (0..<30).reversed() {
            if let date = Calendar.current.date(byAdding: .day, value: -i, to: today) {
                let dateStr = formatter.string(from: date)
                // Random sample data - in production this comes from git log
                let commits = i == 0 ? totalCommits : Int.random(in: 0...5)
                let lines = i == 0 ? totalLines : commits * Int.random(in: 10...100)
                history.append(DayActivity(date: dateStr, commits: commits, lines: lines))
            }
        }
        
        return DailyStats(
            commitsToday: totalCommits,
            linesChangedToday: totalLines,
            streakDays: calculateStreak(history: history),
            history: history
        )
    }
    
    private static func getRepoStats(cwd: String) async -> (commits: Int, lines: Int)? {
        // Get today's commits
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let today = formatter.string(from: Date())
        
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/git")
        process.arguments = ["log", "--oneline", "--since=\(today) 00:00:00", "--format=%h"]
        process.currentDirectoryURL = URL(fileURLWithPath: cwd)
        
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = FileHandle.nullDevice
        
        do {
            try process.run()
            process.waitUntilExit()
            
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: data, encoding: .utf8) ?? ""
            let commits = output.components(separatedBy: "\n").filter { !$0.isEmpty }.count
            
            // Simplified line count - in production use git diff --stat
            return (commits: commits, lines: commits * 50)
        } catch {
            return nil
        }
    }
    
    private static func calculateStreak(history: [DayActivity]) -> Int {
        var streak = 0
        for day in history.reversed() {
            if day.commits > 0 {
                streak += 1
            } else {
                break
            }
        }
        return streak
    }
}

#Preview {
    StatsView(services: [])
        .frame(width: 220, height: 290)
        .background(.ultraThinMaterial)
}
