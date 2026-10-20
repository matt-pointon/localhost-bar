import SwiftUI

/// One running server. Click opens it in the browser; hover reveals "open in editor" and
/// "stop"; right-click has everything else.
struct ServiceRowView: View {
    let service: ServiceInfo

    @EnvironmentObject private var scanner: PortScanner
    @EnvironmentObject private var tools: ToolRegistry
    @State private var hovered = false
    @State private var pressed = false

    private var isStopping: Bool { service.status == .stopping }

    var body: some View {
        HStack(spacing: 10) {
            StatusDot(kind: isStopping ? .stopping : .running)

            VStack(alignment: .leading, spacing: 2) {
                Text(verbatim: service.name)
                    .font(Theme.title)
                    .lineLimit(1)
                    .truncationMode(.middle)
                Text(verbatim: subtitle)
                    .font(Theme.meta)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            if hovered && !isStopping {
                actions.transition(.opacity)
            }

            PortLabel(port: service.port, highlighted: hovered && !isStopping)
        }
        .rowChrome(hovered: hovered && !isStopping, pressed: pressed && !isStopping)
        .opacity(isStopping ? 0.5 : 1)
        .onHover { inside in
            withAnimation(Theme.snappy) { hovered = inside }
            if !inside { pressed = false }
        }
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in pressed = true }
                .onEnded { _ in pressed = false }
        )
        .onTapGesture(perform: openInBrowser)
        .contextMenu { menu }
        .help(Text(verbatim: "Open localhost:\(service.port)"))
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { openInBrowser() }
        .accessibilityAction(named: "Stop server") { scanner.stop(service) }
    }

    private func openInBrowser() {
        if !isStopping { NSWorkspace.shared.open(service.url) }
    }

    private var subtitle: String {
        if isStopping { return "Stopping…" }
        guard let git = service.git else { return Self.runtimeName(service.command) }
        return git.changes > 0 ? "\(git.branch) · \(git.changes) changed" : git.branch
    }

    @ViewBuilder
    private var actions: some View {
        HStack(spacing: 2) {
            if let cwd = service.cwd, let editor = tools.preferredEditor {
                IconButton(help: "Open in \(editor.name)", action: { tools.open(editor, at: cwd) }) {
                    ToolIcon(tool: editor)
                }
            }
            IconButton(help: "Stop server", destructive: true, action: { scanner.stop(service) }) {
                Image(systemName: "stop.fill").font(.system(size: 9))
            }
        }
    }

    @ViewBuilder
    private var menu: some View {
        Button("Open in Browser") { NSWorkspace.shared.open(service.url) }
        Button("Copy URL") { copy(service.url.absoluteString) }

        if let cwd = service.cwd {
            Divider()
            ForEach(tools.tools) { tool in
                Button {
                    tools.open(tool, at: cwd)
                } label: {
                    if let icon = ToolIcon.image(for: tool) {
                        Label { Text(verbatim: "Open in \(tool.name)") } icon: { Image(nsImage: icon) }
                    } else {
                        Text(verbatim: "Open in \(tool.name)")
                    }
                }
            }
            Button("Reveal in Finder") { ToolLauncher.revealInFinder(cwd) }
            Button("Copy Path") { copy(cwd) }
        }

        Divider()
        Button("Stop Server", role: .destructive) { scanner.stop(service) }
    }

    private func copy(_ text: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
    }

    static func runtimeName(_ command: String) -> String {
        let names = [
            "node": "Node", "bun": "Bun", "deno": "Deno", "python": "Python", "ruby": "Ruby",
            "php": "PHP", "java": "Java", "go": "Go", "dotnet": ".NET", "beam.smp": "Elixir"
        ]
        let base = String(command.lowercased().reversed().drop { $0.isNumber || $0 == "." }.reversed())
        return names[base] ?? command
    }
}

/// A server that stopped while Localhost Bar was watching.
struct OfflineRowView: View {
    let service: OfflineService

    @EnvironmentObject private var scanner: PortScanner
    @State private var hovered = false

    private var isStarting: Bool { scanner.restarting.contains(service.id) }

    var body: some View {
        HStack(spacing: 10) {
            StatusDot(kind: isStarting ? .stopping : .stopped)

            VStack(alignment: .leading, spacing: 2) {
                Text(verbatim: service.name)
                    .font(Theme.title)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .truncationMode(.middle)
                TimelineView(.periodic(from: .now, by: 30)) { context in
                    Text(verbatim: isStarting ? "Starting…" : "Stopped \(Self.ago(service.exitedAt, now: context.date))")
                        .font(Theme.meta)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer(minLength: 8)

            if hovered && !isStarting {
                HStack(spacing: 2) {
                    IconButton(help: "Start again", action: { scanner.restart(service) }) {
                        Image(systemName: "arrow.clockwise").font(.system(size: 11, weight: .medium))
                    }
                    IconButton(help: "Dismiss", action: { withAnimation(Theme.snappy) { scanner.dismiss(service) } }) {
                        Image(systemName: "xmark").font(.system(size: 10, weight: .medium))
                    }
                }
                .transition(.opacity)
            }

            PortLabel(port: service.port, dimmed: true)
        }
        .rowChrome(hovered: hovered && !isStarting)
        .onHover { inside in
            withAnimation(Theme.snappy) { hovered = inside }
        }
    }

    static func ago(_ date: Date, now: Date) -> String {
        let seconds = Int(now.timeIntervalSince(date))
        switch seconds {
        case ..<60: return "just now"
        case ..<3600: return "\(seconds / 60)m ago"
        case ..<86_400: return "\(seconds / 3600)h ago"
        default: return "\(seconds / 86_400)d ago"
        }
    }
}
