import { Tray, BrowserWindow, nativeImage, screen } from 'electron'
import { join } from 'path'

let trayInstance: Tray | null = null

export function createTray(panel: BrowserWindow): Tray {
  const iconPath = join(__dirname, '../../build/icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  icon.setTemplateImage(true) // Auto-inverts for dark/light menu bar

  trayInstance = new Tray(icon)
  trayInstance.setToolTip('Localhost Bar')

  trayInstance.on('click', (_event, bounds) => {
    togglePanel(panel, bounds)
  })

  return trayInstance
}

function togglePanel(panel: BrowserWindow, trayBounds: Electron.Rectangle): void {
  if (panel.isVisible()) {
    panel.hide()
    return
  }
  positionPanel(panel, trayBounds)
  panel.show()
  panel.focus()
}

function positionPanel(panel: BrowserWindow, trayBounds: Electron.Rectangle): void {
  const [panelW, panelH] = panel.getSize()

  const display = screen.getDisplayNearestPoint({
    x: trayBounds.x,
    y: trayBounds.y
  })

  const workArea = display.workArea

  // Center horizontally under tray icon, clamped to screen edges
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - panelW / 2)
  x = Math.max(workArea.x + 8, Math.min(x, workArea.x + workArea.width - panelW - 8))

  // Just below the menu bar
  const y = Math.round(trayBounds.y + trayBounds.height + 4)

  // Ensure panel doesn't overflow below screen
  const clampedY = Math.min(y, workArea.y + workArea.height - panelH - 8)

  panel.setPosition(x, clampedY, false)
}
