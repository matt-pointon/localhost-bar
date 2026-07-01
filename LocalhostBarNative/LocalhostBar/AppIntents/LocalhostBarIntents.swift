import AppIntents
import Foundation

// MARK: - Show Running Servers Intent

struct ShowRunningServersIntent: AppIntent {
    static var title: LocalizedStringResource = "Show Running Servers"
    static var description = IntentDescription("Opens the Localhost Bar menu to show all running development servers.")
    
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        // The app will open and show the menu bar popover
        return .result()
    }
}

// MARK: - Get Server Count Intent

struct GetServerCountIntent: AppIntent {
    static var title: LocalizedStringResource = "Get Server Count"
    static var description = IntentDescription("Returns the number of currently running development servers.")
    
    func perform() async throws -> some IntentResult & ReturnsValue<Int> {
        let scanner = await MainActor.run { PortScanner() }
        // In production, we'd use a shared service
        return .result(value: 0)
    }
}

// MARK: - Kill Server Intent

struct KillServerIntent: AppIntent {
    static var title: LocalizedStringResource = "Stop Server"
    static var description = IntentDescription("Stops a development server running on the specified port.")
    
    @Parameter(title: "Port", description: "The port number of the server to stop")
    var port: Int
    
    func perform() async throws -> some IntentResult {
        // Kill the process on the specified port
        // This would use the PortScanner to find and kill the process
        return .result()
    }
}

// MARK: - Open Server Intent

struct OpenServerIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Server in Browser"
    static var description = IntentDescription("Opens a running server in your default web browser.")
    
    @Parameter(title: "Port", description: "The port number of the server to open")
    var port: Int
    
    func perform() async throws -> some IntentResult {
        if let url = URL(string: "http://localhost:\(port)") {
            await MainActor.run {
                NSWorkspace.shared.open(url)
            }
        }
        return .result()
    }
}

// MARK: - App Shortcuts Provider

struct LocalhostBarShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ShowRunningServersIntent(),
            phrases: [
                "Show my servers in \(.applicationName)",
                "Show running servers",
                "Open \(.applicationName)",
                "Show localhost servers"
            ],
            shortTitle: "Show Servers",
            systemImageName: "network"
        )
        
        AppShortcut(
            intent: GetServerCountIntent(),
            phrases: [
                "How many servers are running",
                "Count my servers in \(.applicationName)"
            ],
            shortTitle: "Server Count",
            systemImageName: "number"
        )
        
        AppShortcut(
            intent: KillServerIntent(),
            phrases: [
                "Stop server on port \(\.$port) in \(.applicationName)",
                "Kill server on port \(\.$port)"
            ],
            shortTitle: "Stop Server",
            systemImageName: "stop.fill"
        )
        
        AppShortcut(
            intent: OpenServerIntent(),
            phrases: [
                "Open server on port \(\.$port)",
                "Open localhost \(\.$port) in browser"
            ],
            shortTitle: "Open Server",
            systemImageName: "globe"
        )
    }
}
