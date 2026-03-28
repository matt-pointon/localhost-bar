import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export type DevTool = 'cursor' | 'claude' | 'windsurf' | 'copilot' | 'codex' | 'aider'

// Folders that VS Code-based editors open — keyed by tool
const EDITOR_STORAGE_PATHS: Record<string, DevTool> = {
  'Cursor/User/globalStorage/storage.json': 'cursor',
  'Windsurf/User/globalStorage/storage.json': 'windsurf'
}

function getEditorOpenFolders(storagePath: string): Set<string> {
  try {
    const raw = readFileSync(storagePath, 'utf8')
    const data = JSON.parse(raw)
    const folders = new Set<string>()
    const windowsState = data?.windowsState
    if (!windowsState) return folders

    const addFolder = (uri: string | undefined) => {
      if (uri?.startsWith('file://')) folders.add(decodeURIComponent(uri.slice(7)))
    }

    addFolder(windowsState.lastActiveWindow?.folder)
    for (const w of windowsState.openedWindows ?? []) {
      addFolder(w.folder)
    }
    return folders
  } catch {
    return new Set()
  }
}

// Build the open-folders map once per scan (lazy, not cached across scans)
function buildEditorFolderMap(): Map<DevTool, Set<string>> {
  const map = new Map<DevTool, Set<string>>()
  const appSupport = join(homedir(), 'Library', 'Application Support')

  for (const [rel, tool] of Object.entries(EDITOR_STORAGE_PATHS)) {
    const fullPath = join(appSupport, rel)
    if (existsSync(fullPath)) {
      map.set(tool, getEditorOpenFolders(fullPath))
    }
  }
  return map
}

let _editorMap: Map<DevTool, Set<string>> | null = null
let _editorMapTs = 0
const EDITOR_MAP_TTL_MS = 5000

function getEditorMap(): Map<DevTool, Set<string>> {
  const now = Date.now()
  if (!_editorMap || now - _editorMapTs > EDITOR_MAP_TTL_MS) {
    _editorMap = buildEditorFolderMap()
    _editorMapTs = now
  }
  return _editorMap
}

export function detectTools(cwd: string | null): DevTool[] {
  if (!cwd) return []

  const tools: DevTool[] = []

  // Config-file markers (reliable, tool left config in the project)
  if (existsSync(join(cwd, '.cursor'))) {
    if (!tools.includes('cursor')) tools.push('cursor')
  }
  if (existsSync(join(cwd, '.claude')) || existsSync(join(cwd, 'CLAUDE.md'))) {
    tools.push('claude')
  }
  if (existsSync(join(cwd, '.windsurf'))) {
    if (!tools.includes('windsurf')) tools.push('windsurf')
  }
  if (existsSync(join(cwd, '.github', 'copilot-instructions.md'))) {
    tools.push('copilot')
  }
  try {
    const files = readdirSync(cwd)
    if (files.some(f => f.startsWith('.aider'))) tools.push('aider')
  } catch {
    // cwd not readable
  }

  // Currently-open editor windows (catches projects with no config files)
  const editorMap = getEditorMap()
  for (const [tool, folders] of editorMap) {
    if (folders.has(cwd) && !tools.includes(tool)) {
      tools.push(tool)
    }
  }

  return tools
}
