import AppKit
import Combine

/// Editors, terminals and AI CLIs installed on this Mac, most recently used first.
@MainActor
final class ToolRegistry: ObservableObject {
    @Published private(set) var tools: [DetectedTool] = []

    private var lastUsed: [String: Double] = [:]
    private let usageKey = "toolLastUsed"

    private struct Candidate {
        let id: String
        let name: String
        let category: ToolCategory
        var bundleId: String? = nil
        var appName: String? = nil
        var cli: String? = nil
    }

    private let candidates: [Candidate] = [
        Candidate(id: "cursor", name: "Cursor", category: .editor, bundleId: "com.todesktop.230313mzl4w4u92", appName: "Cursor"),
        Candidate(id: "vscode", name: "VS Code", category: .editor, bundleId: "com.microsoft.VSCode", appName: "Visual Studio Code"),
        Candidate(id: "windsurf", name: "Windsurf", category: .editor, bundleId: "com.exafunction.windsurf", appName: "Windsurf"),
        Candidate(id: "zed", name: "Zed", category: .editor, bundleId: "dev.zed.Zed", appName: "Zed"),
        Candidate(id: "xcode", name: "Xcode", category: .editor, bundleId: "com.apple.dt.Xcode", appName: "Xcode"),
        Candidate(id: "terminal", name: "Terminal", category: .terminal, bundleId: "com.apple.Terminal", appName: "Terminal"),
        Candidate(id: "iterm2", name: "iTerm", category: .terminal, bundleId: "com.googlecode.iterm2", appName: "iTerm"),
        Candidate(id: "ghostty", name: "Ghostty", category: .terminal, bundleId: "com.mitchellh.ghostty", appName: "Ghostty"),
        Candidate(id: "warp", name: "Warp", category: .terminal, bundleId: "dev.warp.Warp-Stable", appName: "Warp"),
        Candidate(id: "claude", name: "Claude Code", category: .ai, cli: "claude"),
        Candidate(id: "codex", name: "Codex", category: .ai, cli: "codex"),
        Candidate(id: "github-desktop", name: "GitHub Desktop", category: .other, bundleId: "com.github.GitHubClient", appName: "GitHub Desktop")
    ]

    init() {
        lastUsed = UserDefaults.standard.dictionary(forKey: usageKey) as? [String: Double] ?? [:]
    }

    /// The editor the row's quick action opens: last one used, else the first installed.
    var preferredEditor: DetectedTool? {
        tools.first { $0.category == .editor }
    }

    /// Cheap filesystem lookups only — safe to call every time the panel opens.
    func detect() {
        let detected = candidates.compactMap { candidate -> DetectedTool? in
            if let url = appURL(for: candidate) {
                return DetectedTool(id: candidate.id, name: candidate.name, category: candidate.category, appURL: url, cliCommand: nil)
            }
            if let cli = candidate.cli, Shell.which(cli) != nil {
                return DetectedTool(id: candidate.id, name: candidate.name, category: candidate.category, appURL: nil, cliCommand: cli)
            }
            return nil
        }
        let sorted = sortByUsage(detected)
        if sorted != tools { tools = sorted }
    }

    func open(_ tool: DetectedTool, at cwd: String) {
        ToolLauncher.open(tool, at: cwd)
        lastUsed[tool.id] = Date().timeIntervalSince1970
        UserDefaults.standard.set(lastUsed, forKey: usageKey)
        tools = sortByUsage(tools)
    }

    private func appURL(for candidate: Candidate) -> URL? {
        if let bundleId = candidate.bundleId,
           let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) {
            return url
        }
        guard let name = candidate.appName else { return nil }
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        return ["/Applications", "\(home)/Applications", "/System/Applications/Utilities"]
            .map { URL(fileURLWithPath: "\($0)/\(name).app") }
            .first { FileManager.default.fileExists(atPath: $0.path) }
    }

    /// Stable: never-used tools keep their declared order.
    private func sortByUsage(_ tools: [DetectedTool]) -> [DetectedTool] {
        tools.enumerated().sorted { a, b in
            let ua = lastUsed[a.element.id] ?? 0
            let ub = lastUsed[b.element.id] ?? 0
            return ua != ub ? ua > ub : a.offset < b.offset
        }.map(\.element)
    }
}
