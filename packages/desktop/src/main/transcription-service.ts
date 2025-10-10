import { app, BrowserWindow, ipcMain, clipboard, globalShortcut, screen } from 'electron'
import { join } from 'path'
import WebSocket from 'ws'

// Try to load robotjs, but handle gracefully if it fails
let robot: any = null
try {
  robot = require('robotjs')
  // Configure robotjs for faster operation
  robot.setKeyboardDelay(0)
} catch (error) {
  console.warn('⚠️  robotjs not available, using clipboard-only mode:', error)
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

type TranscriptionStatus = 'idle' | 'connecting' | 'recording' | 'processing' | 'error'

interface TranscriptionToken {
  text: string
  is_final: boolean
}

interface TranscriptionResponse {
  tokens?: TranscriptionToken[]
  error?: string
}

export class TranscriptionService {
  private ws: WebSocket | null = null
  private audioWindow: BrowserWindow | null = null
  private overlayWindow: BrowserWindow | null = null
  private status: TranscriptionStatus = 'idle'
  private apiKey: string | null = null
  private accumulatedText: string = ''
  private isRecording: boolean = false
  private shortcutRegistered: boolean = false
  private shortcut = process.platform === 'darwin' ? 'Command+Shift+F' : 'Control+Shift+F'
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 3
  private reconnectTimeout: NodeJS.Timeout | null = null

  constructor() {
    // Get API key from environment
    this.apiKey = process.env.VITE_SONIOX_API_KEY || null
    console.log('🔑 TranscriptionService constructor:')
    console.log(
      '   process.env.VITE_SONIOX_API_KEY:',
      this.apiKey ? `${this.apiKey.substring(0, 10)}... (${this.apiKey.length} chars)` : 'NOT SET'
    )
    console.log('   API key available:', !!this.apiKey)
    this.setupIpcHandlers()
  }

  async initialize(): Promise<boolean> {
    console.log('🎙️  Initializing transcription service...')
    console.log('   API key present:', !!this.apiKey)

    if (!this.apiKey) {
      console.warn('⚠️  Soniox API key not configured - transcription feature disabled')
      console.warn('   Make sure VITE_SONIOX_API_KEY is set in packages/desktop/.env')
      return false
    }

    console.log('✅ API key found, length:', this.apiKey.length)

    // Register global shortcut
    const registered = this.registerShortcut()
    if (!registered) {
      console.error('❌ Failed to register transcription shortcut')
      return false
    }

    console.log('✅ Transcription service initialized')
    return true
  }

  private setupIpcHandlers() {
    // Handle audio chunks from renderer
    ipcMain.on('transcription:audio-chunk', (_event, audioData: ArrayBuffer) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isRecording) {
        try {
          this.ws.send(Buffer.from(audioData))
        } catch (error) {
          console.error('Failed to send audio chunk:', error)
        }
      }
    })

    // Handle manual stop from overlay
    ipcMain.on('transcription:stop-manual', () => {
      this.stopTranscription()
    })

    // Get current status
    ipcMain.handle('transcription:get-status', () => {
      console.log('📊 Status requested from renderer')
      const statusData = {
        status: this.status,
        isRecording: this.isRecording,
        hasApiKey: !!this.apiKey,
        text: this.accumulatedText
      }
      console.log('   Returning:', statusData)
      return statusData
    })
  }

  private registerShortcut(): boolean {
    try {
      const success = globalShortcut.register(this.shortcut, () => {
        this.toggleTranscription()
      })

      if (success) {
        this.shortcutRegistered = true
        console.log(`✅ Registered transcription shortcut: ${this.shortcut}`)
      } else {
        console.error(`❌ Failed to register shortcut: ${this.shortcut}`)
      }

      return success
    } catch (error) {
      console.error('Error registering transcription shortcut:', error)
      return false
    }
  }

  private unregisterShortcut() {
    if (this.shortcutRegistered) {
      globalShortcut.unregister(this.shortcut)
      this.shortcutRegistered = false
      console.log(`🔓 Unregistered transcription shortcut: ${this.shortcut}`)
    }
  }

  private async toggleTranscription() {
    console.log(
      '🎛️  Toggle transcription called, current state:',
      this.isRecording ? 'recording' : 'idle'
    )
    if (this.isRecording) {
      await this.stopTranscription()
    } else {
      await this.startTranscription()
    }
  }

  private async startTranscription() {
    if (this.isRecording || !this.apiKey) {
      return
    }

    console.log('🎙️  Starting transcription...')
    this.isRecording = true
    this.accumulatedText = ''
    this.status = 'connecting'
    this.reconnectAttempts = 0

    try {
      // Create or show overlay window
      await this.showOverlay()

      // Create audio capture window if needed
      await this.ensureAudioWindow()

      // Connect to Soniox WebSocket
      await this.connectWebSocket()

      // Start audio capture
      this.audioWindow?.webContents.send('transcription:start')

      this.status = 'recording'
      this.updateOverlay()

      console.log('✅ Transcription started')
    } catch (error) {
      console.error('Failed to start transcription:', error)
      this.status = 'error'
      this.updateOverlay()
      await this.cleanup()
    }
  }

  private async stopTranscription() {
    if (!this.isRecording) {
      return
    }

    console.log('🛑 Stopping transcription...')
    this.isRecording = false
    this.status = 'processing'
    this.updateOverlay()

    try {
      // Send finalize message to get remaining tokens
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'finalize' }))
        // Wait a moment for final tokens
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Insert accumulated text
      if (this.accumulatedText.trim()) {
        await this.insertText(this.accumulatedText)
      }

      // Cleanup
      await this.cleanup()

      console.log('✅ Transcription stopped, text inserted')
    } catch (error) {
      console.error('Error stopping transcription:', error)
      this.status = 'error'
      this.updateOverlay()
      await this.cleanup()
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.apiKey) {
        console.error('❌ Cannot connect: API key not configured')
        reject(new Error('API key not configured'))
        return
      }

      console.log('🔌 Connecting to Soniox WebSocket...')
      console.log('   API Key (first 10 chars):', this.apiKey.substring(0, 10) + '...')

      const wsUrl = `wss://api.soniox.com/transcribe-websocket?api_key=${this.apiKey}`

      try {
        this.ws = new WebSocket(wsUrl)
        console.log('   WebSocket object created')

        this.ws.on('open', () => {
          console.log('✅ WebSocket connected to Soniox successfully!')
          resolve()
        })

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const dataStr = data.toString()
            console.log('📨 Received message from Soniox:', dataStr.substring(0, 100))

            const response: TranscriptionResponse = JSON.parse(dataStr)

            if (response.error) {
              console.error('❌ Soniox error:', response.error)
              this.status = 'error'
              this.updateOverlay()
              return
            }

            if (response.tokens) {
              console.log(`📝 Received ${response.tokens.length} tokens`)
              this.processTokens(response.tokens)
            }
          } catch (error) {
            console.error('❌ Error processing transcription message:', error)
          }
        })

        this.ws.on('error', (error) => {
          console.error('❌ WebSocket error:', error)
          console.error('   Error details:', JSON.stringify(error, null, 2))
          this.status = 'error'
          this.updateOverlay()
          reject(error)
        })

        this.ws.on('close', (code, reason) => {
          console.log('🔌 WebSocket closed')
          console.log('   Close code:', code)
          console.log('   Close reason:', reason.toString())

          if (this.isRecording && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect()
          }
        })
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        reject(error)
      }
    })
  }

  private attemptReconnect() {
    this.reconnectAttempts++
    console.log(
      `🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`
    )

    this.reconnectTimeout = setTimeout(
      async () => {
        if (this.isRecording) {
          try {
            await this.connectWebSocket()
            console.log('✅ Reconnected successfully')
            this.reconnectAttempts = 0
          } catch (error) {
            console.error('Reconnection failed:', error)
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              this.status = 'error'
              this.updateOverlay()
              await this.stopTranscription()
            }
          }
        }
      },
      Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)
    )
  }

  private processTokens(tokens: TranscriptionToken[]) {
    for (const token of tokens) {
      // Only process final tokens for insertion
      if (token.is_final) {
        this.accumulatedText += token.text

        // Insert the token immediately for streaming effect
        if (token.text.trim()) {
          this.insertText(token.text).catch((error) => {
            console.error('Failed to insert text:', error)
          })
        }
      }

      // Send all tokens to overlay for preview (including non-final)
      this.overlayWindow?.webContents.send('transcription:token', {
        text: token.text,
        isFinal: token.is_final,
        accumulated: this.accumulatedText
      })
    }
  }

  private async insertText(text: string): Promise<void> {
    try {
      // Store current clipboard content
      const previousClipboard = clipboard.readText()

      // Write text to clipboard
      clipboard.writeText(text)

      // Small delay to ensure clipboard is updated
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Simulate Cmd+V or Ctrl+V based on platform
      if (robot) {
        try {
          if (process.platform === 'darwin') {
            robot.keyTap('v', ['command'])
          } else {
            robot.keyTap('v', ['control'])
          }
        } catch (robotError) {
          console.error('robotjs paste failed:', robotError)
          // Continue to clipboard restoration
        }
      } else {
        // No robotjs available - text stays in clipboard
        console.log('No keyboard automation available, text left in clipboard')
      }

      // Wait a bit before restoring clipboard
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Restore previous clipboard content only if robotjs worked
      if (robot) {
        clipboard.writeText(previousClipboard)
      }
    } catch (error) {
      console.error('Error inserting text:', error)
      // Fallback: leave text in clipboard for manual paste
      console.log('Text left in clipboard for manual paste')
    }
  }

  private async ensureAudioWindow() {
    if (this.audioWindow && !this.audioWindow.isDestroyed()) {
      console.log('🔊 Audio window already exists')
      return
    }

    console.log('🔊 Creating audio capture window...')

    this.audioWindow = new BrowserWindow({
      width: 1,
      height: 1,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    // Load the audio capture page
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      await this.audioWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#audio-capture`)
    } else {
      await this.audioWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: 'audio-capture'
      })
    }

    this.audioWindow.on('closed', () => {
      this.audioWindow = null
    })
  }

  private async showOverlay() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.show()
      this.overlayWindow.focus()
      return
    }

    console.log('📱 Creating transcription overlay...')

    // Get cursor position
    const cursorPoint = screen.getCursorScreenPoint()
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint)
    const { width, height } = currentDisplay.bounds
    const { x: displayX, y: displayY } = currentDisplay.bounds

    const windowWidth = 300
    const windowHeight = 100

    // Position near cursor, slightly below
    const x = Math.max(
      displayX,
      Math.min(cursorPoint.x - windowWidth / 2, displayX + width - windowWidth)
    )
    const y = Math.max(displayY, Math.min(cursorPoint.y + 20, displayY + height - windowHeight))

    this.overlayWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x,
      y,
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
      type: process.platform === 'darwin' ? 'panel' : undefined,
      hasShadow: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    })

    // Platform-specific window level
    if (process.platform === 'darwin') {
      this.overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      this.overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1)
    } else {
      this.overlayWindow.setAlwaysOnTop(true, 'screen-saver')
    }

    // Handle Escape key to stop
    this.overlayWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'Escape' && input.type === 'keyDown') {
        event.preventDefault()
        this.stopTranscription()
      }
    })

    // Load overlay page
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      await this.overlayWindow.loadURL(
        `${process.env['ELECTRON_RENDERER_URL']}#transcription-overlay`
      )
    } else {
      await this.overlayWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: 'transcription-overlay'
      })
    }

    this.overlayWindow.once('ready-to-show', () => {
      this.overlayWindow?.show()
      this.overlayWindow?.focus()
    })

    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null
    })
  }

  private hideOverlay() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close()
      this.overlayWindow = null
    }
  }

  private updateOverlay() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.webContents.send('transcription:status', {
        status: this.status,
        isRecording: this.isRecording,
        text: this.accumulatedText
      })
    }
  }

  private async cleanup() {
    // Stop audio capture
    if (this.audioWindow && !this.audioWindow.isDestroyed()) {
      this.audioWindow.webContents.send('transcription:stop')
    }

    // Close WebSocket
    if (this.ws) {
      try {
        this.ws.close()
      } catch (error) {
        console.error('Error closing WebSocket:', error)
      }
      this.ws = null
    }

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Hide overlay after a short delay
    setTimeout(() => {
      this.hideOverlay()
    }, 1000)

    // Reset state
    this.status = 'idle'
    this.isRecording = false
    this.reconnectAttempts = 0
  }

  getStatus() {
    return {
      status: this.status,
      isRecording: this.isRecording,
      hasApiKey: !!this.apiKey
    }
  }

  isEnabled(): boolean {
    return !!this.apiKey && this.shortcutRegistered
  }

  dispose() {
    console.log('🧹 Disposing transcription service...')

    // Stop any active transcription
    if (this.isRecording) {
      this.stopTranscription()
    }

    // Unregister shortcut
    this.unregisterShortcut()

    // Close windows
    if (this.audioWindow && !this.audioWindow.isDestroyed()) {
      this.audioWindow.close()
      this.audioWindow = null
    }

    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close()
      this.overlayWindow = null
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Remove IPC handlers
    ipcMain.removeHandler('transcription:get-status')

    console.log('✅ Transcription service disposed')
  }
}
