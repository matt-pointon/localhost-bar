import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createPanel } from './panel'
import { createTray } from './tray'
import { registerIpcHandlers } from './ipc-handlers'

// Enforce single instance — quit immediately if another is already running
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

// Menu bar only — no dock icon
app.dock?.hide()

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.mattpointon.localhostbar')

  const panel = createPanel()
  createTray(panel)
  registerIpcHandlers()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchShortcuts(window)
  })
})

app.on('window-all-closed', () => {
  // Don't quit — menu bar apps persist until explicitly quit
})
