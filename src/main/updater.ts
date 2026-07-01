import { app } from 'electron'
import { autoUpdater } from 'electron-updater'

let initialized = false

export function initAutoUpdater(): void {
  if (initialized || !app.isPackaged) return
  initialized = true

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  autoUpdater.checkForUpdatesAndNotify().catch(() => { /* offline */ })
}

export function checkForUpdates(): void {
  if (!app.isPackaged) return
  autoUpdater.checkForUpdatesAndNotify().catch(() => { /* offline */ })
}
