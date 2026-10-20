import SwiftUI

/// The panel's whole visual vocabulary: three type sizes, one radius, one motion curve,
/// neutral colors that follow the system appearance, and green reserved for "live".
enum Theme {
    static let panelWidth: CGFloat = 340
    static let inset: CGFloat = 16
    static let rowHeight: CGFloat = 44
    static let sectionHeight: CGFloat = 30
    /// A partly visible last row hints that the list scrolls.
    static let maxListHeight: CGFloat = 7.5 * rowHeight

    static let title = Font.system(size: 13, weight: .medium)
    static let meta = Font.system(size: 11)
    static let port = Font.system(size: 12).monospacedDigit()

    static let live = Color(nsColor: .systemGreen)
    static let snappy = Animation.snappy(duration: 0.18)

    static func fill(hovered: Bool, pressed: Bool = false) -> Color {
        Color.primary.opacity(pressed ? 0.10 : hovered ? 0.06 : 0)
    }
}

extension View {
    /// Shared geometry for server rows, so names and ports line up with the header.
    func rowChrome(hovered: Bool, pressed: Bool = false) -> some View {
        padding(.horizontal, 10)
            .frame(height: Theme.rowHeight)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Theme.fill(hovered: hovered, pressed: pressed))
            )
            .contentShape(Rectangle())
    }
}

struct StatusDot: View {
    enum Kind { case running, stopping, stopped }
    let kind: Kind

    @State private var pulsing = false

    var body: some View {
        ZStack {
            switch kind {
            case .running:
                Circle().fill(Theme.live.opacity(0.18)).frame(width: 13, height: 13)
                Circle().fill(Theme.live).frame(width: 7, height: 7)
            case .stopping:
                Circle().fill(Color(nsColor: .systemOrange)).frame(width: 7, height: 7)
                    .opacity(pulsing ? 0.3 : 1)
                    .onAppear {
                        withAnimation(.easeInOut(duration: 0.6).repeatForever()) { pulsing = true }
                    }
            case .stopped:
                Circle().strokeBorder(.tertiary, lineWidth: 1.25).frame(width: 7, height: 7)
            }
        }
        .frame(width: 13, height: 13)
    }
}

/// `:3000`, right-aligned. The arrow appears on hover to show the row opens the browser;
/// its space is always reserved so ports stay in one column.
struct PortLabel: View {
    let port: Int
    var highlighted = false
    var dimmed = false

    var body: some View {
        HStack(spacing: 3) {
            Text(verbatim: ":\(port)")
                .font(Theme.port)
                .foregroundStyle(
                    highlighted ? HierarchicalShapeStyle.primary
                        : dimmed ? HierarchicalShapeStyle.tertiary
                        : HierarchicalShapeStyle.secondary
                )
            Image(systemName: "arrow.up.right")
                .font(.system(size: 9, weight: .semibold))
                .foregroundStyle(.secondary)
                .opacity(highlighted ? 1 : 0)
        }
    }
}

struct IconButton<Label: View>: View {
    let help: String
    var destructive = false
    let action: () -> Void
    @ViewBuilder let label: () -> Label

    @State private var hovered = false

    var body: some View {
        Button(action: action) {
            label()
                .frame(width: 26, height: 26)
                .contentShape(Rectangle())
        }
        .buttonStyle(IconButtonStyle(hovered: hovered, destructive: destructive))
        .onHover { hovered = $0 }
        .help(help)
    }
}

private struct IconButtonStyle: ButtonStyle {
    let hovered: Bool
    let destructive: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(foreground)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(Color.primary.opacity(configuration.isPressed ? 0.12 : hovered ? 0.08 : 0))
            )
            .scaleEffect(configuration.isPressed ? 0.92 : 1)
            .animation(.snappy(duration: 0.12), value: configuration.isPressed)
    }

    private var foreground: AnyShapeStyle {
        guard hovered else { return AnyShapeStyle(HierarchicalShapeStyle.secondary) }
        return destructive ? AnyShapeStyle(Color(nsColor: .systemRed)) : AnyShapeStyle(HierarchicalShapeStyle.primary)
    }
}

/// An installed app's real icon, sized for rows and menus.
struct ToolIcon: View {
    let tool: DetectedTool
    var size: CGFloat = 16

    var body: some View {
        if let image = ToolIcon.image(for: tool, size: size) {
            Image(nsImage: image)
        } else {
            Image(systemName: "terminal").font(.system(size: size * 0.75))
        }
    }

    static func image(for tool: DetectedTool, size: CGFloat = 16) -> NSImage? {
        guard let url = tool.appURL else { return nil }
        let icon = NSWorkspace.shared.icon(forFile: url.path)
        icon.size = NSSize(width: size, height: size)
        return icon
    }
}

struct SectionLabel: View {
    let text: String

    var body: some View {
        Text(verbatim: text)
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 10)
            .padding(.bottom, 6)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(height: Theme.sectionHeight, alignment: .bottom)
    }
}
