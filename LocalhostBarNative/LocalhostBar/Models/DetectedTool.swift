import Foundation

enum ToolCategory: String, CaseIterable {
    case editor
    case terminal
    case ai
    case other
}

struct ToolAuth: Equatable {
    let loggedIn: Bool
    let email: String?
    let plan: String?
}

struct DetectedTool: Identifiable, Equatable {
    let id: String
    let name: String
    let category: ToolCategory
    let available: Bool
    let hasCli: Bool
    let cliCommand: String?
    let appName: String?
    let auth: ToolAuth?
    
    var icon: String {
        switch id {
        case "vscode": return "chevron.left.forwardslash.chevron.right"
        case "cursor": return "cursorarrow.rays"
        case "windsurf": return "wind"
        case "zed": return "bolt.fill"
        case "xcode": return "hammer.fill"
        case "terminal": return "terminal.fill"
        case "iterm2": return "terminal.fill"
        case "ghostty": return "terminal.fill"
        case "warp": return "terminal.fill"
        case "claude": return "brain.head.profile"
        case "codex": return "brain.head.profile"
        case "finder": return "folder.fill"
        case "github-desktop": return "arrow.triangle.branch"
        default: return "app.fill"
        }
    }
}
