#!/bin/bash

# Create Xcode Project for Localhost Bar
# This script helps set up the Xcode project structure

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📦 Localhost Bar Native - Xcode Project Setup"
echo "=============================================="
echo ""

# Check if Xcode is available
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode is not installed. Please install Xcode from the Mac App Store."
    exit 1
fi

echo "✅ Xcode found"

# Check if swift-create-xcframework is available (optional)
if command -v swift &> /dev/null; then
    echo "✅ Swift toolchain found"
else
    echo "❌ Swift toolchain not found"
    exit 1
fi

echo ""
echo "📋 Project Structure:"
echo ""
find "$PROJECT_DIR/LocalhostBar" -type f -name "*.swift" | while read -r file; do
    echo "   ✓ $(basename "$file")"
done

echo ""
echo "📋 Localization Files:"
echo ""
find "$PROJECT_DIR/LocalhostBar/Localizations" -name "*.strings" | while read -r file; do
    lang=$(basename "$(dirname "$file")" .lproj)
    echo "   ✓ $lang"
done

echo ""
echo "🔧 To create the Xcode project manually:"
echo ""
echo "   1. Open Xcode"
echo "   2. File > New > Project"
echo "   3. macOS > App"
echo "   4. Product Name: LocalhostBar"
echo "   5. Team: Your Apple Developer Team"
echo "   6. Bundle Identifier: com.yourname.localhostbar"
echo "   7. Interface: SwiftUI"
echo "   8. Language: Swift"
echo ""
echo "   Then:"
echo "   - Delete the generated ContentView.swift and App file"
echo "   - Drag all files from LocalhostBar/ into the project"
echo "   - Add Widget Extension target for LocalhostBarWidget/"
echo "   - Set deployment target to macOS 14.0"
echo "   - Enable App Sandbox in Signing & Capabilities"
echo "   - Add required entitlements"
echo ""
echo "✨ Done! Your native macOS app is ready to build."
