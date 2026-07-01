# Localhost Bar — Project Plan

## What this is

A macOS menu bar app for vibecoders. It surfaces locally-running dev projects,
shows which AI tool originated each one (Claude Code, Cursor, Windsurf, etc.),
and provides one-click actions to jump back into a project. Targeted at
developers who run multiple AI-assisted projects simultaneously and lose
context switching between them.

## Tech stack

- Electron + electron-vite (macOS menu bar, tray + frameless floating panel)
- React 19 + TypeScript
- Tailwind v4
- Port scanning: `lsof` via `child_process`
- Git status: `git` CLI via `child_process`
- Deploy: Vercel / Railway / Netlify CLIs via `child_process`
- Auto-update: `electron-updater` (GitHub releases)

## Current state

The app has a working prototype with Phases 1–4 largely complete. It
auto-discovers running dev servers via port scanning (no config file needed),
shows git status and stack tags on rows, detects AI tool origins and active
agents, has deploy integration, and notifications.

## Phases

### Phase 1 — Working prototype [COMPLETE]

- [x] macOS tray app scaffold (Electron, tray icon, frameless floating panel)
- [x] Auto-discovery via `lsof` port scanning (no config file — pure auto-discovery)
- [x] Localhost port scanning (`lsof`, range 1024–9999)
- [x] Live/offline status per project (green dot + offline section with restart/dismiss)
- [x] Port number display per project
- [x] Click project → open in browser
- [x] AI tool origin detection via marker files (see `tool-detector.ts`)
- [x] Tool badges shown per project in menu
- [x] Quick actions: open in Finder / editors / terminals / Claude Code / Codex
- [x] Dev command allowlist filtering

### Phase 2 — Make it sticky [COMPLETE]

- [x] Git status per project (branch, change count) — shown on service rows
- [x] Git status cached per-cwd for 30 seconds
- [x] Tech stack detection from `package.json` / `pyproject.toml` / `Cargo.toml`
- [x] Stack tags displayed per project (top 3: framework, db, UI)
- [x] Port conflict detection and warning banner
- [x] Project tasks/todos — accordion under each service, syncs to AI config files

### Phase 3 — Power features [MOSTLY COMPLETE]

- [x] Deploy preview integration (Vercel / Railway / Netlify CLI)
- [ ] `PROJECT_PLAN.md` generation prompt (for users to run on their own projects)

### Phase 4 — Vibe coder experience [COMPLETE]

- [x] Dark theme (CSS variables, dark panel by default)
- [x] Quick URL copy — one-click `http://localhost:<port>` from each service row
- [x] "Who's coding?" — active AI agent detection per project (`agent-detector.ts`)
- [x] Notifications — service lifecycle alerts with bell toggle
- [x] Daily stats bar + AI token stats
- [x] Global tool registry (`tool-registry.ts`) + per-project origin badges (`tool-detector.ts`)
- [x] GitHub quick actions — commit, pull, create PR
- [x] Search/filter projects
- [x] Pin and rename projects

## Distribution

- Code signing entitlements in `build/entitlements.mac.plist`
- Auto-update via `electron-updater` and GitHub releases
- Free — all features included for now

## Architecture notes

- **Tray + panel**: `Tray` toggles a 560×290 frameless `BrowserWindow`, auto-hides on blur
- **Scan result**: `{ services, portConflicts }` from `scanPorts()`
- **Service fields**: git, stackTags, originTools, activeAgents, pinned, resources
- **Settings**: `settings.json` in userData — pins, renames, notifications
- **Tasks**: `tasks.json` in userData, synced to AI config files via `tasks/config-writer.ts`
- **Notifications**: `scan-tracker.ts` diffs consecutive scans, fires Electron `Notification`
- 3-second polling interval for port scanning (renderer-side via `useServices` hook)

## Remaining work

### Nice to have

- Bolt / Lovable / v0 marker detection (partial — bolt/lovable markers in `tool-detector.ts`)
- Health checks (HTTP ping localhost)
- Launch at login settings UI
- Monorepo grouping
- Branded share card templates
- `PROJECT_PLAN.md` generation prompt
- Setapp distribution

## Out of scope

- Localhost tunneling (cloudflared / ngrok)
- Windows / Linux support — macOS only for v1
- In-app AI chat or prompt history
