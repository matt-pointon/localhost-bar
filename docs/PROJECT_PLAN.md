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

## Current state

The app has a working prototype with most Phase 1–3 features shipped. It
auto-discovers running dev servers via port scanning (no config file needed),
detects AI tools, shows git status, and has deploy integration.

## Phases

### Phase 1 — Working prototype [COMPLETE]

- [x] macOS tray app scaffold (Electron, tray icon, frameless floating panel)
- [x] Auto-discovery via `lsof` port scanning (no config file — pure auto-discovery)
- [x] Localhost port scanning (`lsof`, range 1024–9999)
- [x] Live/offline status per project (green dot + offline section with restart/dismiss)
- [x] Port number display per project
- [x] Click project → open in browser
- [x] AI tool origin detection via marker files:
      - `CLAUDE.md` or `.claude/` → Claude Code
      - `.cursor/` or Cursor `storage.json` → Cursor
      - `.windsurf/` or Windsurf `storage.json` → Windsurf
      - `.github/copilot-instructions.md` → Copilot
      - `.aider*` → Aider
      - `.codex/` → Codex
- [x] Tool badges shown per project in menu
- [x] Quick actions: open in Finder / VS Code / Cursor / Windsurf / Terminal / Claude Code
      (only shown for installed tools, detected via `which`)
- [x] Dev command allowlist filtering (node, bun, deno, python, ruby, php, java, go, vite, etc.)

**Not built (changed from original plan):**
- ~~Project list from `~/.vibetoolbar/projects.json`~~ → replaced by auto-discovery
- ~~Add project via folder picker~~ → not needed with auto-discovery
- Bolt, Lovable, v0 detection → not yet implemented

### Phase 2 — Make it sticky [MOSTLY COMPLETE]

- [x] Git status per project (branch, change count, last commit message)
- [x] Git status cached per-cwd for 30 seconds
- [ ] Tech stack detection from `package.json` / `pyproject.toml` / `Cargo.toml`
      - Partial: deploy-focused detection exists (Next.js, Vite/React, Python)
      - Missing: general stack tags displayed per project (top 3: framework, db, UI)
- [ ] Stack tags displayed per project
- [ ] Port conflict detection and warning at top of menu
      - Current: IPv4/IPv6 deduplication only, no explicit conflict warning
- [ ] Project tasks/todos — accordion under each service with checklist, animated additions, written to AI config files (pivoted from notes v1 — see `docs/vibestatus-notes.md`)

### Phase 3 — Power features [MOSTLY COMPLETE]

- [x] Deploy preview integration (Vercel / Railway / Netlify CLI)
      - [x] Auto-select provider based on detected stack
      - [x] Stream deploy output
      - [x] Store and display last deployed URL + timestamp per project
      - [x] "Copy last deploy URL" action
- [ ] `PROJECT_PLAN.md` generation prompt (for users to run on their own projects)

## Architecture notes

- **Tray + panel**: `Tray` toggles a 340×480 frameless `BrowserWindow` with vibrancy,
  `alwaysOnTop`, auto-hides on blur. Single instance enforced; dock icon hidden.
- **Auto-discovery**: no config file. All state derived from live port scanning,
  filesystem markers, and editor storage.json.
- All external commands (`lsof`, `git`, `vercel`, etc.) run via `child_process`
  with timeouts to avoid blocking.
- Git status and port scan results cached per project for 30s.
- No credentials ever stored or passed through the app — deploy CLIs handle auth.
- Deploy history persisted in Electron `userData` (`deploys.json`).
- 3-second polling interval for port scanning (renderer-side via `useServices` hook).
- 200ms exit animation for services transitioning between running ↔ offline.
- Portal-based dropdowns (`QuickActionsMenu`) to avoid overflow clipping.
- Retina tray icon: `build/icon.png` (16×16) + `build/icon@2x.png` (32×32).

## Remaining work

### Priority items

1. **Port conflict detection** — warn when multiple services bind the same port
2. **Stack tags** — surface top 3 tech tags per project (framework, db, UI lib)
   from `package.json` / `pyproject.toml` / `Cargo.toml`
3. **Project tasks/todos** — per-project task list in an accordion under each service row, written to AI config files (pivoted from simple notes — see `docs/vibestatus-notes.md`)

### Nice to have

- Bolt / Lovable / v0 tool detection
- Broader tech stack detection beyond deploy-focused parsing
- `PROJECT_PLAN.md` generation prompt for users' own projects

## Out of scope

- Localhost tunneling (cloudflared / ngrok) — ToS and free tier issues
- Windows / Linux support — macOS only for v1
- Custom relay or tunnel infrastructure
- In-app AI chat or prompt history
