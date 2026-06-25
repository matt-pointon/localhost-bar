import { app, ipcMain, shell, clipboard, nativeImage, BrowserWindow } from 'electron'
import { execSync, spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { scanPorts } from './port-scanner'
import { getAvailableTools, type DetectedTool } from './tool-registry'
import { runDeploy, getInstalledDeployCLIs, detectDeployTarget, getLastDeploy } from './deploy'
import type { DeployTarget } from './deploy'
import { getGitStatus } from './port-scanner/git-status'
import { gitCommit, gitPull, gitCreatePR, isGhInstalled, getDefaultBranch } from './git-actions'
import { getDailyStats } from './stats/collector'
import { getTokenStats } from './token-stats'

// ── Tool usage tracking (MRU order) ─────────────────────────────────────────
function getUsagePath(): string {
  return join(app.getPath('userData'), 'tool-usage.json')
}

function getToolUsage(): Record<string, number> {
  try {
    return JSON.parse(readFileSync(getUsagePath(), 'utf8'))
  } catch {
    return {}
  }
}

function recordToolUsage(toolId: string): void {
  const usage = getToolUsage()
  usage[toolId] = Date.now()
  try {
    writeFileSync(getUsagePath(), JSON.stringify(usage))
  } catch { /* best-effort */ }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('ports:scan', async () => {
    return await scanPorts()
  })

  ipcMain.handle('ports:kill', async (_event, pid: number) => {
    try {
      process.kill(pid, 'SIGTERM')
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      // ESRCH = process already gone — treat as success
      if (message.includes('ESRCH')) return { success: true }
      return { success: false, error: message }
    }
  })

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    await shell.openExternal(url)
    return { success: true }
  })

  ipcMain.handle('shell:openFolder', async (_event, folderPath: string) => {
    await shell.openPath(folderPath)
    return { success: true }
  })

  ipcMain.handle('app:quit', () => {
    app.quit()
  })

  ipcMain.handle('app:get-available-tools', () => {
    const tools = getAvailableTools()
    const usage = getToolUsage()

    // Sort: recently-used tools first (by timestamp desc), then never-used in default order
    return [...tools].sort((a, b) => {
      const aTime = usage[a.id] ?? 0
      const bTime = usage[b.id] ?? 0
      if (aTime && !bTime) return -1
      if (!aTime && bTime) return 1
      if (aTime && bTime) return bTime - aTime
      return 0 // preserve default order for never-used
    })
  })

  ipcMain.handle('app:open-with', async (_event, { action, cwd }: { action: string; cwd: string }) => {
    try {
      recordToolUsage(action)
      const safe = cwd.replace(/'/g, "'\\''")
      const tools = getAvailableTools()
      const tool = tools.find(t => t.id === action)

      // CLI command names for editors that support `<cmd> <path>`
      const CLI_COMMANDS: Record<string, string> = {
        vscode: 'code', cursor: 'cursor', windsurf: 'windsurf', zed: 'zed'
      }
      // macOS app names for `open -a` fallback
      const APP_NAMES: Record<string, string> = {
        vscode: 'Visual Studio Code', cursor: 'Cursor', windsurf: 'Windsurf',
        zed: 'Zed', xcode: 'Xcode', ghostty: 'Ghostty', warp: 'Warp',
        conductor: 'Conductor', 'github-desktop': 'GitHub Desktop'
      }

      if (action === 'finder') {
        await shell.openPath(cwd)
      } else if (action === 'terminal' || action === 'iterm2' || action === 'ghostty' || action === 'warp') {
        // Terminals need special handling to cd into the directory
        openTerminal(action, safe)
      } else if (action === 'claude' || action === 'codex') {
        // AI CLI tools: open in terminal and run the command
        openTerminalWithCommand(action, safe)
      } else if (tool?.hasCli && CLI_COMMANDS[action]) {
        spawn(CLI_COMMANDS[action], [cwd], { detached: true, stdio: 'ignore' }).unref()
      } else if (APP_NAMES[action]) {
        spawn('open', ['-a', APP_NAMES[action], cwd], { detached: true, stdio: 'ignore' }).unref()
      }

      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: String(err) }
    }
  })

  function openTerminal(termId: string, safeCwd: string): void {
    if (termId === 'iterm2') {
      const script = `tell application "iTerm"\nactivate\ncreate window with default profile command "cd '${safeCwd}'"\nend tell`
      execSync(`osascript -e '${script}'`, { timeout: 5000 })
    } else if (termId === 'terminal') {
      const script = `tell application "Terminal"\ndo script "cd '${safeCwd}'"\nactivate\nend tell`
      execSync(`osascript -e '${script}'`, { timeout: 5000 })
    } else if (termId === 'ghostty') {
      const cwd = safeCwd.replace(/\\'/g, "'")
      spawn('open', ['-na', 'Ghostty.app', '--args', `--working-directory=${cwd}`], { detached: true, stdio: 'ignore' }).unref()
    } else if (termId === 'warp') {
      // Warp supports open with a URL scheme
      spawn('open', [`warp://action/new_tab?path=${encodeURIComponent(safeCwd.replace(/\\'/g, "'"))}`], { detached: true, stdio: 'ignore' }).unref()
    }
  }

  function openTerminalWithCommand(toolId: string, safeCwd: string): void {
    const useIterm = existsSync('/Applications/iTerm.app')
    const cmd = toolId // 'claude' or 'codex'
    const script = useIterm
      ? `tell application "iTerm"\nactivate\ncreate window with default profile command "cd '${safeCwd}' && ${cmd}"\nend tell`
      : `tell application "Terminal"\ndo script "cd '${safeCwd}' && ${cmd}"\nactivate\nend tell`
    execSync(`osascript -e '${script}'`, { timeout: 5000 })
  }

  ipcMain.handle('deploy:get-info', (_event, cwd: string) => {
    return {
      target: detectDeployTarget(cwd),
      installedCLIs: getInstalledDeployCLIs(),
      lastDeploy: getLastDeploy(cwd)
    }
  })

  ipcMain.handle('deploy:run', (event, { cwd, target }: { cwd: string; target: DeployTarget }) => {
    runDeploy(cwd, target, event.sender)
  })

  ipcMain.handle('app:restart-service', async (_event, { args, cwd }: { args: string; cwd: string }) => {
    // Convert internal node_modules/.bin commands back to npx equivalents
    // e.g. "node /path/to/node_modules/.bin/vite dev" → "npx vite dev"
    let cmd = args
    const binMatch = args.match(/(?:node\s+)?.*\/node_modules\/\.bin\/(\S+)(.*)/)
    if (binMatch) {
      cmd = `npx ${binMatch[1]}${binMatch[2]}`
    }
    console.log('[restart-service] cmd:', cmd, 'cwd:', cwd)
    try {
      const child = spawn('/bin/zsh', ['-l', '-c', cmd], {
        cwd,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env }
      })
      child.unref()
      console.log('[restart-service] spawned pid:', child.pid)
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[restart-service] error:', message)
      return { success: false, error: message }
    }
  })

  // ── Git actions ────────────────────────────────────────────────────────────

  ipcMain.handle('git:commit', (_event, { cwd, message }: { cwd: string; message: string }) => {
    return gitCommit(cwd, message)
  })

  ipcMain.handle('git:pull', (_event, { cwd }: { cwd: string }) => {
    return gitPull(cwd)
  })

  ipcMain.handle('git:create-pr', (_event, { cwd }: { cwd: string }) => {
    return gitCreatePR(cwd)
  })

  ipcMain.handle('git:info', (_event, { cwd }: { cwd: string }) => {
    return {
      ghInstalled: isGhInstalled(),
      defaultBranch: getDefaultBranch(cwd)
    }
  })

  // ── Stats ───────────────────────────────────────────────────────────────────

  ipcMain.handle('stats:get-daily', (_event, cwds: string[]) => {
    return getDailyStats(cwds)
  })

  ipcMain.handle('stats:get-tokens', () => {
    return getTokenStats()
  })

  ipcMain.handle('stats:share', async (event, { height }: { height: number }) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { success: false, error: 'No window' }
      const scaleFactor = win.webContents.getZoomFactor()
      const bounds = win.getContentBounds()
      const image = await win.webContents.capturePage({
        x: 0,
        y: 0,
        width: Math.round(bounds.width),
        height: Math.round(height * scaleFactor)
      })
      clipboard.writeImage(image)
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

}
