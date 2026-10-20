import Foundation

/// Remembers which projects have run, so the activity strip still counts their commits
/// after the server stops. Lives in `~/.localhost-bar/stats.json`, which the Electron
/// build also writes — unknown keys are preserved.
enum StatsStore {
    private static let maxKnownProjects = 40

    private static var file: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".localhost-bar/stats.json")
    }

    /// Adds `paths` to the known list and returns the full list.
    static func remember(_ paths: [String]) -> [String] {
        var json = read()
        var known = json["knownProjects"] as? [String] ?? []
        let new = paths.filter { !known.contains($0) }
        guard !new.isEmpty else { return known }

        known = Array((known + new).suffix(maxKnownProjects))
        json["knownProjects"] = known
        write(json)
        return known
    }

    private static func read() -> [String: Any] {
        guard let data = try? Data(contentsOf: file),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return [:]
        }
        return object
    }

    private static func write(_ json: [String: Any]) {
        try? FileManager.default.createDirectory(
            at: file.deletingLastPathComponent(), withIntermediateDirectories: true
        )
        if let data = try? JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted]) {
            try? data.write(to: file, options: .atomic)
        }
    }
}
