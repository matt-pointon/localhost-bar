import SwiftUI

struct DayProjectListView: View {
    let day: DayActivity

    var body: some View {
        if day.projects.isEmpty {
            Text(day.tokens > 0 ? "AI activity only — no commits this day" : "No project activity on this day")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
                .padding(.horizontal, 14)
        } else {
            VStack(spacing: 0) {
                ForEach(day.projects) { project in
                    DayProjectRow(project: project)
                }
            }
            .padding(.vertical, 6)
        }
    }
}

private struct DayProjectRow: View {
    let project: DayProject
    @State private var hovered = false

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "arrow.triangle.branch")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color(red: 0.35, green: 0.78, blue: 0.45))

            VStack(alignment: .leading, spacing: 1) {
                Text(project.name)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                HStack(spacing: 5) {
                    Text("\(project.commits) commit\(project.commits == 1 ? "" : "s")")
                    if project.lines > 0 {
                        Text("·").opacity(0.3)
                        Text("\(formatNumber(project.lines)) lines")
                    }
                }
                .font(.system(size: 9))
                .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)

            Image(systemName: "folder")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .opacity(hovered ? 1 : 0)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(hovered ? Color.white.opacity(0.04) : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .padding(.horizontal, 4)
        .contentShape(Rectangle())
        .onHover { hovering in hovered = hovering }
        .onTapGesture {
            NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: project.cwd)
        }
    }

    private func formatNumber(_ n: Int) -> String {
        if n >= 10_000 { return "\(n / 1000)K" }
        if n >= 1000 { return String(format: "%.1fK", Double(n) / 1000) }
        return "\(n)"
    }
}
