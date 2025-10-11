import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard } from 'electron'
import { join } from 'path'
import { execSync } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

interface SimplePaletteOptions {
  onShow?: () => void
  onHide?: () => void
  getPrompts: () => any[]
}

export class SimplePaletteService {
  private window: BrowserWindow | null = null
  private shortcutRegistered = false
  private shortcut = process.platform === 'darwin' ? 'Command+Shift+O' : 'Control+Shift+O'
  private options: SimplePaletteOptions
  private hideHandler: (event: any) => void
  private selectHandler: (event: any, promptText: string) => void

  constructor(options: SimplePaletteOptions) {
    this.options = options

    // Create bound handlers so we can remove them later
    this.hideHandler = () => this.hide()
    this.selectHandler = (_event, promptText: string) => {
      this.insertPrompt(promptText)
      this.hide()
    }

    this.setupIpcHandlers()
  }

  private setupIpcHandlers() {
    // Listen for overlay events that our simplified palette component sends
    // These handlers will run alongside the original ones

    // Add listener for overlay hide (doesn't conflict with existing)
    ipcMain.on('overlay:hide', this.hideHandler)

    // Add listener for overlay prompt selection (doesn't conflict with existing)
    ipcMain.on('overlay:select-prompt', this.selectHandler)

    console.log('📡 Simplified palette listening to existing overlay IPC events')
  }

  private broadcastShortcut(kind: 'capture' | 'palette') {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window || window.isDestroyed()) continue
      try {
        window.webContents.send('shortcut:global-fired', { kind })
      } catch (error) {
        console.warn('Failed to notify renderer about simplified palette shortcut:', error)
      }
    }
  }

  private notifyVisibilityChange(visible: boolean) {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window || window.isDestroyed()) continue
      try {
        window.webContents.send('palette:visibility-changed', { visible })
      } catch (error) {
        console.warn('Failed to notify renderer about palette visibility:', error)
      }
    }
  }

  private createWindow(): BrowserWindow {
    // Get cursor position and display
    const cursorPoint = screen.getCursorScreenPoint()
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint)
    const { width, height } = currentDisplay.bounds // Use bounds instead of workAreaSize for full screen
    const { x: displayX, y: displayY } = currentDisplay.bounds

    const windowWidth = 600
    const windowHeight = 440

    const window = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: displayX + Math.floor((width - windowWidth) / 2),
      y: displayY + Math.floor((height - windowHeight) / 3),
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: true,
      focusable: true,
      fullscreenable: false,
      // Critical: Set these properties for proper overlay behavior
      type: process.platform === 'darwin' ? 'panel' : undefined,
      hasShadow: process.platform !== 'darwin', // Disable shadow on macOS for panel type
      vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false
      }
    })

    // Platform-specific configuration for proper overlay behavior
    if (process.platform === 'darwin') {
      // macOS: Set proper window level for appearing over full screen apps
      window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      window.setAlwaysOnTop(true, 'screen-saver', 1) // Higher level for full screen compatibility
    } else {
      // Windows/Linux: Set always on top
      window.setAlwaysOnTop(true, 'screen-saver')
    }

    // Simple blur handler - hide when focus is truly lost (not just temporary)
    window.on('blur', () => {
      // Longer delay to prevent accidental hiding during window transitions
      setTimeout(() => {
        if (window && !window.isDestroyed() && !window.isFocused()) {
          console.log('📱 Palette lost focus, hiding...')
          this.hide()
        }
      }, 300) // Increased delay for better stability
    })

    // Clean up on close
    window.on('closed', () => {
      if (this.window === window) {
        this.window = null
      }
      this.options.onHide?.()
    })

    // Load the content
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#palette`)
    } else {
      window.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: 'palette'
      })
    }

    return window
  }

  show() {
    try {
      // If window already exists and is visible, don't create a new one
      if (this.window && !this.window.isDestroyed() && this.window.isVisible()) {
        console.log('📱 Palette already visible, focusing existing window')
        this.window.focus()
        return
      }

      // Close existing window if any (but not visible)
      if (this.window && !this.window.isDestroyed()) {
        this.window.close()
        this.window = null
      }

      console.log('📱 Creating new palette window...')

      // Create new window
      this.window = this.createWindow()

      // Show when ready
      this.window.once('ready-to-show', () => {
        if (this.window && !this.window.isDestroyed()) {
          console.log('📱 Palette window ready, showing...')
          this.window.show()
          // Give the window a moment to render, then focus
          setTimeout(() => {
            if (this.window && !this.window.isDestroyed()) {
              this.window.focus()
            }
          }, 50)
          this.options.onShow?.()
          this.notifyVisibilityChange(true)
        }
      })

      // Also handle the case where the window loads very quickly
      this.window.once('show', () => {
        console.log('📱 Palette window shown')
        this.notifyVisibilityChange(true)
      })
    } catch (error) {
      console.error('Failed to show palette:', error)
    }
  }

  hide() {
    try {
      if (this.window && !this.window.isDestroyed()) {
        this.window.hide()
      }
      this.options.onHide?.()
      this.notifyVisibilityChange(false)
    } catch (error) {
      console.error('Failed to hide palette:', error)
    }
  }

  private async insertPrompt(promptText: string) {
    try {
      // Simple clipboard-based insertion
      const originalClipboard = clipboard.readText()
      clipboard.writeText(promptText)

      // Wait a bit for the palette to hide and focus to settle
      await delay(150)

      // Try to paste the content without changing focus away from current app
      if (process.platform === 'darwin') {
        // On macOS, use System Events to paste without changing active app
        execSync(
          'osascript -e \'tell application "System Events" to keystroke "v" using {command down}\'',
          { stdio: 'ignore', timeout: 2000 }
        )
      } else if (process.platform === 'win32') {
        // On Windows, send Ctrl+V directly without Alt+Tab
        execSync(
          'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"',
          { stdio: 'ignore', timeout: 2000 }
        )
      } else {
        // Linux - use xdotool to paste
        execSync('xdotool key --delay 50 ctrl+v', { stdio: 'ignore', timeout: 2000 })
      }

      // Brief delay before restoring clipboard
      await delay(200)

      // Restore original clipboard content
      if (originalClipboard && originalClipboard !== promptText) {
        clipboard.writeText(originalClipboard)
      }
    } catch (error) {
      console.error('Failed to insert prompt:', error)
      // Prompt stays in clipboard as fallback
    }
  }

  registerShortcut(): boolean {
    if (this.shortcutRegistered) return true

    const success = globalShortcut.register(this.shortcut, () => {
      this.broadcastShortcut('palette')
      if (this.window && !this.window.isDestroyed() && this.window.isVisible()) {
        this.hide()
      } else {
        this.show()
      }
    })

    this.shortcutRegistered = success
    return success
  }

  unregisterShortcut() {
    if (this.shortcutRegistered) {
      globalShortcut.unregister(this.shortcut)
      this.shortcutRegistered = false
    }
  }

  dispose() {
    this.unregisterShortcut()

    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }

    // Remove only our specific listeners
    ipcMain.removeListener('overlay:hide', this.hideHandler)
    ipcMain.removeListener('overlay:select-prompt', this.selectHandler)
    this.notifyVisibilityChange(false)
  }

  isVisible(): boolean {
    return this.window !== null && !this.window.isDestroyed() && this.window.isVisible()
  }
}
