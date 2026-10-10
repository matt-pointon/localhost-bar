# Localhost Bar (Native macOS)

A native macOS menu bar app that shows running localhost development servers with git status, quick actions, and stats.

Built entirely in **Swift + SwiftUI** for optimal performance, battery life, and deep macOS integration.

## Features

### Core Features
- **Port Scanning** - Automatically detects dev servers running on ports 1024-9999
- **Project Names** - Infers project names from working directories
- **Git Status** - Shows branch name, uncommitted changes, and last commit
- **Resource Monitoring** - Displays CPU and memory usage per server
- **Quick Actions** - Open in browser, Finder, VS Code, Cursor, terminals, and more
- **Offline Tracking** - Remembers recently stopped servers for quick restart

### macOS Native Integration
- **Menu Bar App** - Lives in your menu bar, no dock icon
- **Launch at Login** - Uses modern SMAppService API
- **Siri Shortcuts** - "Show my servers", "Stop server on port 3000"
- **Desktop Widget** - Glanceable server count widget
- **System Appearance** - Automatic light/dark mode support
- **Native App** - Swift/SwiftUI, no bundled browser runtime

## Requirements

- macOS 14.0 (Sonoma) or later
- Xcode 15.0 or later (latest-stable is what CI uses)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — the `.xcodeproj` is generated from `project.yml`, not checked in (`brew install xcodegen`)

## Project Structure

```
LocalhostBarNative/
├── LocalhostBar/
│   ├── LocalhostBarApp.swift      # App entry point with MenuBarExtra
│   ├── ContentView.swift          # Main popover content
│   ├── Info.plist                 # App configuration (LSUIElement = true)
│   ├── LocalhostBar.entitlements  # Sandbox entitlements
│   ├── Assets.xcassets/           # App icons and menu bar icon
│   ├── Models/
│   │   ├── ServiceInfo.swift      # Server data model
│   │   ├── GitStatus.swift        # Git status model
│   │   └── DetectedTool.swift     # Tool detection model
│   ├── Services/
│   │   ├── PortScanner.swift      # lsof-based port scanning
│   │   ├── GitStatusProvider.swift # Git status fetching
│   │   ├── ToolRegistry.swift     # Detect installed tools
│   │   └── ToolLauncher.swift     # Open tools with AppleScript
│   ├── Views/
│   │   ├── ServiceRowView.swift   # Individual server row
│   │   ├── StatsView.swift        # Activity stats and heatmap
│   │   ├── EmptyStateView.swift   # Empty state + offline rows
│   │   └── SettingsView.swift     # Preferences window
│   └── AppIntents/
│       └── LocalhostBarIntents.swift # Siri Shortcuts
├── LocalhostBarWidget/
│   └── LocalhostBarWidget.swift   # WidgetKit widget
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

### Entitlements

The app uses the App Sandbox with these entitlements:
- `com.apple.security.app-sandbox` - Required for App Store
- `com.apple.security.files.user-selected.read-write` - File access
- `com.apple.security.network.client` - HTTP requests
- `com.apple.security.automation.apple-events` - AppleScript for terminals

## App Intents (Siri Shortcuts)

The app provides these shortcuts:
- **"Show my servers"** - Opens the menu bar popover
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

## App Store Submission

### Checklist

- [ ] App icons (all sizes in Assets.xcassets)
- [ ] Menu bar icon (template image)
- [ ] Screenshots for App Store
- [ ] App preview video
- [ ] Localization (minimum: en, ja, de, fr)
- [ ] Privacy policy URL
- [ ] App Store description
- [ ] Keywords

### Featuring Nomination

To be considered for featuring on the Mac App Store:

1. Go to App Store Connect > Featuring Nominations
2. Submit 2-3 months before launch
3. Highlight:
   - Native Swift/SwiftUI implementation
   - Shortcuts and Widget integration
   - Developer tools category innovation
   - Accessibility support

## License

MIT License — see [LICENSE](../LICENSE) in the repository root.

## Credits

Based on the Electron version of Localhost Bar by Matt Pointon.
