import { app, ipcMain, shell } from 'electron'
import { execSync, spawn } from 'child_process'
import { existsSync } from 'fs'
import { scanPorts } from './port-scanner'
import { getInstalledTools } from './tool-checker'
import { runDeploy, getInstalledDeployCLIs, detectDeployTarget, getLastDeploy } from './deploy'
import type { DeployTarget } from './deploy'

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

  ipcMain.handle('app:get-installed-tools', () => {
    return getInstalledTools()
  })

  ipcMain.handle('app:open-with', async (_event, { action, cwd }: { action: string; cwd: string }) => {
    try {
      // Escape path for use in shell/AppleScript strings
      const safe = cwd.replace(/'/g, "'\\''")

      switch (action) {
        case 'finder':
          await shell.openPath(cwd)
          break
        case 'vscode':
          spawn('code', [cwd], { detached: true, stdio: 'ignore' }).unref()
          break
        case 'cursor':
          spawn('cursor', [cwd], { detached: true, stdio: 'ignore' }).unref()
          break
        case 'windsurf':
          spawn('windsurf', [cwd], { detached: true, stdio: 'ignore' }).unref()
          break
        case 'terminal': {
          const useIterm = existsSync('/Applications/iTerm.app')
          const script = useIterm
            ? `tell application "iTerm"\nactivate\ncreate window with default profile command "cd '${safe}'"\nend tell`
            : `tell application "Terminal"\ndo script "cd '${safe}'"\nactivate\nend tell`
          execSync(`osascript -e '${script}'`, { timeout: 5000 })
          break
        }
        case 'claude': {
          const useIterm = existsSync('/Applications/iTerm.app')
          const script = useIterm
            ? `tell application "iTerm"\nactivate\ncreate window with default profile command "cd '${safe}' && claude"\nend tell`
            : `tell application "Terminal"\ndo script "cd '${safe}' && claude"\nactivate\nend tell`
          execSync(`osascript -e '${script}'`, { timeout: 5000 })
          break
        }
      }
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: String(err) }
    }
  })

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
    try {
      const child = spawn('sh', ['-c', args], {
        cwd,
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })
}
