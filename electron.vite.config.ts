import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import type { Plugin } from 'vite'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function copyTrayIcons(): Plugin {
  const iconDir = resolve('build')
  const outDir = resolve('out/main/tray-icons')

  const copyIcons = (): void => {
    if (!existsSync(resolve(iconDir, 'icon.png'))) return
    mkdirSync(outDir, { recursive: true })
    copyFileSync(resolve(iconDir, 'icon.png'), resolve(outDir, 'icon.png'))
    copyFileSync(resolve(iconDir, 'icon@2x.png'), resolve(outDir, 'icon@2x.png'))
  }

  return {
    name: 'copy-tray-icons',
    buildStart: copyIcons,
    closeBundle: copyIcons
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyTrayIcons()],
    resolve: {
      alias: { '@main': resolve('src/main') }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: { '@': resolve('src/renderer/src') }
    },
    plugins: [react(), tailwindcss()]
  }
})
