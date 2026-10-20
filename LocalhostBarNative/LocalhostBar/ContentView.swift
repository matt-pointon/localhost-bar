import SwiftUI
import ServiceManagement

/// The menu bar panel: servers first, a quiet activity strip underneath.
struct ContentView: View {
    @EnvironmentObject private var scanner: PortScanner
    @EnvironmentObject private var tools: ToolRegistry
    @EnvironmentObject private var stats: StatsModel

    var body: some View {
        VStack(spacing: 0) {
            header
            content
            Divider()
                .padding(.horizontal, Theme.inset)
            ActivityFooter(stats: stats.stats)
        }
        .frame(width: Theme.panelWidth)
        .background { keyboardShortcuts }
        .onAppear {
            tools.detect()
            stats.refreshIfStale()
        }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Text("Localhost")
                .font(.system(size: 13, weight: .semibold))
            Spacer()
            if !scanner.services.isEmpty {
                Text(verbatim: "\(scanner.services.count) running")
                    .font(Theme.meta)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
                    .contentTransition(.numericText())
            }
            PanelMenu()
        }
        .padding(.leading, Theme.inset)
        .padding(.trailing, 8)
        .frame(height: 40)
    }

    @ViewBuilder
    private var content: some View {
        if !scanner.hasScanned {
            PanelMessage(title: "Looking for servers…")
        } else if scanner.scanFailed {
            PanelMessage(
                title: "Couldn’t read open ports",
                detail: "lsof didn’t respond. This usually clears up on the next scan.",
                actionTitle: "Try Again",
                action: { Task { await scanner.scan() } }
            )
        } else if scanner.services.isEmpty && scanner.offlineServices.isEmpty {
            EmptyStateView()
        } else {
            list
        }
    }

    private var list: some View {
        ScrollView {
            VStack(spacing: 0) {
                ForEach(scanner.services) { service in
                    ServiceRowView(service: service)
                        .transition(.opacity)
                }
                if !scanner.offlineServices.isEmpty {
                    SectionLabel(text: "Stopped")
                    ForEach(scanner.offlineServices) { service in
                        OfflineRowView(service: service)
                            .transition(.opacity)
                    }
                }
            }
            .padding(.horizontal, 6)
            .padding(.bottom, 6)
            .animation(Theme.snappy, value: scanner.services.map(\.id))
            .animation(Theme.snappy, value: scanner.offlineServices.map(\.id))
        }
        .scrollBounceBehavior(.basedOnSize)
        .frame(height: listHeight)
    }

    /// The panel sizes to its content; past ~7 rows the list scrolls instead.
    private var listHeight: CGFloat {
        let running = CGFloat(scanner.services.count) * Theme.rowHeight
        let offline = scanner.offlineServices.isEmpty
            ? 0
            : Theme.sectionHeight + CGFloat(scanner.offlineServices.count) * Theme.rowHeight
        return min(running + offline + 6, Theme.maxListHeight)
    }

    /// ⌘R and ⌘Q work whenever the panel is open, not just inside the ⋯ menu.
    private var keyboardShortcuts: some View {
        ZStack {
            Button("Refresh") { Task { await scanner.scan() } }
                .keyboardShortcut("r")
            Button("Quit") { NSApp.terminate(nil) }
                .keyboardShortcut("q")
        }
        .opacity(0)
        .frame(width: 0, height: 0)
        .accessibilityHidden(true)
    }
}

/// Settings live here instead of a separate window a menu bar app can't easily open.
struct PanelMenu: View {
    @EnvironmentObject private var scanner: PortScanner
    @State private var opensAtLogin = SMAppService.mainApp.status == .enabled

    var body: some View {
        Menu {
            Button("Refresh") { Task { await scanner.scan() } }
            Toggle("Open at Login", isOn: Binding(get: { opensAtLogin }, set: setOpensAtLogin))
            Divider()
            Button("Quit Localhost Bar") { NSApp.terminate(nil) }
        } label: {
            Image(systemName: "ellipsis")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.secondary)
                .frame(width: 26, height: 26)
                .contentShape(Rectangle())
        }
        .menuStyle(.borderlessButton)
        .menuIndicator(.hidden)
        .fixedSize()
        .help("More")
    }

    private func setOpensAtLogin(_ enabled: Bool) {
        do {
            if enabled {
                try SMAppService.mainApp.register()
            } else {
                try SMAppService.mainApp.unregister()
            }
        } catch {
            // Fall through: reflect whatever macOS actually did.
        }
        opensAtLogin = SMAppService.mainApp.status == .enabled
    }
}

#Preview {
    ContentView()
        .environmentObject(PortScanner.shared)
        .environmentObject(ToolRegistry())
        .environmentObject(StatsModel())
}
