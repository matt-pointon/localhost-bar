# Global Tool Detection

## Goal

Replace per-project tool detection with global tool availability detection. Instead of showing which AI tools have config files in each project, detect all installed/authenticated tools once and show them as "Open in X" options on every service — like Conductor's dropdown.

## Current state

Two separate systems:
- **`tool-checker.ts`** — checks if CLIs exist via `which` (vscode, cursor, windsurf, claude, iterm2). Used to show/hide QuickActionsMenu items.
- **`tool-detector.ts`** — per-project filesystem markers (`.cursor/`, `.claude/`, etc.) + Cursor/Windsurf `storage.json` window state. Used for ToolIcons per service row.

## Proposed changes

### 1. New `tool-registry.ts` (replaces `tool-checker.ts`)

Single source of truth for all globally-available tools. Detected once at startup, cached, refreshed every 60s.

**Detection methods per tool:**

| Tool | Detection | Auth check |
|------|-----------|------------|
| Finder | Always available | — |
| VS Code | `which code` | — |
| Cursor | `which cursor` OR `/Applications/Cursor.app` | — |
| Windsurf | `which windsurf` OR `/Applications/Windsurf.app` | — |
| Zed | `which zed` OR `/Applications/Zed.app` | — |
| Xcode | `/Applications/Xcode.app` | — |
| Terminal | Always available | — |
| iTerm2 | `/Applications/iTerm.app` | — |
| Ghostty | `/Applications/Ghostty.app` | — |
| Warp | `/Applications/Warp.app` | — |
| Claude Code | `which claude` → `claude auth status` (JSON) | email, plan, org |
| Codex | `which codex` → `codex login status` (exit code) | logged in y/n |
| GitHub Desktop | `/Applications/GitHub Desktop.app` | — |

**Interface:**

```ts
interface DetectedTool {
  id: string            // 'vscode', 'cursor', 'claude', etc.
  name: string          // 'VS Code', 'Cursor', 'Claude Code'
  category: 'editor' | 'terminal' | 'ai' | 'other'
  available: boolean
  auth?: {              // only for tools with CLI auth
    loggedIn: boolean
    email?: string
    plan?: string       // e.g. 'pro' for Claude
  }
}
```

### 2. Refactor QuickActionsMenu

- Pull actions from the global tool registry instead of the current `InstalledTools` boolean bag
- Group by category with separators: Editors → Terminals → AI Tools → Other
- Show auth badge/status for Claude/Codex (e.g. "Claude Code ✓" or email)

### 3. Simplify per-project detection

- **Remove** `tool-detector.ts` (filesystem markers + storage.json parsing)
- **Remove** `ToolIcons` from ServiceRow — no more per-project AI tool icons
- The quick actions menu becomes the single place to interact with tools

### 4. IPC changes

- Replace `app:get-installed-tools` handler with `app:get-available-tools` returning `DetectedTool[]`
- Add `app:open-with` cases for new tools (Zed, Ghostty, Warp, Xcode, GitHub Desktop)

### 5. Open-with implementations

| Tool | Command |
|------|---------|
| Zed | `zed <cwd>` |
| Xcode | `open -a Xcode <cwd>` |
| Ghostty | AppleScript or `open -a Ghostty` |
| Warp | `open -a Warp` (doesn't support cwd arg well) |
| GitHub Desktop | `github <cwd>` or `open -a "GitHub Desktop"` |

## What we gain

- Simpler codebase: one detection system instead of two
- No per-project filesystem scanning for tool markers (faster scans)
- More tools available to the user (terminals, more editors)
- Auth status for AI tools (know if Claude/Codex are ready to use)
- Matches the Conductor UX pattern users already know

## What we lose

- Per-project "this project uses Claude/Cursor" signal — but honestly that was low-value since users know which tools they're using

## Implementation order

1. Create `tool-registry.ts` with all detection logic
2. Update IPC handler + preload types
3. Refactor QuickActionsMenu to use new registry
4. Remove `tool-detector.ts`, `ToolIcons` from ServiceRow
5. Add open-with handlers for new tools
6. Test all detected tools
