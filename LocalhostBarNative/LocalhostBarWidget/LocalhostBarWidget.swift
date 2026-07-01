import WidgetKit
import SwiftUI

// MARK: - Widget Timeline Provider

struct ServerCountProvider: TimelineProvider {
    func placeholder(in context: Context) -> ServerCountEntry {
        ServerCountEntry(date: Date(), serverCount: 3, topServers: [
            WidgetServer(name: "My App", port: 3000),
            WidgetServer(name: "API", port: 8080),
            WidgetServer(name: "Admin", port: 4000)
        ])
    }
    
    func getSnapshot(in context: Context, completion: @escaping (ServerCountEntry) -> Void) {
        let entry = ServerCountEntry(date: Date(), serverCount: 2, topServers: [
            WidgetServer(name: "Frontend", port: 3000),
            WidgetServer(name: "Backend", port: 8080)
        ])
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<ServerCountEntry>) -> Void) {
        // In production, this would scan for actual running servers
        // For now, using placeholder data
        let entry = ServerCountEntry(date: Date(), serverCount: 0, topServers: [])
        
        // Refresh every 30 seconds
        let nextUpdate = Calendar.current.date(byAdding: .second, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Widget Entry

struct ServerCountEntry: TimelineEntry {
    let date: Date
    let serverCount: Int
    let topServers: [WidgetServer]
}

struct WidgetServer: Identifiable {
    var id: String { "\(port)" }
    let name: String
    let port: Int
}

// MARK: - Widget Views

struct LocalhostBarWidgetEntryView: View {
    var entry: ServerCountProvider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

struct SmallWidgetView: View {
    let entry: ServerCountEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "network")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.green)
                
                Spacer()
            }
            
            Spacer()
            
            VStack(alignment: .leading, spacing: 2) {
                Text("\(entry.serverCount)")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundStyle(.primary)
                
                Text(entry.serverCount == 1 ? "Server Running" : "Servers Running")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

struct MediumWidgetView: View {
    let entry: ServerCountEntry
    
    var body: some View {
        HStack(spacing: 16) {
            // Left side - count
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Image(systemName: "network")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.green)
                    
                    Text("Localhost")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.secondary)
                }
                
                Spacer()
                
                Text("\(entry.serverCount)")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundStyle(.primary)
                
                Text(entry.serverCount == 1 ? "Server" : "Servers")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            // Divider
            Rectangle()
                .fill(.tertiary)
                .frame(width: 1)
            
            // Right side - server list
            VStack(alignment: .leading, spacing: 6) {
                if entry.topServers.isEmpty {
                    Text("No servers running")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                } else {
                    ForEach(entry.topServers.prefix(3)) { server in
                        HStack(spacing: 6) {
                            Circle()
                                .fill(.green)
                                .frame(width: 6, height: 6)
                            
                            Text(server.name)
                                .font(.system(size: 12, weight: .medium))
                                .lineLimit(1)
                            
                            Spacer()
                            
                            Text(":\(server.port)")
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundStyle(.secondary)
                        }
                    }
                    
                    Spacer()
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Widget Configuration

struct LocalhostBarWidget: Widget {
    let kind: String = "LocalhostBarWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ServerCountProvider()) { entry in
            LocalhostBarWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Running Servers")
        .description("Shows how many development servers are currently running on localhost.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Widget Bundle

@main
struct LocalhostBarWidgetBundle: WidgetBundle {
    var body: some Widget {
        LocalhostBarWidget()
    }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
    LocalhostBarWidget()
} timeline: {
    ServerCountEntry(date: .now, serverCount: 3, topServers: [])
    ServerCountEntry(date: .now, serverCount: 0, topServers: [])
}

#Preview(as: .systemMedium) {
    LocalhostBarWidget()
} timeline: {
    ServerCountEntry(date: .now, serverCount: 3, topServers: [
        WidgetServer(name: "My App", port: 3000),
        WidgetServer(name: "API Server", port: 8080),
        WidgetServer(name: "Admin Panel", port: 4000)
    ])
}
