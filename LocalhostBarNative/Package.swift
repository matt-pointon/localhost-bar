// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LocalhostBar",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(
            name: "LocalhostBar",
            targets: ["LocalhostBar"]
        )
    ],
    targets: [
        .executableTarget(
            name: "LocalhostBar",
            path: "LocalhostBar",
            exclude: [
                "Info.plist",
                "LocalhostBar.entitlements",
                "Assets.xcassets"
            ],
            resources: [
                .process("Assets.xcassets")
            ]
        )
    ]
)
