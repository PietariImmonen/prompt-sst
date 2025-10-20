import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard } from 'electron'
import { exec } from 'child_process'
import { join } from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

let robot: any = null
let pasteMethod: 'applescript' | 'clipboard-only' = 'clipboard-only'

try {
  pasteMethod = 'applescript'
  console.log('✅ AppleScript loaded successfully')
} catch (error) {
  console.warn('⚠️  AppleScript not available, checking platform-specific alternatives...')

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
  private shortcut: string
  private enabled = false
  private previousFocusedWindow: BrowserWindow | null = null
  private apiEndpoint: string | null = null
  private authToken: string | null = null
  private workspaceId: string | null = null
  private languageHints: string[] = ['en']

  constructor(initialShortcut?: string) {
    this.shortcut = initialShortcut || (process.platform === 'darwin' ? 'Command+Shift+F' : 'Control+Shift+F')
    console.log('🎙️ Initializing TranscriptionService with shortcut:', this.shortcut)
    this.setupIpcHandlers()
  }

  private broadcastState(
    payload:
      | { state: 'started' | 'stopped' | 'cancelled' }
      | { state: 'completed'; text: string }
      | { state: 'failed'; message: string }
  ) {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window || window.isDestroyed()) continue
      if (this.overlayWindow && window.id === this.overlayWindow.id) continue

      try {
        window.webContents.send('transcription:state-changed', payload)
      } catch (error) {
        console.warn('⚠️ Failed to broadcast transcription state:', error)
      }
    }
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
    ipcMain.on('transcription:insert-text', async (_event, text: string) => {
      console.log('💉 Inserting text:', text)
      try {
        await this.insertText(text)
        console.log('✅ Text insertion complete')
        // Close overlay immediately after insertion
        this.hideOverlay()
        this.broadcastState({ state: 'completed', text })
      } catch (error) {
        console.error('❌ Failed to insert text:', error)
        // Still close overlay even on error
        this.hideOverlay()
        this.broadcastState({
          state: 'failed',
          message: error instanceof Error ? error.message : 'Failed to insert transcribed text'
        })
      }
    })

    // Handle manual stop from overlay UI (without text insertion)
    ipcMain.on('transcription:stop-manual', () => {
      console.log('🛑 Manual stop requested from overlay (no text)')
      this.hideOverlay()
      this.broadcastState({ state: 'cancelled' })
    })

    // Handle improvement request from overlay
    ipcMain.on('transcription:improve', async (_event, text: string) => {
      console.log('✨ Improvement requested for text:', text.substring(0, 50))
      try {
        await this.improveText(text)
      } catch (error) {
        console.error('❌ Failed to improve text:', error)
        this.overlayWindow?.webContents.send(
          'transcription:improve-error',
          error instanceof Error ? error.message : 'Failed to improve text'
        )
      }
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

    // Handle language hints updates from renderer
    ipcMain.on('transcription:update-language-hints', (_event, languageHints: string[]) => {
      if (Array.isArray(languageHints) && languageHints.length > 0) {
        this.languageHints = languageHints
        console.log('🌐 Updated language hints:', this.languageHints)
      }
    })
  }

  private toggleTranscription() {
    console.log('🎛️  Toggle transcription, current state:', this.isActive)

    // Block if user is not logged in
    if (!this.authToken) {
      console.log('⚠️  Transcription blocked: User not logged in')
      // Optionally show a notification to the user
      return
    }

    if (this.isActive) {
      this.stopTranscription()
    } else {
      this.startTranscription()
    }
  }

  public async startTranscription() {
    try {
      console.log('▶️  Starting transcription...')
      this.isActive = true

      await this.showOverlay()

      console.log('✅ Transcription started')
      this.broadcastState({ state: 'started' })
    } catch (error) {
      console.error('❌ Error starting transcription:', error)
      this.isActive = false
      this.hideOverlay()
      this.broadcastState({
        state: 'failed',
        message: error instanceof Error ? error.message : 'Failed to start transcription'
      })
    }
  }

  private async stopTranscription() {
    try {
      console.log('⏹️  Stopping transcription...')

      // Send stop signal to overlay (which will stop Soniox)
      if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
        this.overlayWindow.webContents.send('transcription:stop')
      }

      // Don't hide overlay here - it will close after text insertion
      // or after manual stop if no text

      this.isActive = false
      console.log('✅ Transcription stopped')
      this.broadcastState({ state: 'stopped' })
    } catch (error) {
      console.error('❌ Error stopping transcription:', error)
      this.hideOverlay()
      this.isActive = false
      this.broadcastState({
        state: 'failed',
        message: error instanceof Error ? error.message : 'Failed to stop transcription'
      })
    }
  }

  private async showOverlay() {
    this.previousFocusedWindow = BrowserWindow.getFocusedWindow() ?? null

    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      // macOS: Ensure dock icon stays visible
      if (process.platform === 'darwin') {
        app.dock.show().catch(() => {
          // Ignore errors if dock is already visible
        })
      }

      // Show and focus the overlay so keyboard events work
      this.overlayWindow.show()
      this.overlayWindow.focus()

      // Send start signal with language hints to begin transcription
      this.overlayWindow.webContents.send('transcription:start', {
        languageHints: this.languageHints
      })
      return
    }

    // Get cursor position to position overlay nearby
    const cursorPoint = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursorPoint)

    // Create overlay window
    this.overlayWindow = new BrowserWindow({
      width: 480,
      height: 240,
      x: Math.min(cursorPoint.x + 20, display.bounds.x + display.bounds.width - 520),
      y: Math.min(cursorPoint.y + 20, display.bounds.y + display.bounds.height - 280),
      show: false, // Don't show immediately - will show without activation
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

      // macOS: Ensure dock icon stays visible
      if (process.platform === 'darwin') {
        app.dock.show().catch(() => {
          // Ignore errors if dock is already visible
        })
      }

      // Show and focus the overlay so keyboard events work
      this.overlayWindow.show()
      this.overlayWindow.focus()
    })

    // Wait for page to load, then send start signal with language hints
    this.overlayWindow.webContents.once('did-finish-load', () => {
      console.log('✅ Overlay loaded, sending start signal with language hints:', this.languageHints)
      this.overlayWindow?.webContents.send('transcription:start', {
        languageHints: this.languageHints
      })
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
      console.log('🎯 Focusing original target...')

      // Hide the overlay window first
      if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
        this.overlayWindow.hide()
        console.log('   Hidden overlay window')
      }

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

      // If previousFocusedWindow is an Electron window, focus it
      if (this.previousFocusedWindow && !this.previousFocusedWindow.isDestroyed()) {
        try {
          const previousUrl = this.previousFocusedWindow.webContents.getURL()
          if (!previousUrl.includes('#palette')) {
            this.previousFocusedWindow.focus()
            console.log('   Focused Electron window')
          }
        } catch {
          // Ignore errors when focusing previous window
        }
      } else {
        // No Electron window to focus - we're pasting to an external app
        // The paste will go to whatever window is active after hiding overlay
        console.log('   No Electron window to focus - pasting to system active window')
      }

      // Wait for focus to settle
      await new Promise((resolve) => setTimeout(resolve, 150))
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
      if (pasteMethod === 'applescript' && process.platform === 'darwin') {
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

      // Wait longer to ensure paste completes in the target app
      await new Promise((resolve) => setTimeout(resolve, 300))

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

  /**
   * Set authentication details for API calls
   */
  setAuth(authData: {
    token: string | null
    apiEndpoint: string | null
    workspaceId: string | null
  }) {
    console.log('🔐 Setting auth for transcription service')
    this.authToken = authData.token
    this.apiEndpoint = authData.apiEndpoint
    this.workspaceId = authData.workspaceId
  }

  /**
   * Update the keyboard shortcut for transcription
   * Returns true if successful, false if failed
   */
  updateShortcut(newShortcut: string): boolean {
    try {
      // Unregister the old shortcut if enabled
      if (this.enabled) {
        globalShortcut.unregister(this.shortcut)
        console.log(`🎙️ Unregistered old transcription shortcut: ${this.shortcut}`)
      }

      // Update the shortcut value
      this.shortcut = newShortcut

      // Register the new shortcut if we were previously enabled
      if (this.enabled) {
        const registered = globalShortcut.register(this.shortcut, () => {
          this.toggleTranscription()
        })

        if (!registered) {
          console.error(`❌ Failed to register new transcription shortcut: ${this.shortcut}`)
          return false
        }

        console.log(`✅ Registered new transcription shortcut: ${this.shortcut}`)
      }

      return true
    } catch (error) {
      console.error('❌ Error updating transcription shortcut:', error)
      return false
    }
  }

  /**
   * Improve transcribed text using LLM API
   */
  private async improveText(text: string): Promise<void> {
    if (!this.apiEndpoint || !this.authToken || !this.workspaceId) {
      throw new Error('Cannot improve text: missing API endpoint, auth token, or workspace ID')
    }

    try {
      const response = await fetch(`${this.apiEndpoint}prompt/improve-from-transcription`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          'x-prompt-saver-workspace': this.workspaceId
        },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = (await response.json()) as {
        improvedText?: string
        promptID?: string
        error?: string
      }

      if (result.error) {
        throw new Error(result.error)
      }

      // Send the improved text directly to overlay
      if (result.improvedText) {
        this.overlayWindow?.webContents.send('transcription:improve-complete', result.improvedText)
        console.log('✅ Text improvement complete')
      } else {
        throw new Error('No improved text in response')
      }
    } catch (error) {
      console.error('❌ Error improving text:', error)
      throw error
    }
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
