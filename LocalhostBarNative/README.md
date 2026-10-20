# Localhost Bar (Native macOS)

A native macOS menu bar app that shows running localhost development servers with git status, quick actions, and stats.

Built entirely in **Swift + SwiftUI** for optimal performance, battery life, and deep macOS integration.

## Features

- **Auto-discovery** - Finds dev servers (node, bun, deno, python, ruby, …) listening on ports 1024–9999, every 3 seconds
- **Project names** - The folder you'd type in a terminal (`acme-web`), or `repo/app` inside a monorepo
- **Git status** - Branch and number of changed files per project
- **One-click actions** - Click a row to open it in the browser; hover for "open in your editor" and stop; right-click for every installed editor, terminal and AI CLI (Claude Code, Codex)
- **Stopped servers** - Servers that stop stay listed for a while with "Start again"
- **Activity strip** - Your own commits over the last 30 days across every project that has run
- **Menu bar count** - How many servers are running, without opening the panel
- **Open at Login** - From the ⋯ menu (uses `SMAppService`)
- **Shortcuts** - "How many servers are running", "Stop server on port 3000", …
- **System appearance** - Follows light and dark mode

## Requirements

- macOS 14.0 (Sonoma) or later
- Xcode 15.0 or later (latest-stable is what CI uses)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — the `.xcodeproj` is generated from `project.yml`, not checked in (`brew install xcodegen`)

## Project Structure

```
LocalhostBarNative/
├── LocalhostBar/
│   ├── LocalhostBarApp.swift      # MenuBarExtra entry point; starts scanning at launch
│   ├── ContentView.swift          # The panel: header + ⋯ menu, server list, activity footer
│   ├── LocalhostBar.entitlements  # Intentionally empty — see "Why it isn't sandboxed"
│   ├── Models/                    # ServiceInfo, GitStatus, DetectedTool, stats
│   ├── Services/
│   │   ├── Shell.swift            # Off-main subprocess runner + PATH for GUI apps
│   │   ├── ScanParsing.swift      # Pure lsof/ps/git output parsers (unit-testable)
│   │   ├── ServiceDiscovery.swift # lsof → processes → projects + git
│   │   ├── PortScanner.swift      # Observable scan loop, stop/restart, stopped list
│   │   ├── GitStatusProvider.swift# Cached branch/changes/repo root
│   │   ├── StatsCollector.swift   # 30-day commit history from git log
│   │   ├── StatsModel.swift       # Keeps the activity strip current
│   │   ├── ToolRegistry.swift     # Installed editors/terminals/AI CLIs
│   │   └── ToolLauncher.swift     # Opens a project in a tool
│   ├── Views/
│   │   ├── Theme.swift            # Design tokens + shared primitives
│   │   ├── ServiceRowView.swift   # Running and stopped rows
│   │   ├── ActivityFooter.swift   # Commit strip
│   │   └── EmptyStateView.swift   # Empty / loading / error states
│   └── AppIntents/
│       └── LocalhostBarIntents.swift # Shortcuts
├── LocalhostBarWidget/            # WidgetKit widget (not in the build yet)
└── README.md
```

## Building

The Xcode project is generated from [`project.yml`](project.yml) with XcodeGen, so there's no
manual target setup — this is the same flow CI uses
([`.github/workflows/build-native-macos.yml`](../.github/workflows/build-native-macos.yml)).

```bash
brew install xcodegen         # one-time
cd LocalhostBarNative
xcodegen generate             # writes LocalhostBar.xcodeproj from project.yml
open LocalhostBar.xcodeproj   # build/run the LocalhostBar scheme in Xcode
```

To build from the command line the way CI does:

```bash
xcodebuild -project LocalhostBar.xcodeproj \
  -scheme LocalhostBar \
  -configuration Release \
  -destination 'platform=macOS' \
  CODE_SIGN_IDENTITY="-" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO \
  build
```

The bundle identifier (`com.localhostbar.app`) and deployment target (macOS 14.0) are defined in
`project.yml`; edit them there rather than in Xcode, since the project file is regenerated.

## Configuration

### Info.plist Settings

- `LSUIElement: true` - Hides dock icon (menu bar only app)
- `LSApplicationCategoryType: public.app-category.developer-tools` - App Store category
- `LSMinimumSystemVersion: 14.0` - Requires macOS Sonoma

### Why it isn't sandboxed

`LocalhostBar.entitlements` is deliberately empty. The app has to list other apps'
processes (`lsof`, `ps`) and run `git` inside your project folders. Under the App Sandbox
those calls quietly return nothing — earlier builds had the sandbox on and showed an empty
panel no matter what was running. Hardened Runtime stays on.

## App Intents (Siri Shortcuts)

The app provides these shortcuts:
- **"Show my servers"** - Launches Localhost Bar
- **"How many servers are running"** - Returns server count
- **"Stop server on port [port]"** - Kills a specific server
- **"Open server on port [port]"** - Opens in browser

## Widget

A WidgetKit extension (`LocalhostBarWidget/`) is included in the source and shows:
- **Small**: Server count with green indicator
- **Medium**: Server count + list of top 3 servers with ports

> Note: the widget target is currently commented out in [`project.yml`](project.yml), so the
> default build produces the menu-bar app only. Uncomment and configure signing for the widget
> target to include it.

## Distribution

The Mac App Store requires the App Sandbox, which this app can't work inside (see above),
so it ships as a DMG instead. For a build other people can open without a Gatekeeper
warning, sign with a Developer ID certificate and notarize it.

## License

MIT License — see [LICENSE](../LICENSE) in the repository root.

## Credits

Based on the Electron version of Localhost Bar by Matt Pointon.
