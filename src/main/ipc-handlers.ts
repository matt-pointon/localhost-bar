import { app, ipcMain, shell, clipboard, BrowserWindow } from 'electron'
import { execSync, spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { scanPorts } from './port-scanner'
import { trackServiceChanges } from './scan-tracker'
import { getAvailableTools } from './tool-registry'
import { runDeploy, getInstalledDeployCLIs, detectDeployTarget, getLastDeploy } from './deploy'
import type { DeployTarget } from './deploy'
import { getGitStatus } from './port-scanner/git-status'
import { gitCommit, gitPull, gitCreatePR, isGhInstalled, getDefaultBranch } from './git-actions'
import { getDailyStats } from './stats/collector'
import type { ProjectRef } from './stats/collector'
import { getTokenStats } from './token-stats'
import { getAiProjects, buildResumeCommand } from './session-sources'
import type { AiToolId } from './session-sources'
import { getSettings, setSettings, togglePin, setRename } from './settings'
import { setNotificationsEnabled } from './notifications'
import { getTasks, addTask, toggleTask, removeTask } from './tasks/store'
import { checkForUpdates } from './updater'

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
    const result = await scanPorts()
    trackServiceChanges(result.services, result.portConflicts)
    return result
  })

  ipcMain.handle('ports:kill', async (_event, pid: number) => {
    try {
      process.kill(pid, 'SIGTERM')
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
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

    return [...tools].sort((a, b) => {
      const aTime = usage[a.id] ?? 0
      const bTime = usage[b.id] ?? 0
      if (aTime && !bTime) return -1
      if (!aTime && bTime) return 1
      if (aTime && bTime) return bTime - aTime
      return 0
    })
  })

  ipcMain.handle('app:open-with', async (_event, { action, cwd }: { action: string; cwd: string }) => {
    try {
      recordToolUsage(action)
      const safe = cwd.replace(/'/g, "'\\''")
      const tools = getAvailableTools()
      const tool = tools.find(t => t.id === action)

      const CLI_COMMANDS: Record<string, string> = {
        vscode: 'code', cursor: 'cursor', windsurf: 'windsurf', zed: 'zed'
      }
      const APP_NAMES: Record<string, string> = {
        vscode: 'Visual Studio Code', cursor: 'Cursor', windsurf: 'Windsurf',
        zed: 'Zed', xcode: 'Xcode', ghostty: 'Ghostty', warp: 'Warp',
        conductor: 'Conductor', 'github-desktop': 'GitHub Desktop'
      }

      if (action === 'finder') {
        await shell.openPath(cwd)
      } else if (action === 'terminal' || action === 'iterm2' || action === 'ghostty' || action === 'warp') {
        openTerminal(action, safe)
      } else if (action === 'claude' || action === 'codex') {
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
      spawn('open', [`warp://action/new_tab?path=${encodeURIComponent(safeCwd.replace(/\\'/g, "'"))}`], { detached: true, stdio: 'ignore' }).unref()
    }
  }

  function openTerminalWithCommand(toolId: string, safeCwd: string): void {
    const useIterm = existsSync('/Applications/iTerm.app')
    const cmd = toolId
    const script = useIterm
      ? `tell application "iTerm"\nactivate\ncreate window with default profile command "cd '${safeCwd}' && ${cmd}"\nend tell`
      : `tell application "Terminal"\ndo script "cd '${safeCwd}' && ${cmd}"\nactivate\nend tell`
    execSync(`osascript -e '${script}'`, { timeout: 5000 })
  }

  function openTerminalWithResume(safeCwd: string, cmd: string): void {
    if (process.platform === 'darwin') {
      const useIterm = existsSync('/Applications/iTerm.app')
      const script = useIterm
        ? `tell application "iTerm"\nactivate\ncreate window with default profile command "cd '${safeCwd}' && ${cmd}"\nend tell`
        : `tell application "Terminal"\ndo script "cd '${safeCwd}' && ${cmd}"\nactivate\nend tell`
      execSync(`osascript -e '${script}'`, { timeout: 5000 })
      return
    }

    // Linux / other: launch a terminal emulator if available
    const cwd = safeCwd.replace(/\\'/g, "'")
    const candidates: [string, string[]][] = [
      ['x-terminal-emulator', ['-e', 'bash', '-lc', `cd '${safeCwd}' && ${cmd}; exec bash`]],
      ['gnome-terminal', ['--', 'bash', '-lc', `cd '${safeCwd}' && ${cmd}; exec bash`]],
      ['xfce4-terminal', ['-e', `bash -lc "cd '${safeCwd}' && ${cmd}; exec bash"`]],
      ['xterm', ['-e', 'bash', '-lc', `cd '${safeCwd}' && ${cmd}; exec bash`]]
    ]

    for (const [bin, args] of candidates) {
      try {
        spawn(bin, args, { detached: true, stdio: 'ignore', cwd }).unref()
        return
      } catch {
        continue
      }
    }

    // Last resort: spawn the tool directly without a terminal UI
    spawn('bash', ['-lc', cmd], { detached: true, stdio: 'ignore', cwd }).unref()
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
    let cmd = args
    const binMatch = args.match(/(?:node\s+)?.*\/node_modules\/\.bin\/(\S+)(.*)/)
    if (binMatch) {
      cmd = `npx ${binMatch[1]}${binMatch[2]}`
    }
    try {
      const child = spawn('/bin/zsh', ['-l', '-c', cmd], {
        cwd,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env }
      })
      child.unref()
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

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

  ipcMain.handle('stats:get-daily', (_event, projects: ProjectRef[]) => {
    return getDailyStats(projects)
  })

  ipcMain.handle('stats:get-tokens', () => {
    return getTokenStats()
  })

  ipcMain.handle('sessions:get-ai-projects', (_event, runningCwds?: string[]) => {
    return getAiProjects(runningCwds)
  })

  ipcMain.handle(
    'sessions:resume',
    async (
      _event,
      { tool, sessionId, cwd }: { tool: AiToolId; sessionId: string; cwd: string }
    ) => {
      try {
        const built = buildResumeCommand(tool, sessionId, cwd)
        if (!built) return { success: false, error: `Unknown tool: ${tool}` }

        if (tool === 'cursor') {
          spawn(built.command, built.args, { detached: true, stdio: 'ignore', cwd }).unref()
          return { success: true }
        }

        // Claude / Codex: open a terminal in the project and resume the session
        const cmd = [built.command, ...built.args].join(' ')
        const safe = cwd.replace(/'/g, "'\\''")
        openTerminalWithResume(safe, cmd)
        return { success: true }
      } catch (err: unknown) {
        return { success: false, error: String(err) }
      }
    }
  )

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

  ipcMain.handle('tasks:get', (_event, cwd: string) => getTasks(cwd))

  ipcMain.handle('tasks:add', (_event, { cwd, text }: { cwd: string; text: string }) => {
    const git = getGitStatus(cwd)
    const task = addTask(cwd, text, git)
    return { success: true, task, tasks: getTasks(cwd) }
  })

  ipcMain.handle('tasks:toggle', (_event, { cwd, id }: { cwd: string; id: string }) => {
    const git = getGitStatus(cwd)
    const tasks = toggleTask(cwd, id, git)
    return { success: true, tasks }
  })

  ipcMain.handle('tasks:remove', (_event, { cwd, id }: { cwd: string; id: string }) => {
    const git = getGitStatus(cwd)
    const tasks = removeTask(cwd, id, git)
    return { success: true, tasks }
  })

  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:set-notifications', (_event, enabled: boolean) => {
    setNotificationsEnabled(enabled)
    setSettings({ notificationsEnabled: enabled })
    return getSettings()
  })

  ipcMain.handle('settings:toggle-pin', (_event, cwd: string) => togglePin(cwd))

  ipcMain.handle('settings:set-rename', (_event, { cwd, name }: { cwd: string; name: string }) => {
    setRename(cwd, name)
    return { success: true }
  })

  ipcMain.handle('app:check-updates', () => {
    checkForUpdates()
    return { success: true }
  })
}
