# Localhost Bar

A macOS menu bar app for designers and vibe coders that shows all running localhost dev servers at a glance — with quick actions to open them, inspect git status, and jump into the project in your editor.

## What it does

- Sits in the macOS menu bar, opens a panel on click
- Scans for localhost ports every 3 seconds using `lsof`
- Only shows dev runtimes (node, bun, deno, python, ruby, etc.) — filters out system services like Spotify, Framer
- Shows service name, port, command, git branch + changes + last commit
- Detects which AI tools are active in the project (Cursor, Claude, Windsurf, Copilot, Codex)
- Tracks services that go offline and shows them in an "Offline" section with restart/dismiss
- Quick actions per service: open in browser, open in Finder, open in editor (VS Code / Cursor / Windsurf), open terminal, open Claude Code

## Stack

- Electron + electron-vite
- React 19 + TypeScript
- Tailwind v4
- `lsof` for port scanning (macOS only)

## Project structure

```
src/
  main/
    index.ts                        # Electron app entry, creates tray + panel
    tray.ts                         # Menu bar tray icon
    panel.ts                        # Floating panel window
    ipc-handlers.ts                 # IPC: kill, open-folder, open-with, restart-service, get-installed-tools
    tool-checker.ts                 # Checks which CLIs are installed (code, cursor, windsurf, claude, iterm2)
    port-scanner/
      index.ts                      # Main scanPorts() — orchestrates lsof, name, tools, git
      lsof-parser.ts                # Parses lsof output, filters to DEV_COMMAND_ALLOWLIST
      name-inferrer.ts              # Infers human-readable name from command/cwd
      tool-detector.ts              # Detects AI tools from filesystem markers + editor storage.json
      git-status.ts                 # Git branch/changes/last commit with 30s per-cwd cache
  preload/
    index.ts                        # contextBridge — exposes ElectronAPI to renderer
  renderer/
    src/
      App.tsx                       # Root: running services + offline section
      hooks/useServices.ts          # 3s polling, service state, offline tracking, animations
      components/
        Header.tsx                  # Title bar with refresh + quit
        ServiceList.tsx             # List of running ServiceRows
        ServiceRow.tsx              # One row: status dot, name, command, git, tool icons, actions
        OfflineRow.tsx              # Offline row with restart / open-folder / dismiss
        QuickActionsMenu.tsx        # ⋯ dropdown portal: Finder, editors, terminal, Claude Code
        ToolIcons.tsx               # SVG icons for Cursor, Claude, Windsurf, Copilot, Codex, Aider
        EmptyState.tsx              # Shown when no services running
```

## Key decisions

- **Allowlist not blocklist** for port filtering — only show known dev runtimes
- **Dual tool detection** — filesystem markers (`.cursor/`, `.claude/`) AND Cursor's `storage.json` windowsState (catches projects with no config files)
- **Synchronous ref mirror** (`servicesRef`) in useServices — avoids React async state timing issues during 3s poll intervals
- **200ms exit animation** — items stay in source section briefly before moving to destination (running ↔ offline)
- **Portal dropdowns** — QuickActionsMenu renders into `document.body` to avoid overflow clipping
- **Retina tray icon** — `build/icon.png` (16×16) + `build/icon@2x.png` (32×32) with `setTemplateImage`

## Plans & documentation

- Project plans and documentation go in `/docs/` as markdown `.md` files
- When creating or updating a plan, save it to `docs/` (e.g. `docs/plan.md`, `docs/feature-xyz.md`)
- Full project plan: `docs/PROJECT_PLAN.md`

## Project status

Phase 1 (working prototype) and Phase 3 (deploy integration) are complete.
Phase 2 is mostly done — remaining work:

- [ ] Port conflict detection and warning
- [ ] Stack tags per project (top 3: framework, db, UI) from package.json/pyproject.toml/Cargo.toml
- [ ] Project tasks/todos (pivoted from notes — accordion UI under each service, animated, writes to AI config files)

Nice to have:
- [ ] Bolt / Lovable / v0 tool detection
- [ ] Broader tech stack detection beyond deploy-focused parsing

## Change log

- **2026-04-01** — Created project plan (`docs/PROJECT_PLAN.md`). Audited codebase against original plan: Phase 1 complete (auto-discovery replaced config file approach), Phase 2 mostly done (git status works, stack tags/port conflicts/notes outstanding), Phase 3 deploy integration complete (Vercel/Railway/Netlify with URL history).
- **2026-04-01** — Built notes v1 feature (single note per project, written to AI config files with fenced markers). User pivoted to tasks/todos instead: accordion UI under each service row, checklist format, animated additions, still writes to AI config files. Notes v1 code exists but needs refactoring into tasks. See `docs/vibestatus-notes.md` for full plan.

## Running

```bash
npm run dev     # dev mode with hot reload
npm run build   # production build
npm run dist    # build + package as .dmg
```
