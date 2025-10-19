import { LOCAL_STORAGE_KEYS, DEFAULT_SHORTCUTS } from '@/constants'

export interface ShortcutSettings {
  capture: string
  palette: string
  transcribe: string
}

/**
 * Save shortcuts to localStorage
 */
export function saveShortcuts(shortcuts: ShortcutSettings): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SHORTCUTS, JSON.stringify(shortcuts))
  } catch (error) {
    console.error('Failed to save shortcuts to localStorage:', error)
  }
}

/**
 * Load shortcuts from localStorage with fallback to defaults
 */
export function loadShortcuts(): ShortcutSettings {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SHORTCUTS)
    if (!stored) {
      return DEFAULT_SHORTCUTS
    }

    const parsed = JSON.parse(stored) as Partial<ShortcutSettings>

    // Ensure all required fields exist, fallback to defaults for missing ones
    return {
      capture: parsed.capture || DEFAULT_SHORTCUTS.capture,
      palette: parsed.palette || DEFAULT_SHORTCUTS.palette,
      transcribe: parsed.transcribe || DEFAULT_SHORTCUTS.transcribe
    }
  } catch (error) {
    console.error('Failed to load shortcuts from localStorage:', error)
    return DEFAULT_SHORTCUTS
  }
}

/**
 * Clear shortcuts from localStorage (falls back to defaults on next load)
 */
export function clearShortcuts(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.SHORTCUTS)
  } catch (error) {
    console.error('Failed to clear shortcuts from localStorage:', error)
  }
}
