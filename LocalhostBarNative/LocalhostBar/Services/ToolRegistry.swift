import Foundation
import Combine

@MainActor
class ToolRegistry: ObservableObject {
    @Published private(set) var availableTools: [DetectedTool] = []
    
    private var toolUsage: [String: Date] = [:]
    private let usageFileURL: URL
    private let cacheTTL: TimeInterval = 60.0
    private var lastDetection: Date?
    
    init() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let appDir = appSupport.appendingPathComponent("LocalhostBar", isDirectory: true)
        try? FileManager.default.createDirectory(at: appDir, withIntermediateDirectories: true)
        usageFileURL = appDir.appendingPathComponent("tool-usage.json")
        loadUsage()
    }
    
    func detectTools() {
        if let lastDetection = lastDetection,
           Date().timeIntervalSince(lastDetection) < cacheTTL {
            return
        }
        
        var tools: [DetectedTool] = []
        
        // Editors
        tools.append(detectTool(id: "vscode", name: "VS Code", category: .editor, cli: "code", app: "Visual Studio Code"))
        tools.append(detectTool(id: "cursor", name: "Cursor", category: .editor, cli: "cursor", app: "Cursor"))
        tools.append(detectTool(id: "windsurf", name: "Windsurf", category: .editor, cli: "windsurf", app: "Windsurf"))
        tools.append(detectTool(id: "zed", name: "Zed", category: .editor, cli: "zed", app: "Zed"))
        tools.append(detectTool(id: "xcode", name: "Xcode", category: .editor, cli: nil, app: "Xcode"))
        
        // Terminals
        tools.append(DetectedTool(id: "terminal", name: "Terminal", category: .terminal, available: true, hasCli: false, cliCommand: nil, appName: "Terminal", auth: nil))
        tools.append(detectTool(id: "iterm2", name: "iTerm2", category: .terminal, cli: nil, app: "iTerm"))
        tools.append(detectTool(id: "ghostty", name: "Ghostty", category: .terminal, cli: nil, app: "Ghostty"))
        tools.append(detectTool(id: "warp", name: "Warp", category: .terminal, cli: nil, app: "Warp"))
        
        // AI tools
        tools.append(detectAITool(id: "claude", name: "Claude Code", cli: "claude"))
        tools.append(detectAITool(id: "codex", name: "Codex", cli: "codex"))
        
        // Other
        tools.append(DetectedTool(id: "finder", name: "Finder", category: .other, available: true, hasCli: false, cliCommand: nil, appName: "Finder", auth: nil))
        tools.append(detectTool(id: "github-desktop", name: "GitHub Desktop", category: .other, cli: nil, app: "GitHub Desktop"))
        
        // Filter to available only and sort by usage
        availableTools = tools
            .filter { $0.available }
            .sorted { a, b in
                let aTime = toolUsage[a.id]?.timeIntervalSince1970 ?? 0
                let bTime = toolUsage[b.id]?.timeIntervalSince1970 ?? 0
                if aTime > 0 && bTime == 0 { return true }
                if aTime == 0 && bTime > 0 { return false }
                if aTime > 0 && bTime > 0 { return aTime > bTime }
                return false
            }
        
        lastDetection = Date()
    }
    
    func recordUsage(_ toolId: String) {
        toolUsage[toolId] = Date()
        saveUsage()
        
        // Re-sort tools
        availableTools.sort { a, b in
            let aTime = toolUsage[a.id]?.timeIntervalSince1970 ?? 0
            let bTime = toolUsage[b.id]?.timeIntervalSince1970 ?? 0
            if aTime > 0 && bTime == 0 { return true }
            if aTime == 0 && bTime > 0 { return false }
            if aTime > 0 && bTime > 0 { return aTime > bTime }
            return false
        }
    }
    
    private func detectTool(id: String, name: String, category: ToolCategory, cli: String?, app: String?) -> DetectedTool {
        var hasCli = false
        var available = false
        
        if let cli = cli, hasCommand(cli) {
            hasCli = true
            available = true
        }
        
        if let app = app, hasApp(app) {
            available = true
        }
        
        return DetectedTool(
            id: id,
            name: name,
            category: category,
            available: available,
            hasCli: hasCli,
            cliCommand: cli,
            appName: app,
            auth: nil
        )
    }
    
    private func detectAITool(id: String, name: String, cli: String) -> DetectedTool {
        let hasCli = hasCommand(cli)
        var auth: ToolAuth?
        
        if hasCli {
            auth = getAIToolAuth(id: id, cli: cli)
        }
        
        return DetectedTool(
            id: id,
            name: name,
            category: .ai,
            available: hasCli,
            hasCli: hasCli,
            cliCommand: cli,
            appName: nil,
            auth: auth
        )
    }
    
    private func hasCommand(_ cmd: String) -> Bool {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/which")
        process.arguments = [cmd]
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        
        do {
            try process.run()
            process.waitUntilExit()
            return process.terminationStatus == 0
        } catch {
            return false
        }
    }
    
    private func hasApp(_ name: String) -> Bool {
        FileManager.default.fileExists(atPath: "/Applications/\(name).app")
    }
    
    private func getAIToolAuth(id: String, cli: String) -> ToolAuth? {
        // Simplified auth check - in production you'd parse the actual output
        if id == "claude" {
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
            process.arguments = [cli, "auth", "status"]
            
            let pipe = Pipe()
            process.standardOutput = pipe
            process.standardError = FileHandle.nullDevice
            
            do {
                try process.run()
                process.waitUntilExit()
                
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    return ToolAuth(
                        loggedIn: json["loggedIn"] as? Bool ?? false,
                        email: json["email"] as? String,
                        plan: json["subscriptionType"] as? String
                    )
                }
            } catch {}
        }
        
        return ToolAuth(loggedIn: false, email: nil, plan: nil)
    }
    
    private func loadUsage() {
        guard let data = try? Data(contentsOf: usageFileURL),
              let dict = try? JSONDecoder().decode([String: Double].self, from: data) else {
            return
        }
        
        toolUsage = dict.mapValues { Date(timeIntervalSince1970: $0) }
    }
    
    private func saveUsage() {
        let dict = toolUsage.mapValues { $0.timeIntervalSince1970 }
        if let data = try? JSONEncoder().encode(dict) {
            try? data.write(to: usageFileURL)
        }
    }
}
