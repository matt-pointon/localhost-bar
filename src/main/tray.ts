import { Tray, BrowserWindow, nativeImage, screen } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

let trayInstance: Tray | null = null

function resolveTrayIconDir(): string {
  const candidates = [
    join(__dirname, 'tray-icons'), // bundled with main process in production
    join(__dirname, '../../build'), // dev fallback (electron-vite serves from out/main)
    process.resourcesPath // extraResources fallback
  ]

  for (const dir of candidates) {
    if (existsSync(join(dir, 'icon.png'))) return dir
  }

  return candidates[0]
}

export function createTray(panel: BrowserWindow): Tray {
  const iconDir = resolveTrayIconDir()
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
  
  // macOS template images auto-invert for dark/light menu bar backgrounds
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true)
  }

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
