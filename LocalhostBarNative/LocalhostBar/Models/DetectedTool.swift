import Foundation

enum ToolCategory: CaseIterable {
    case editor
    case terminal
    case ai
    case other
}

/// An app or CLI a project can be opened in.
struct DetectedTool: Identifiable, Equatable {
    let id: String
    let name: String
    let category: ToolCategory
    /// Set for desktop apps — opened with the project folder.
    let appURL: URL?
    /// Set for CLI-only tools (Claude Code, Codex) — run in Terminal from the project folder.
    let cliCommand: String?
}
