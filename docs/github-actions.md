# Quick GitHub Actions

Quick git/GitHub actions accessible from each service row's `...` menu — commit, pull, and create PR without leaving the menu bar.

## Actions

### 1. Commit changes
- Only shown when `git.changes > 0`
- Opens a small inline input for commit message (like TaskInput)
- Runs `git add -A && git commit -m "message"` in the project cwd
- After success: toast/flash the service row, refresh git status
- If commit fails (hooks, conflicts): show error inline

### 2. Pull changes
- Always shown when git is available
- Runs `git pull` in the project cwd
- Shows spinner while running, then success/error state
- Refreshes git status after completion

### 3. Create PR
- Only shown when branch is not `main`/`master` and `gh` CLI is installed
- Pushes current branch, then runs `gh pr create --fill --web`
- `--web` opens GitHub in browser so user can review/edit before submitting
- Alternatively: inline title input, then `gh pr create --title "..." --body ""`

## Prerequisites

- **`gh` CLI**: Needed for Create PR. Detect at startup alongside other tools in `tool-checker.ts`
- **Git repo**: All actions hidden when `service.git === null`
- **Clean/dirty state**: Commit only when dirty, PR only on non-default branch

## Implementation

### Main process

**`src/main/git-actions.ts`** — new file:
```typescript
export async function gitCommit(cwd: string, message: string): Promise<{ success: boolean; error?: string }>
export async function gitPull(cwd: string): Promise<{ success: boolean; error?: string }>
export async function gitCreatePR(cwd: string): Promise<{ success: boolean; url?: string; error?: string }>
```

Each function spawns git/gh as a child process with a timeout (10s for commit/pull, 15s for PR).

**`src/main/ipc-handlers.ts`** — add three handlers:
- `git:commit` — takes `{ cwd, message }`
- `git:pull` — takes `{ cwd }`
- `git:create-pr` — takes `{ cwd }`

**`src/main/tool-checker.ts`** — add `gh` to the tool checklist.

### Preload

**`src/preload/index.ts`** — expose:
```typescript
gitCommit: (cwd: string, message: string) => ipcRenderer.invoke('git:commit', { cwd, message })
gitPull: (cwd: string) => ipcRenderer.invoke('git:pull', { cwd })
gitCreatePR: (cwd: string) => ipcRenderer.invoke('git:create-pr', { cwd })
```

### Renderer

**`src/renderer/src/components/QuickActionsMenu.tsx`**:
- Add a "Git" section separator after the existing tools/deploy sections
- Three menu items: Commit, Pull, Create PR (with conditional visibility)
- Commit item: on click, show inline text input (reuse pattern from TaskInput)
- Pull item: on click, call `gitPull(cwd)`, show loading state
- Create PR item: on click, call `gitCreatePR(cwd)`
- Icons from lucide-react: `GitCommit`, `Download`, `GitPullRequest`

### UX states

| Action | Idle | Loading | Success | Error |
|--------|------|---------|---------|-------|
| Commit | "Commit..." | spinner | checkmark (1s) | red text |
| Pull | "Pull" | spinner | checkmark (1s) | red text |
| Create PR | "Create PR" | spinner | "Opened" | red text |

## Scope decisions

- **No staging UI** — `git add -A` keeps it simple. Power users who want selective staging will use their editor.
- **No merge/rebase** — too complex for a menu bar widget.
- **No push without PR** — pushing is part of Create PR. Standalone push adds confusion.
- **`--fill --web`** for PR creation — lets the user review before submitting, avoids needing title/body inputs.

## Files to create/modify

| File | Change |
|------|--------|
| `src/main/git-actions.ts` | New — git command runners |
| `src/main/ipc-handlers.ts` | Add 3 IPC handlers |
| `src/main/tool-checker.ts` | Add `gh` CLI detection |
| `src/preload/index.ts` | Expose 3 new API methods |
| `src/renderer/src/components/QuickActionsMenu.tsx` | Git section UI |
