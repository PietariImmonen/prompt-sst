import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard } from 'electron'
import { exec } from 'child_process'
import { join } from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Try to load robotjs, fall back to AppleScript/platform-specific if not available
let robot: any = null
let pasteMethod: 'robotjs' | 'applescript' | 'clipboard-only' = 'clipboard-only'

try {
  robot = require('robotjs')
  robot.setKeyboardDelay(0)
  pasteMethod = 'robotjs'
  console.log('✅ robotjs loaded successfully')
} catch (error) {
  console.warn('⚠️  robotjs not available, checking platform-specific alternatives...')

  if (process.platform === 'darwin') {
    pasteMethod = 'applescript'
    console.log('✅ Using AppleScript for paste on macOS')
  } else {
    console.warn('⚠️  Using clipboard-only mode (manual paste required)')
  }
}

/**
 * TranscriptionService
 *
 * Manages the universal transcription feature:
 * - Registers global shortcut (Cmd+Shift+F)
 * - Shows/hides overlay window
 * - Inserts transcribed text into active application
 *
 * The actual audio capture and Soniox API communication is handled
 * by the overlay window using @soniox/speech-to-text-web SDK.
 */
export class TranscriptionService {
  private overlayWindow: BrowserWindow | null = null
  private isActive = false
  private shortcut = process.platform === 'darwin' ? 'Command+Shift+F' : 'Control+Shift+F'
  private enabled = false
  private previousFocusedWindow: BrowserWindow | null = null

  constructor() {
    console.log('🎙️ Initializing TranscriptionService')
    this.setupIpcHandlers()
  }

  async initialize(): Promise<boolean> {
    try {
      // Register global shortcut
      const registered = globalShortcut.register(this.shortcut, () => {
        this.toggleTranscription()
      })

      if (!registered) {
        console.error('❌ Failed to register transcription shortcut:', this.shortcut)
        return false
      }

      console.log(`✅ Transcription shortcut registered: ${this.shortcut}`)
      this.enabled = true
      return true
    } catch (error) {
      console.error('❌ Failed to initialize transcription service:', error)
      return false
    }
  }

  private setupIpcHandlers() {
    // Handle text insertion requests from overlay
    ipcMain.on('transcription:insert-text', (_event, text: string) => {
      console.log('💉 Inserting text:', text)
      this.insertText(text).catch((error) => {
        console.error('❌ Failed to insert text:', error)
      })
    })

    // Handle manual stop from overlay UI
    ipcMain.on('transcription:stop-manual', () => {
      console.log('🛑 Manual stop requested from overlay')
      this.hideOverlay()
    })

    // Handle status requests (for test page)
    ipcMain.handle('transcription:get-status', () => {
      console.log('📊 Status requested from test page')
      return {
        status: this.isActive ? 'recording' : 'idle',
        isRecording: this.isActive,
        hasApiKey: true, // API key is in the renderer for SDK
        text: '' // SDK manages text in renderer
      }
    })
  }

  private toggleTranscription() {
    console.log('🎛️  Toggle transcription, current state:', this.isActive)

    if (this.isActive) {
      this.stopTranscription()
    } else {
      this.startTranscription()
    }
  }

  private async startTranscription() {
    try {
      console.log('▶️  Starting transcription...')
      this.isActive = true

      await this.showOverlay()

      console.log('✅ Transcription started')
    } catch (error) {
      console.error('❌ Error starting transcription:', error)
      this.isActive = false
      this.hideOverlay()
    }
  }

