import { Tray, BrowserWindow, nativeImage, screen, app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

let trayInstance: Tray | null = null

export function createTray(panel: BrowserWindow): Tray {
  // In dev mode, __dirname is out/main, so ../../build/icon.png works
  // In production, we need to use resources path
  const isDev = !app.isPackaged
  
  let iconDir: string
  if (isDev) {
    // Development: icons are in build/ relative to project root
    iconDir = join(__dirname, '../../build')
  } else {
    // Production: icons should be in resources
    iconDir = process.resourcesPath
  }
  
  const iconPath1x = join(iconDir, 'icon.png')
  const iconPath2x = join(iconDir, 'icon@2x.png')
  
  // Create image with both 1x and 2x representations for Retina/HiDPI support
  const icon = nativeImage.createEmpty()
  
  if (existsSync(iconPath1x)) {
    icon.addRepresentation({
      scaleFactor: 1.0,
      buffer: readFileSync(iconPath1x)
    })
  }
  
  if (existsSync(iconPath2x)) {
    icon.addRepresentation({
      scaleFactor: 2.0,
      buffer: readFileSync(iconPath2x)
    })
  }
  
  if (icon.isEmpty()) {
    console.error('[Tray] Failed to load icon from', iconDir)
  }
  
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
