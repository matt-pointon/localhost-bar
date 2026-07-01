import SwiftUI

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "network.slash")
                .font(.system(size: 32, weight: .light))
                .foregroundStyle(.secondary.opacity(0.5))
            
            VStack(spacing: 4) {
                Text("No servers running")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.secondary)
                
                Text("Start a dev server to see it here")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary.opacity(0.7))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

struct OfflineServiceRow: View {
    let service: OfflineService
    let onRestart: () -> Void
    let onDismiss: () -> Void
    
    @State private var isHovered = false
    
    var body: some View {
        HStack(spacing: 8) {
            // Offline indicator
            Circle()
                .fill(Color.gray.opacity(0.5))
                .frame(width: 6, height: 6)
            
            // Name and port
            VStack(alignment: .leading, spacing: 2) {
                Text(service.name)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                
                Text(":\(service.port)")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(.secondary.opacity(0.7))
            }
            
            Spacer()
            
            // Actions (visible on hover)
            if isHovered {
                HStack(spacing: 2) {
                    Button {
                        onRestart()
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                    .frame(width: 24, height: 24)
                    .background(Color.white.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 5))
                    .help("Restart")
                    
                    Button {
                        onDismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                    .frame(width: 24, height: 24)
                    .background(Color.white.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 5))
                    .help("Dismiss")
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(isHovered ? Color.white.opacity(0.02) : .clear)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .padding(.horizontal, 4)
        .onHover { isHovered = $0 }
    }
}

#Preview {
    VStack {
        EmptyStateView()
            .frame(height: 200)
        
        Divider()
        
        OfflineServiceRow(
            service: OfflineService(
                port: 3000,
                name: "My App",
                cwd: "/Users/test/my-app",
                args: "npm run dev",
                exitedAt: Date()
            ),
            onRestart: {},
            onDismiss: {}
        )
    }
    .frame(width: 300)
    .background(.ultraThinMaterial)
}
