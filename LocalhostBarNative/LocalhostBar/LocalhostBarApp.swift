import SwiftUI

@main
struct LocalhostBarApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var scanner = PortScanner.shared
    @StateObject private var tools = ToolRegistry()
    @StateObject private var stats = StatsModel()

    var body: some Scene {
        MenuBarExtra {
            ContentView()
                .environmentObject(scanner)
                .environmentObject(tools)
                .environmentObject(stats)
        } label: {
            // The count makes "is my server still up?" answerable without opening the panel.
            HStack(spacing: 3) {
                Image("MenuBarIcon")
                    .renderingMode(.template)
                if !scanner.services.isEmpty {
                    Text(verbatim: "\(scanner.services.count)")
                        .monospacedDigit()
                }
            }
        }
        .menuBarExtraStyle(.window)
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        PortScanner.shared.start()
    }
}
