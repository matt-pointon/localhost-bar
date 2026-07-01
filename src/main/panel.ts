import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let panelWindow: BrowserWindow | null = null

export function createPanel(): BrowserWindow {
  panelWindow = new BrowserWindow({
    width: 560,
    height: 288,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    vibrancy: 'menu',
    visualEffectState: 'active',
    roundedCorners: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Auto-hide when clicking outside the panel
  panelWindow.on('blur', () => {
    panelWindow?.hide()
  })

  panelWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    panelWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    panelWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return panelWindow
}

export function getPanel(): BrowserWindow | null {
  return panelWindow
}