  private async stopTranscription() {
    try {
      console.log('⏹️  Stopping transcription...')

      // Send stop signal to overlay (which will stop Soniox)
      if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
        this.overlayWindow.webContents.send('transcription:stop')
      }

      // Hide overlay after a short delay to show final status
      setTimeout(() => {
        this.hideOverlay()
      }, 1000)

      this.isActive = false
      console.log('✅ Transcription stopped')
    } catch (error) {
      console.error('❌ Error stopping transcription:', error)
      this.hideOverlay()
      this.isActive = false
    }
  }

  private async showOverlay() {
    this.previousFocusedWindow = BrowserWindow.getFocusedWindow() ?? null

    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.showInactive()

      if (this.previousFocusedWindow && !this.previousFocusedWindow.isDestroyed()) {
        setTimeout(() => {
          try {
            const previousUrl = this.previousFocusedWindow?.webContents.getURL()
            if (!previousUrl || !previousUrl.includes('#palette')) {
              this.previousFocusedWindow?.focus()
            }
          } catch {
            /* swallow */
          }
        }, 20)
      }

      // Send start signal to begin transcription
      this.overlayWindow.webContents.send('transcription:start')
      return
    }

    // Get cursor position to position overlay nearby
    const cursorPoint = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursorPoint)

    // Create overlay window
    this.overlayWindow = new BrowserWindow({
      width: 320,
      height: 140,
      x: Math.min(cursorPoint.x + 20, display.bounds.x + display.bounds.width - 340),
      y: Math.min(cursorPoint.y + 20, display.bounds.y + display.bounds.height - 160),
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
      // Critical: Set these properties for proper overlay behavior over fullscreen
      type: process.platform === 'darwin' ? 'panel' : undefined,
      hasShadow: process.platform !== 'darwin',
      vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: join(__dirname, '../preload/index.mjs'),
        backgroundThrottling: false
      }
    })

    // Platform-specific configuration for proper overlay behavior over fullscreen apps
    if (process.platform === 'darwin') {
      // macOS: Set proper window level for appearing over full screen apps
      this.overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      this.overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1) // Higher level for full screen compatibility
    } else {
      // Windows/Linux: Set always on top
      this.overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      this.overlayWindow.setAlwaysOnTop(true, 'screen-saver')
    }

    // CRITICAL: Grant microphone permission for the overlay window
    this.overlayWindow.webContents.session.setPermissionRequestHandler(
      (_webContents, permission, callback) => {
        console.log(`🎤 Permission requested: ${permission}`)
        if (permission === 'media') {
          console.log('   ✅ Granting media (microphone) permission')
          callback(true) // Grant permission
        } else {
          callback(false)
        }
      }
    )

    // Load the overlay page
    if (app.isPackaged) {
      this.overlayWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: 'transcription-overlay'
      })
    } else {
      const rendererUrl = process.env['ELECTRON_RENDERER_URL']
      if (rendererUrl) {
        this.overlayWindow.loadURL(`${rendererUrl}#transcription-overlay`)
      }
    }

    this.overlayWindow.once('ready-to-show', () => {
      if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return
      this.overlayWindow.showInactive()

      if (this.previousFocusedWindow && !this.previousFocusedWindow.isDestroyed()) {
        setTimeout(() => {
          try {
            const previousUrl = this.previousFocusedWindow?.webContents.getURL()
            if (!previousUrl || !previousUrl.includes('#palette')) {
              this.previousFocusedWindow?.focus()
            }
          } catch {
            /* swallow */
          }
        }, 20)
      }
    })

    // Wait for page to load, then send start signal
    this.overlayWindow.webContents.once('did-finish-load', () => {
      console.log('✅ Overlay loaded, sending start signal')
      this.overlayWindow?.webContents.send('transcription:start')
    })

    // Handle window close
    this.overlayWindow.on('closed', () => {
      console.log('🪟 Overlay window closed')
      this.overlayWindow = null
      this.isActive = false
    })

    // Handle blur (lost focus) - optionally close overlay
    this.overlayWindow.on('blur', () => {
      // Keep overlay visible even when focus is lost
      // so user can see transcription status
    })

    console.log('✅ Overlay window created and shown')
  }

  private hideOverlay() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      console.log('👋 Hiding overlay window')
      this.overlayWindow.close()
      this.overlayWindow = null
    }
    this.isActive = false
    this.previousFocusedWindow = null
  }

  private async focusOriginalTarget() {
    try {
      // Hide any palette windows so focus returns to the previous application
      for (const window of BrowserWindow.getAllWindows()) {
        if (window.isDestroyed()) continue
        if (window === this.overlayWindow) continue

        const url = window.webContents.getURL()
        if (url.includes('#palette')) {
          try {
            window.webContents.send('overlay:hide')
          } catch (error) {
            console.warn('⚠️ Failed to notify palette window to hide:', error)
          }

          try {
            window.hide()
          } catch (error) {
            console.warn('⚠️ Failed to hide palette window:', error)
          }
        }
      }

      if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
        this.overlayWindow.blur()
      }

      if (this.previousFocusedWindow && !this.previousFocusedWindow.isDestroyed()) {
        try {
          const previousUrl = this.previousFocusedWindow.webContents.getURL()
          if (!previousUrl.includes('#palette')) {
            this.previousFocusedWindow.focus()
          }
        } catch {
          // Ignore errors when focusing previous window (may belong to another app)
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 120))
    } catch (error) {
      console.warn('⚠️ Unable to restore original focus before paste:', error)
    }
  }

  private async insertText(text: string): Promise<void> {
    console.log('💉 ========== INSERTING TEXT ==========')
    console.log('   Text to insert:', text)
    console.log('   Paste method:', pasteMethod)

    try {
      await this.focusOriginalTarget()

      // Save current clipboard
      const previousClipboard = clipboard.readText()
      console.log('   Saved clipboard')

      // Write text to clipboard
      clipboard.writeText(text)
      console.log('   Text written to clipboard')

      // Small delay to ensure clipboard is ready
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Try to paste using the best available method
      if (pasteMethod === 'robotjs' && robot) {
        try {
          console.log('   Attempting paste with robotjs...')
          if (process.platform === 'darwin') {
            robot.keyTap('v', ['command'])
            console.log('   ✅ Executed Cmd+V via robotjs')
          } else {
            robot.keyTap('v', ['control'])
            console.log('   ✅ Executed Ctrl+V via robotjs')
          }
        } catch (robotError) {
          console.error('   ❌ robotjs paste failed:', robotError)
        }
      } else if (pasteMethod === 'applescript' && process.platform === 'darwin') {
        try {
          console.log('   Attempting paste with AppleScript...')
          await execAsync(
            'osascript -e \'tell application "System Events" to keystroke "v" using {command down}\'',
            { timeout: 2000 }
          )
          console.log('   ✅ Executed Cmd+V via AppleScript')
        } catch (appleScriptError) {
          console.error('   ❌ AppleScript paste failed:', appleScriptError)
        }
      } else if (process.platform === 'win32') {
        try {
          console.log('   Attempting paste with PowerShell...')
          await execAsync(
            'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"',
            { timeout: 2000 }
          )
          console.log('   ✅ Executed Ctrl+V via PowerShell')
        } catch (psError) {
          console.error('   ❌ PowerShell paste failed:', psError)
        }
      } else if (process.platform === 'linux') {
        try {
          console.log('   Attempting paste with xdotool...')
          await execAsync('xdotool key --delay 50 ctrl+v', { timeout: 2000 })
          console.log('   ✅ Executed Ctrl+V via xdotool')
        } catch (xdotoolError) {
          console.error('   ❌ xdotool paste failed:', xdotoolError)
        }
      } else {
        console.log('   ⚠️  No keyboard automation available, text left in clipboard')
      }

      // Wait a bit before restoring clipboard
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Restore previous clipboard
      if (previousClipboard !== text) {
        clipboard.writeText(previousClipboard)
        console.log('   Restored previous clipboard')
      }
    } catch (error) {
      console.error('   ❌ Failed to insert text:', error)
      throw error
    }

    console.log('======================================')
  }

  isEnabled(): boolean {
    return this.enabled
  }

  async dispose() {
    console.log('🧹 Disposing TranscriptionService')

    // Unregister shortcut
    if (this.enabled) {
      globalShortcut.unregister(this.shortcut)
      console.log('   Unregistered shortcut')
    }

    // Close overlay
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close()
      this.overlayWindow = null
    }

    console.log('✅ TranscriptionService disposed')
  }
}
