# Phase 4 — Vibe Coder Experience

Four features to make the app feel polished and social.

## 1. Dark Mode (Default)

Switch the app to a dark theme by default, matching what vibe coders expect from dev tools.

### Approach

The app already uses CSS variables (`--color-*`) in a `@theme inline` block in `index.css`. All components reference these variables via inline styles.

**Changes:**

1. **`src/renderer/src/index.css`** — Replace the light theme values with dark equivalents:
   ```
   --color-background: rgba(30, 30, 30, 0.92);
   --color-foreground: oklch(0.93 0 0);
   --color-border: oklch(0.28 0 0);
   --color-muted: oklch(0.18 0 0);
   --color-muted-foreground: oklch(0.60 0 0);
   --color-accent: oklch(0.22 0 0);
   --color-accent-foreground: oklch(0.93 0 0);
   ```

2. **Hardcoded colors to fix** — Several components use hardcoded rgba/hex values that assume a light background:
   - `QuickActionsMenu.tsx` — menu background `rgba(252,252,252,0.96)` → use CSS var
   - `ServiceRow.tsx` — `rgba(0,0,0,0.06)` hover overlays → use CSS var
   - `OfflineRow.tsx` — same rgba overlays
   - `App.tsx` — box-shadow assumes light background

3. **No theme toggle needed for v1** — dark by default, no light mode switch. Keeps scope small.

### Files to modify
| File | Change |
|------|--------|
| `src/renderer/src/index.css` | Dark theme values in @theme block |
| `src/renderer/src/components/QuickActionsMenu.tsx` | Replace hardcoded menu bg |
| `src/renderer/src/components/ServiceRow.tsx` | Replace hardcoded rgba overlays |
| `src/renderer/src/components/OfflineRow.tsx` | Replace hardcoded rgba overlays |
| `src/renderer/src/App.tsx` | Update box-shadow for dark bg |

---

## 2. "Who's Coding?" — Active AI Agent Indicator

Show which AI agents are actively running in each project, not just which tools are installed.

### Detection methods

| Agent | Detection |
|-------|-----------|
| Claude Code | `pgrep -f "claude"` with cwd matching, or check for `.claude/` lock files |
| Cursor | Cursor's `storage.json` windowsState lists open folders — cross-reference with service cwds |
| Windsurf | Same as Cursor — Windsurf `storage.json` windowsState |
| Codex | `pgrep -f "codex"` with cwd matching |
| GitHub Copilot | Active if VS Code/Cursor is open on the project (inferred from editor detection) |
| Aider | `pgrep -f "aider"` with cwd matching |

### Approach

1. **`src/main/port-scanner/agent-detector.ts`** (new) — `getActiveAgents(cwd: string): string[]`
   - Run `pgrep`/`ps` to find AI agent processes
   - Match their cwd to the project's cwd
   - Check editor storage.json for open projects
   - Cache for 10s (agents don't change often)

2. **Extend `ServiceInfo`** — add `activeAgents: string[]` field

3. **`src/renderer/src/components/ServiceRow.tsx`** — show small agent avatars/icons inline next to the service name. Subtle, like "Claude + Cursor working here" via tiny pill badges.

### UX

Small colored dots or mini icons next to the service name: `My App :3000 ● Claude ● Cursor`

Only shown when agents are actively detected. When nothing is active, nothing shows — no empty state clutter.

### Files to create/modify
| File | Change |
|------|--------|
| `src/main/port-scanner/agent-detector.ts` | New — process-based AI agent detection |
| `src/main/port-scanner/index.ts` | Call agent detector, add to ServiceInfo |
| `src/renderer/src/components/ServiceRow.tsx` | Show active agent indicators |

---

## 3. Quick URL Copy

One-click copy of `localhost:<port>` to clipboard from each service row.

### Approach

Add a small copy icon button in each `ServiceRow`, next to the port number. On click:
1. Copy `http://localhost:<port>` to clipboard via `navigator.clipboard.writeText()`
2. Brief visual feedback — icon changes to a checkmark for 1s

No IPC needed — `navigator.clipboard` works in the renderer.

### UX

The copy button sits inline with the port display, only visible on row hover to keep the UI clean. After clicking, the icon briefly flashes to a checkmark.

### Files to modify
| File | Change |
|------|--------|
| `src/renderer/src/components/ServiceRow.tsx` | Add copy button next to port |

---

## 4. Notifications — Service Lifecycle Alerts

Optional macOS native notifications when services start, crash, or come back online.

### Events to notify on

| Event | Notification |
|-------|-------------|
| Service crashes | "MyApp on :3000 went offline" |
| Service comes online | "MyApp is running on :3000" |
| Port conflict | "Port 3000 conflict: MyApp vs OtherApp" |

### Approach

1. **`src/main/notifications.ts`** (new) — thin wrapper around Electron's `Notification` API
   - `notifyServiceOffline(name, port)`
   - `notifyServiceOnline(name, port)`
   - Clicking the notification could open the browser or focus the panel

2. **Trigger from `ipc-handlers.ts`** or from the main process scan loop — when the diff between consecutive scans shows a service appearing/disappearing, fire the notification.

3. **Preference persistence** — store `notificationsEnabled: boolean` in `~/.localhost-bar/settings.json`. Default: on. Add a toggle in the Header (bell icon).

### UX

- Notifications are on by default
- Small bell icon in the header toggles them on/off
- Notifications are non-intrusive — standard macOS notification center style
- No notification spam: only fire on state transitions, not on every poll

### Files to create/modify
| File | Change |
|------|--------|
| `src/main/notifications.ts` | New — Electron Notification wrapper |
| `src/main/ipc-handlers.ts` | Add notification triggers on scan diffs, settings handler |
| `src/renderer/src/components/Header.tsx` | Bell icon toggle |
| `src/preload/index.ts` | Expose notification toggle |

---

## Implementation order

1. **Dark mode** — smallest scope, biggest visual impact, touches every component
2. **Quick URL copy** — single component change, instant utility win
3. **Who's coding** — new detection system + UI, moderate scope
4. **Notifications** — new system + preference management, largest scope
