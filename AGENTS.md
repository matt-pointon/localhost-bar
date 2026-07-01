# Localhost Bar

A macOS-style menu-bar Electron app (Electron + electron-vite + React 19 + Tailwind v4) that scans localhost ports via `lsof` every 3s and shows running dev servers with git status, quick actions, and stats. See `.claude/CLAUDE.md` for the full architecture/feature overview.

## Cursor Cloud specific instructions

This is a single Electron desktop app — there is no backend/database/web server. Standard scripts live in `package.json` (`dev`, `build`, `preview`, `pack`, `dist`); dependencies install with `npm install`.

### Running & testing in this Linux VM
- Although the app targets macOS, it runs on this Linux VM for development/testing. A GUI X display is already available at `DISPLAY=:1` (Xfwm4 is running as the compositor), so run the app with `DISPLAY=:1 npm run dev`.
- `lsof`, `git`, and `ps` are present and produce output the port scanner can parse, so the core port-scanning feature works. For the panel to display anything, a dev server must be listening on a port in the range **1024–9999** (ports outside that range are filtered out). Quick smoke test: `node -e "require('http').createServer((q,r)=>r.end('hi')).listen(3000)"` — it should appear in the panel within ~3s.
- Startup logs contain `Failed to connect to the bus` (DBus) and GPU/`viz_main_impl` errors — these are **non-fatal** on headless-ish Linux and can be ignored.
- The tray icon and panel windows do get created on Linux, but the panel is `show:false`, `transparent:true`, and auto-hides on `blur`; it only opens on a tray click. To reliably screenshot the UI during testing, temporarily set `show:true` + `transparent:false` and comment out the `blur` handler in `src/main/panel.ts`, then revert before committing. Capture with `ffmpeg -f x11grab -i :1 ...`.

### Gotchas
- **Do not run `tsc -b` / `tsc --build`.** The tsconfigs do not set `noEmit`, so a build emits `.js`/`.jsx`/`.d.ts` files throughout `src/`. Those emitted `.js` files then shadow the `.ts` sources in the electron-vite bundle (e.g. `./panel` resolves to a stale `panel.js`), silently running old code. There is no `typecheck` script; type-checking is not part of the normal flow. If stray compiled files appear in `src/`, remove them (they are untracked) before building/running.
- No linter (ESLint/Prettier) and no test framework (Jest/Vitest/Playwright) are configured — there are no `lint`/`test` scripts. "Testing" means running `npm run dev` and observing the panel populate from real localhost servers.
