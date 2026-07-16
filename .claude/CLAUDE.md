# Localhost Bar

A macOS menu bar app for designers and vibe coders that shows all running localhost dev servers at a glance — with quick actions to open them, inspect git status, and jump into the project in your editor.

## What it does

- Sits in the macOS menu bar, opens a panel on click
- Scans for localhost ports every 3 seconds using `lsof`
- Only shows dev runtimes (node, bun, deno, python, ruby, etc.) — filters out system services
- Shows service name, port, git branch + changes, stack tags, memory usage
- Per-project AI origin badges (Cursor, Claude, etc.) and active agent indicators ("Who's coding?")
- Recent AI projects/sessions from local Cursor, Claude Code, and Codex data (even when no server is running)
- Port conflict warnings when multiple services share a port
- Project tasks accordion (Pro) — checklist synced to AI config files
- Tracks offline services with restart/dismiss
- Quick actions: open in browser, Finder, editors, terminals, Claude Code, deploy (Pro), git (Pro)
- Daily stats + AI usage heatmap (Pro), share to clipboard (Pro)
- Search/filter, pin, and rename projects
- Notifications for service online/offline/conflict events (toggle in header)

## Stack

- Electron + electron-vite + electron-updater
- React 19 + TypeScript
- Tailwind v4
- `lsof` for port scanning (macOS only)

## Project structure

```
src/
  main/
    index.ts                        # App entry, tray + panel, auto-updater
    tray.ts                         # Menu bar tray icon
    panel.ts                        # Floating panel window (560×290)
    ipc-handlers.ts                 # IPC handlers + Pro gating
    tool-registry.ts                # Global installed-tool detection
    settings.ts                     # Pins, renames, notifications
    notifications.ts                # Electron Notification wrapper
    scan-tracker.ts                 # Service lifecycle diff → notifications
    updater.ts                      # electron-updater
    port-scanner/
      index.ts                      # scanPorts() → { services, portConflicts }
      lsof-parser.ts                # Parses lsof, DEV_COMMAND_ALLOWLIST filter
      name-inferrer.ts              # Human-readable name from command/cwd
      git-status.ts                 # Git branch/changes/last commit (30s cache)
      stack-tags.ts                 # Top 3 stack tags from manifest files
      tool-detector.ts              # Per-project AI origin markers
      agent-detector.ts             # Active AI agents per project
      port-conflicts.ts             # Same-port conflict detection
    tasks/
      store.ts                      # Task CRUD in userData
      config-writer.ts              # Sync tasks to CLAUDE.md, .cursorrules, etc.
    deploy/                         # Vercel / Railway / Netlify integration
    stats/                          # Daily commits/lines/streak
    token-stats/                    # Cursor, Claude Desktop, Claude Code usage
    session-sources/                # Local Cursor/Claude/Codex AI session discovery
  preload/index.ts                  # contextBridge API
  renderer/src/
    App.tsx                         # Panel layout: stats + project list
    hooks/
      useServices.ts                # 3s polling, offline tracking
      useTasks.ts                   # Per-project tasks
      useStats.ts / useTokenStats.ts
      useAiProjects.ts              # Recent AI projects/sessions (30s poll)
    components/
      ServiceList.tsx               # Service rows (git, tags, copy URL, tasks)
      AiProjectList.tsx             # Recent AI projects (no running server required)
      QuickActionsMenu.tsx          # Deploy, git, open-in menu
      StatsBar.tsx                  # Heatmap + share
      ToolIcons.tsx                 # Origin + active agent badges
      TaskList.tsx                  # Accordion checklist
      PortConflictBanner.tsx
      SearchBar.tsx
      OfflineRow.tsx / EmptyState.tsx
```

## Key decisions

- **Allowlist not blocklist** for port filtering — only show known dev runtimes
- **Dual tool detection** — global registry for "Open in" menu + per-project origin markers for badges + process-based active agent detection
- **AI sessions from local files** — Cursor/Claude/Codex have no stable public session APIs; `session-sources/` reads on-disk indexes (SQLite/JSONL) and surfaces a Recent AI section plus per-row activity on running servers
- **Synchronous ref mirror** (`servicesRef`) in useServices — avoids React async state timing issues
- **Portal dropdowns** — QuickActionsMenu renders into `document.body`

## Project status

Phases 1–4 complete. Auto-update infrastructure in place. AI session/project discovery from local Cursor, Claude Code, and Codex data is wired.

Remaining nice-to-have: health checks, launch-at-login UI, monorepo grouping, branded share templates.

## Running

```bash
npm run dev     # dev mode with hot reload
npm run build   # production build
npm run dist    # build + package as .dmg
```
