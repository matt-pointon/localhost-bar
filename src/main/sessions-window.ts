import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let sessionsWindow: BrowserWindow | null = null

// A full-size, resizable window (unlike the compact tray panel) for the unified
// "All Sessions" table. Reuses the same renderer bundle via the #sessions hash.
export function openSessionsWindow(): BrowserWindow {
  if (sessionsWindow && !sessionsWindow.isDestroyed()) {
    sessionsWindow.show()
    sessionsWindow.focus()
    return sessionsWindow
  }

  sessionsWindow = new BrowserWindow({
    width: 920,
    height: 640,
    minWidth: 640,
    minHeight: 400,
    show: false,
    title: 'Agent Sessions',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#06090b',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  sessionsWindow.on('ready-to-show', () => {
    sessionsWindow?.show()
  })

  sessionsWindow.on('closed', () => {
    sessionsWindow = null
  })

  sessionsWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    sessionsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#sessions`)
  } else {
    sessionsWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'sessions' })
  }

  return sessionsWindow
}
