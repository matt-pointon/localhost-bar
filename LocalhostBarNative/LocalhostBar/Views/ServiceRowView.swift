import SwiftUI

struct ServiceRowView: View {
    let service: ServiceInfo
    let isHovered: Bool
    let tools: [DetectedTool]
    let onOpen: () -> Void
    let onOpenFolder: () -> Void
    let onKill: () -> Void
    let onOpenWith: (DetectedTool) -> Void
    
    @State private var showQuickActions = false
    
    private var isStopping: Bool {
        service.status == .stopping
    }
    
    var body: some View {
        HStack(spacing: 8) {
            // Status indicator
            Circle()
                .fill(statusColor)
                .frame(width: 6, height: 6)
                .opacity(isStopping ? 0.5 : 1)
                .animation(isStopping ? .easeInOut(duration: 0.5).repeatForever() : .default, value: isStopping)
            
            // Name and port
            VStack(alignment: .leading, spacing: 2) {
                Text(service.name)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                
                HStack(spacing: 4) {
                    Text(":\(service.port)")
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundStyle(.secondary)
                    
                    if let resources = service.resources {
                        Text("·")
                            .foregroundStyle(.secondary.opacity(0.5))
                        Text("\(resources.mem)MB")
                            .font(.system(size: 9))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            
            Spacer()
            
            // Action buttons (visible on hover)
            if isHovered && !isStopping {
                HStack(spacing: 2) {
                    if service.cwd != nil {
                        // Quick actions menu
                        Menu {
                            ForEach(ToolCategory.allCases, id: \.self) { category in
                                let categoryTools = tools.filter { $0.category == category }
                                if !categoryTools.isEmpty {
                                    Section(category.rawValue.capitalized) {
                                        ForEach(categoryTools) { tool in
                                            Button {
                                                onOpenWith(tool)
                                            } label: {
                                                Label(tool.name, systemImage: tool.icon)
                                            }
                                        }
                                    }
                                }
                            }
                        } label: {
                            Image(systemName: "ellipsis")
                                .font(.system(size: 10, weight: .medium))
                        }
                        .menuStyle(.borderlessButton)
                        .frame(width: 24, height: 24)
                        .help("Open with...")
                        
                        // Finder button
                        ActionButton(icon: "folder", help: "Open in Finder", action: onOpenFolder)
                    }
                    
                    // Open in browser
                    ActionButton(icon: "arrow.up.right", help: "Open in Browser", action: onOpen)
                    
                    // Kill button
                    ActionButton(icon: "stop.fill", help: "Stop", destructive: true, action: onKill)
                }
                .transition(.opacity)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(isHovered ? Color.white.opacity(0.04) : .clear)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .padding(.horizontal, 4)
        .contentShape(Rectangle())
        .onTapGesture {
            if !isStopping {
                onOpen()
            }
        }
        .opacity(isStopping ? 0.4 : 1)
        .allowsHitTesting(!isStopping)
        .animation(.easeInOut(duration: 0.15), value: isHovered)
    }
    
    private var statusColor: Color {
        switch service.status {
        case .running:
            return Color(red: 0.3, green: 0.85, blue: 0.4) // Green
        case .stopping, .exiting:
            return Color.orange
        }
    }
}

struct ActionButton: View {
    let icon: String
    let help: String
    var destructive: Bool = false
    let action: () -> Void
    
    @State private var isHovered = false
    
    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(isHovered && destructive ? .red : isHovered ? .primary : .secondary)
        }
        .buttonStyle(.plain)
        .frame(width: 24, height: 24)
        .background(isHovered ? Color.white.opacity(0.1) : .clear)
        .clipShape(RoundedRectangle(cornerRadius: 5))
        .help(help)
        .onHover { isHovered = $0 }
    }
}

#Preview {
    VStack {
        ServiceRowView(
            service: ServiceInfo(
                pid: 1234,
                port: 3000,
                name: "My App",
                command: "Node.js",
                address: "127.0.0.1",
                cwd: "/Users/test/my-app",
                args: "node server.js",
                git: GitStatus(branch: "main", changes: 3, lastCommit: "Fix bug"),
                resources: ResourceUsage(cpu: 2.5, mem: 128)
            ),
            isHovered: true,
            tools: [],
            onOpen: {},
            onOpenFolder: {},
            onKill: {},
            onOpenWith: { _ in }
        )
    }
    .frame(width: 300)
    .background(.ultraThinMaterial)
}
