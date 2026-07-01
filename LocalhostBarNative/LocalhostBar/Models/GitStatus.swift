import Foundation

struct GitStatus: Equatable {
    let branch: String
    let changes: Int
    let lastCommit: String
}
