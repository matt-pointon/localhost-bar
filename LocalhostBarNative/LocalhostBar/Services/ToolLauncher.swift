import AppKit

enum ToolLauncher {
    static func open(_ tool: DetectedTool, at cwd: String) {
        let folder = URL(fileURLWithPath: cwd, isDirectory: true)
        if let app = tool.appURL {
            // Editors and terminals all accept a folder: a new window rooted there.
            NSWorkspace.shared.open([folder], withApplicationAt: app, configuration: NSWorkspace.OpenConfiguration())
        } else if let command = tool.cliCommand {
            runInTerminal(command, cwd: cwd)
        }
    }

    static func revealInFinder(_ cwd: String) {
        NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: cwd)
    }

    /// Opens a Terminal window in `cwd` running `command`, then leaves a shell there.
    ///
    /// Uses a `.command` file instead of AppleScript: no Automation permission prompt, and
    /// Terminal's own login shell supplies the PATH (nvm, volta, …) the CLI needs.
    private static func runInTerminal(_ command: String, cwd: String) {
        let quoted = "'" + cwd.replacingOccurrences(of: "'", with: "'\\''") + "'"
        let script = """
        #!/bin/zsh
        cd \(quoted) || exit 1
        clear
        \(command)
        exec "${SHELL:-/bin/zsh}" -l

        """
        let file = FileManager.default.temporaryDirectory
            .appendingPathComponent("localhost-bar-\(command)-\(UUID().uuidString.prefix(8)).command")
        do {
            try script.write(to: file, atomically: true, encoding: .utf8)
            try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: file.path)
        } catch {
            return
        }
        guard let terminal = NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.apple.Terminal") else { return }
        NSWorkspace.shared.open([file], withApplicationAt: terminal, configuration: NSWorkspace.OpenConfiguration())
    }
}
