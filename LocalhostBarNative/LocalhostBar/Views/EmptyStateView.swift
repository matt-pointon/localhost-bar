import SwiftUI

/// Nothing running — say so plainly and show the one command that fixes it.
struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 6) {
            Text("No dev servers running")
                .font(Theme.title)
            HStack(spacing: 4) {
                Text("Run")
                Text(verbatim: "npm run dev")
                    .font(.system(size: 11, design: .monospaced))
                    .padding(.horizontal, 5)
                    .padding(.vertical, 1)
                    .background(
                        RoundedRectangle(cornerRadius: 4, style: .continuous)
                            .fill(Color.primary.opacity(0.07))
                    )
                Text("in a project and it’ll appear here.")
            }
            .font(Theme.meta)
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
    }
}

/// First scan, or a scan that failed.
struct PanelMessage: View {
    let title: String
    var detail: String?
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 6) {
            Text(verbatim: title)
                .font(Theme.title)
                .foregroundStyle(detail == nil ? HierarchicalShapeStyle.secondary : HierarchicalShapeStyle.primary)
            if let detail {
                Text(verbatim: detail)
                    .font(Theme.meta)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .controlSize(.small)
                    .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, Theme.inset)
        .padding(.vertical, 28)
    }
}
