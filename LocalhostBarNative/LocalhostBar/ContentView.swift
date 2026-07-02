import SwiftUI

struct ContentView: View {
    @EnvironmentObject var portScanner: PortScanner
    @EnvironmentObject var toolRegistry: ToolRegistry
    @State private var hoveredServiceId: String?
    @State private var hoveredDay: DayActivity?
    
    var body: some View {
        HStack(spacing: 0) {
            // Left: Stats panel
            StatsView(services: portScanner.services, hoveredDay: $hoveredDay)
                .frame(width: 220)
            
            // Divider
            Rectangle()
                .fill(Color.white.opacity(0.06))
                .frame(width: 1)
                .padding(.vertical, 40)
            
            // Right: Service list
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack {
                    Text(headerTitle)
                        .font(.system(size: 10, weight: .medium))
                        .textCase(.uppercase)
                        .tracking(0.5)
                        .foregroundStyle(.secondary)
                    
                    Spacer()
                    
                    Button {
                        NSApp.terminate(nil)
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                    .help("Quit Localhost Bar")
                }
                .padding(.horizontal, 14)
                .padding(.top, 10)
                .padding(.bottom, 4)
                
                // Service list, day history, or empty state
                if let hoveredDay {
                    DayProjectListView(day: hoveredDay)
                } else if portScanner.services.isEmpty && !portScanner.isScanning {
                    EmptyStateView()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(portScanner.services) { service in
                                ServiceRowView(
                                    service: service,
                                    isHovered: hoveredServiceId == service.id,
                                    tools: toolRegistry.availableTools,
                                    onOpen: { openInBrowser(port: service.port) },
                                    onOpenFolder: { openInFinder(path: service.cwd) },
                                    onKill: { portScanner.killProcess(pid: service.pid) },
                                    onOpenWith: { tool in openWith(tool: tool, cwd: service.cwd) }
                                )
                                .onHover { isHovered in
                                    hoveredServiceId = isHovered ? service.id : nil
                                }
                            }
                        }
                        .padding(.vertical, 6)
                    }
                }
                
                // Offline services section
                if !portScanner.offlineServices.isEmpty {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Offline")
                            .font(.system(size: 10, weight: .medium))
                            .textCase(.uppercase)
                            .tracking(0.5)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                        
                        ForEach(portScanner.offlineServices) { service in
                            OfflineServiceRow(
                                service: service,
                                onRestart: { portScanner.restartService(service) },
                                onDismiss: { portScanner.dismissOffline(service) }
                            )
                        }
                    }
                    .padding(.top, 8)
                    .overlay(alignment: .top) {
                        Rectangle()
                            .fill(Color.white.opacity(0.04))
                            .frame(height: 1)
                    }
                }
            }
            .frame(minWidth: 280)
        }
        .frame(width: 560, height: 290)
        .background(.ultraThinMaterial)
        .onAppear {
            portScanner.startScanning()
            toolRegistry.detectTools()
        }
    }
    
    private var headerTitle: String {
        if let hoveredDay {
            let count = hoveredDay.projects.count
            let label = formatDayLabel(hoveredDay.date)
            return "\(count) Project\(count == 1 ? "" : "s") · \(label)"
        }
        let count = portScanner.services.count
        return "\(count) Project\(count == 1 ? "" : "s") Running"
    }

    private func formatDayLabel(_ dateStr: String) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar.current
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        let today = formatter.string(from: Date())
        if dateStr == today { return "Today" }

        guard let date = formatter.date(from: dateStr) else { return dateStr }
        let display = DateFormatter()
        display.dateFormat = "E, MMM d"
        return display.string(from: date)
    }

    private func openInBrowser(port: Int) {
        if let url = URL(string: "http://localhost:\(port)") {
            NSWorkspace.shared.open(url)
        }
    }
    
    private func openInFinder(path: String?) {
        guard let path = path else { return }
        NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: path)
    }
    
    private func openWith(tool: DetectedTool, cwd: String?) {
        guard let cwd = cwd else { return }
        toolRegistry.recordUsage(tool.id)
        ToolLauncher.open(tool: tool, at: cwd)
    }
}

#Preview {
    ContentView()
        .environmentObject(PortScanner())
        .environmentObject(ToolRegistry())
}
