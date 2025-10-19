import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface ShortcutSettings {
  capture: string
  palette: string
  transcribe: string
}

const DEFAULT_SHORTCUTS: ShortcutSettings = {
  capture: process.platform === 'darwin' ? 'Command+Shift+P' : 'Control+Shift+P',
  palette: process.platform === 'darwin' ? 'Command+Shift+O' : 'Control+Shift+O',
  transcribe: process.platform === 'darwin' ? 'Command+Shift+F' : 'Control+Shift+F'
}

function getShortcutsPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'shortcuts.json')
}

/**
 * Load shortcuts from file system
 * Falls back to defaults if file doesn't exist or is invalid
 */
export function loadShortcuts(): ShortcutSettings {
  try {
    const shortcutsPath = getShortcutsPath()

    if (!existsSync(shortcutsPath)) {
      console.log('📂 No shortcuts file found, using defaults')
      return DEFAULT_SHORTCUTS
    }

    const data = readFileSync(shortcutsPath, 'utf-8')
    const parsed = JSON.parse(data) as Partial<ShortcutSettings>

    // Merge with defaults to ensure all fields exist
    const shortcuts: ShortcutSettings = {
      capture: parsed.capture || DEFAULT_SHORTCUTS.capture,
      palette: parsed.palette || DEFAULT_SHORTCUTS.palette,
      transcribe: parsed.transcribe || DEFAULT_SHORTCUTS.transcribe
    }

    console.log('✅ Loaded shortcuts from file:', shortcuts)
    return shortcuts
  } catch (error) {
    console.error('❌ Error loading shortcuts, using defaults:', error)
    return DEFAULT_SHORTCUTS
  }
}

/**
 * Save shortcuts to file system
 */
export function saveShortcuts(shortcuts: ShortcutSettings): boolean {
  try {
    const shortcutsPath = getShortcutsPath()
    const userDataPath = app.getPath('userData')

    // Ensure directory exists
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }

    writeFileSync(shortcutsPath, JSON.stringify(shortcuts, null, 2), 'utf-8')
    console.log('✅ Saved shortcuts to file:', shortcuts)
    return true
  } catch (error) {
    console.error('❌ Error saving shortcuts:', error)
    return false
  }
}

/**
 * Get default shortcuts for the current platform
 */
export function getDefaultShortcuts(): ShortcutSettings {
  return { ...DEFAULT_SHORTCUTS }
}
