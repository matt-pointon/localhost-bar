import SwiftUI
import ServiceManagement

@main
struct LocalhostBarApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var portScanner = PortScanner()
    @StateObject private var toolRegistry = ToolRegistry()
    
    var body: some Scene {
        MenuBarExtra {
            ContentView()
                .environmentObject(portScanner)
                .environmentObject(toolRegistry)
        } label: {
            Image("MenuBarIcon")
                .renderingMode(.template)
        }
        .menuBarExtraStyle(.window)
        
        Settings {
            SettingsView()
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Hide dock icon - we're a menu bar only app
        NSApp.setActivationPolicy(.accessory)
    }
}
