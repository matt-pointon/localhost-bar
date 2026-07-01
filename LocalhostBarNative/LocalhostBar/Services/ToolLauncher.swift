import AppKit
import Foundation

enum ToolLauncher {
    static func open(tool: DetectedTool, at cwd: String) {
        switch tool.category {
        case .editor:
            openEditor(tool: tool, at: cwd)
        case .terminal:
            openTerminal(tool: tool, at: cwd)
        case .ai:
            openAITool(tool: tool, at: cwd)
        case .other:
            openOther(tool: tool, at: cwd)
        }
    }
    
    private static func openEditor(tool: DetectedTool, at cwd: String) {
        if tool.hasCli, let cli = tool.cliCommand {
            // Use CLI to open in the directory
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
            process.arguments = [cli, cwd]
            process.standardOutput = FileHandle.nullDevice
            process.standardError = FileHandle.nullDevice
            try? process.run()
        } else if let appName = tool.appName {
            // Use open -a
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/open")
            process.arguments = ["-a", appName, cwd]
            process.standardOutput = FileHandle.nullDevice
            process.standardError = FileHandle.nullDevice
            try? process.run()
        }
    }
    
    private static func openTerminal(tool: DetectedTool, at cwd: String) {
        let safeCwd = cwd.replacingOccurrences(of: "'", with: "'\\''")
        
        switch tool.id {
        case "iterm2":
            let script = """
            tell application "iTerm"
                activate
                create window with default profile command "cd '\(safeCwd)'"
            end tell
            """
            runAppleScript(script)
            
        case "terminal":
            let script = """
            tell application "Terminal"
                do script "cd '\(safeCwd)'"
                activate
            end tell
            """
            runAppleScript(script)
            
        case "ghostty":
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/open")
            process.arguments = ["-na", "Ghostty.app", "--args", "--working-directory=\(cwd)"]
            process.standardOutput = FileHandle.nullDevice
            process.standardError = FileHandle.nullDevice
            try? process.run()
            
        case "warp":
            if let encoded = cwd.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
               let url = URL(string: "warp://action/new_tab?path=\(encoded)") {
                NSWorkspace.shared.open(url)
            }
            
        default:
            break
        }
    }
    
    private static func openAITool(tool: DetectedTool, at cwd: String) {
        guard let cli = tool.cliCommand else { return }
        
        let safeCwd = cwd.replacingOccurrences(of: "'", with: "'\\''")
        
        // Check if iTerm2 is available, otherwise use Terminal
        let useITerm = FileManager.default.fileExists(atPath: "/Applications/iTerm.app")
        
        let script: String
        if useITerm {
            script = """
            tell application "iTerm"
                activate
                create window with default profile command "cd '\(safeCwd)' && \(cli)"
            end tell
            """
        } else {
            script = """
            tell application "Terminal"
                do script "cd '\(safeCwd)' && \(cli)"
                activate
            end tell
            """
        }
        
        runAppleScript(script)
    }
    
    private static func openOther(tool: DetectedTool, at cwd: String) {
        switch tool.id {
        case "finder":
            NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: cwd)
            
        default:
            if let appName = tool.appName {
                let process = Process()
                process.executableURL = URL(fileURLWithPath: "/usr/bin/open")
                process.arguments = ["-a", appName, cwd]
                process.standardOutput = FileHandle.nullDevice
                process.standardError = FileHandle.nullDevice
                try? process.run()
            }
        }
    }
    
    private static func runAppleScript(_ script: String) {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        process.arguments = ["-e", script]
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        try? process.run()
    }
}
