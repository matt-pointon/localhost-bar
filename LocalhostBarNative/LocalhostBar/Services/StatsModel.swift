import Foundation
import Combine

/// Keeps the activity strip current: reloads when the set of running projects changes,
/// and otherwise at most every couple of minutes.
@MainActor
final class StatsModel: ObservableObject {
    @Published private(set) var stats: DailyStats?

    private var roots: Set<String> = []
    private var lastRefresh = Date.distantPast
    private var refreshTask: Task<Void, Never>?
    private var subscription: AnyCancellable?
    private var timer: Timer?

    init() {
        subscription = PortScanner.shared.$services.sink { [weak self] services in
            let roots = Set(services.compactMap(\.repoRoot))
            Task { @MainActor in
                guard let self, roots != self.roots || self.stats == nil else { return }
                self.refresh(roots)
            }
        }
        let timer = Timer(timeInterval: 120, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.refreshIfStale() }
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    func refreshIfStale() {
        if Date().timeIntervalSince(lastRefresh) > 60 { refresh(roots) }
    }

    private func refresh(_ roots: Set<String>) {
        self.roots = roots
        lastRefresh = Date()
        refreshTask?.cancel()
        refreshTask = Task {
            let result = await StatsCollector.dailyStats(activeRepoRoots: roots.sorted())
            if !Task.isCancelled, result != stats { stats = result }
        }
    }
}
