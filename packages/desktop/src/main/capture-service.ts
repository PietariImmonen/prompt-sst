import {
  BrowserWindow,
  Notification,
  clipboard,
  globalShortcut,
  ipcMain,
  shell,
  screen
} from 'electron'
import { execSync } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

// Import native modules for global keyboard capture and text injection
let iohook: any = null
let robot: any = null

// Temporarily suppress console.error to prevent verbose iohook errors
const originalConsoleError = console.error
console.error = (...args: any[]) => {
  const message = args.join(' ')
  if (message.includes('iohook') || message.includes('Cannot find module')) {
    // Suppress iohook-related errors
    return
  }
  originalConsoleError.apply(console, args)
}

try {
  iohook = require('iohook')
  console.log('iohook loaded successfully')
} catch (error) {
  console.warn('Failed to load iohook (global keyboard capture will be disabled)')
} finally {
  // Restore original console.error
  console.error = originalConsoleError
}

try {
  robot = require('robotjs')
  console.log('robotjs loaded successfully')
} catch (error) {
  console.warn('Failed to load robotjs (text injection will use clipboard fallback)')
}

const captureAccelerator = process.platform === 'darwin' ? 'Command+Shift+P' : 'Control+Shift+P'
const paletteAccelerator = process.platform === 'darwin' ? 'Command+Shift+O' : 'Control+Shift+O'

type PromptSource = 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'other'

type CaptureStatus = 'idle' | 'listening' | 'capturing' | 'success' | 'failed'

interface PromptCapturePayload {
  content: string
  title: string
  source: PromptSource
  categoryPath: string
  visibility: 'private' | 'workspace'
  isFavorite: boolean
  metadata?: Record<string, string | number | boolean | null>
}

interface CaptureResult {
  success: boolean
  message?: string
}

type WindowGetter = () => BrowserWindow | null

function resolveSource(url?: string): PromptSource {
  if (!url) return 'other'
  try {
    const hostname = new URL(url).hostname
    if (hostname.includes('chat.openai.com')) return 'chatgpt'
    if (hostname.includes('claude.ai')) return 'claude'
    if (hostname.includes('gemini.google.com')) return 'gemini'
    if (hostname.includes('x.ai')) return 'grok'
  } catch {
    // ignore parse failures and fall back to other
  }
  return 'other'
}

function deriveTitle(content: string, bookmarkTitle?: string): string {
  if (bookmarkTitle && bookmarkTitle.trim().length > 0) {
    return bookmarkTitle.trim().slice(0, 200)
  }
  const firstLine = content.split(/\r?\n/)[0]?.trim() ?? content.trim()
  return firstLine.slice(0, 200) || 'Untitled prompt'
}

function safeReadBookmark() {
  try {
    return clipboard.readBookmark()
  } catch {
    return { title: undefined, url: undefined }
  }
}

type HighlightMethod = 'selection' | 'clipboard'

async function readHighlightedText(): Promise<{
  content: string
  bookmark: ReturnType<typeof safeReadBookmark>
  method: HighlightMethod
}> {
  // Attempt to read the raw highlighted selection first; this does not mutate clipboard
  const selectionClipboard = clipboard.readText('selection').trim()
  if (selectionClipboard) {
    return {
      content: selectionClipboard,
      bookmark: safeReadBookmark(),
      method: 'selection'
    }
  }

  // Fallback to the standard clipboard contents, preserving user data
  const previousText = clipboard.readText()
  const previousBookmark = safeReadBookmark()

  let invokedCopy = false
  try {
    if (process.platform === 'darwin') {
      execSync(
        'osascript -e \'tell application "System Events" to keystroke "c" using {command down}\'',
        { stdio: 'ignore' }
      )
      invokedCopy = true
    } else if (process.platform === 'win32') {
      execSync(
        'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\"^c\")"',
        { stdio: 'ignore' }
      )
      invokedCopy = true
    }
  } catch {
    // Unable to invoke copy programmatically; rely on existing clipboard contents
  }

  if (invokedCopy) {
    await delay(120)
  }

  const copiedText = clipboard.readText().trim()
  const copiedBookmark = safeReadBookmark()

  // Restore clipboard for user courtesy
  if (previousText) {
    clipboard.writeText(previousText)
  }
  if (previousBookmark.url || previousBookmark.title) {
    clipboard.writeBookmark(previousBookmark.title ?? '', previousBookmark.url ?? '')
  }

  return {
    content: copiedText,
    bookmark: copiedBookmark,
    method: 'clipboard'
  }
}

function pushStatus(window: BrowserWindow | null, status: CaptureStatus, message?: string) {
  window?.webContents.send('prompt:capture:status', { status, message })
}

function notifySystem(result: CaptureResult) {
  if (Notification.isSupported()) {
    const title = result.success ? 'Prompt captured' : 'Prompt not saved'
    const body =
      result.message ??
      (result.success
        ? 'Your selection has been synced to the workspace.'
        : 'Highlight some text before capturing.')
    new Notification({ title, body }).show()
  }

  if (result.success) {
    shell.beep()
  }
}

export function createCaptureService(getWindow: WindowGetter) {
  let captureListening = false
  let paletteListening = false
  let paletteWindow: BrowserWindow | null = null

  // Global keyboard capture state
  let overlayVisible = false
  let searchBuffer = ''
  let selectedPromptText = ''
  let iohookStarted = false
  let useGlobalCapture = !!iohook // Determine if we can use global keyboard capture

  function startGlobalKeyboardCapture() {
    if (!iohook || iohookStarted) {
      if (!iohook) {
        console.warn('Global keyboard capture not available - native modules not loaded')
        useGlobalCapture = false
      }
      return
    }

    console.log('Starting global keyboard capture')

    try {
      iohook.on('keydown', (event: any) => {
        if (!overlayVisible) return

        try {
          // Handle special keys
          if (event.rawcode === 27) {
            // Escape
            hideOverlay()
            return
          }

          if (event.rawcode === 13) {
            // Enter
            submitSelectedPrompt()
            return
          }

          if (event.rawcode === 8) {
            // Backspace
            searchBuffer = searchBuffer.slice(0, -1)
            updateOverlaySearch()
            return
          }

          // Handle regular characters
          if (event.keychar && event.keychar > 0) {
            const char = String.fromCharCode(event.keychar)
            if (char.match(/[a-zA-Z0-9\s]/)) {
              // Only allow alphanumeric and space
              searchBuffer += char
              updateOverlaySearch()
            }
          }
        } catch (error) {
          console.error('Error in global keyboard handler:', error)
        }
      })

      iohook.start()
      iohookStarted = true
    } catch (error) {
      console.error('Failed to start global keyboard capture:', error)
    }
  }

  function stopGlobalKeyboardCapture() {
    if (!iohook || !iohookStarted) return

    console.log('Stopping global keyboard capture')
    try {
      iohook.stop()
      iohookStarted = false
    } catch (error) {
      console.error('Error stopping iohook:', error)
    }
  }

  function showOverlay() {
    overlayVisible = true
    searchBuffer = ''
    selectedPromptText = ''

    if (paletteWindow && !paletteWindow.isDestroyed()) {
      paletteWindow.webContents.send('overlay:show', {
        searchBuffer,
        useGlobalCapture
      })
    }
  }

  function hideOverlay() {
    overlayVisible = false
    searchBuffer = ''
    selectedPromptText = ''

    if (paletteWindow && !paletteWindow.isDestroyed()) {
      paletteWindow.hide()
      paletteWindow.webContents.send('overlay:hide')
    }
  }

  function updateOverlaySearch() {
    if (paletteWindow && !paletteWindow.isDestroyed()) {
      paletteWindow.webContents.send('overlay:search-update', { searchBuffer })
    }
  }

  function submitSelectedPrompt() {
    if (!selectedPromptText) {
      hideOverlay()
      return
    }

    console.log('Injecting selected prompt text:', selectedPromptText.substring(0, 50) + '...')

    // Hide overlay first
    hideOverlay()

    // Wait a bit for overlay to hide, then inject text
    setTimeout(() => {
      try {
        // Copy to clipboard
        clipboard.writeText(selectedPromptText)

        if (robot) {
          // Use robotjs to simulate paste if available
          if (process.platform === 'darwin') {
            robot.keyTap('v', 'command')
          } else {
            robot.keyTap('v', 'control')
          }
        } else {
          // Fallback: just copy to clipboard and show notification
          console.warn('Robotjs not available - text copied to clipboard, please paste manually')
          notifySystem({
            success: true,
            message: 'Prompt copied to clipboard - paste with Cmd+V'
          })
        }
      } catch (error) {
        console.error('Error injecting text:', error)
        // Fallback: still copy to clipboard
        try {
          clipboard.writeText(selectedPromptText)
          notifySystem({
            success: true,
            message: 'Prompt copied to clipboard - paste with Cmd+V'
          })
        } catch (clipboardError) {
          console.error('Failed to copy to clipboard:', clipboardError)
        }
      }
    }, 100)
  }

  function createPaletteWindow() {
    if (paletteWindow && !paletteWindow.isDestroyed()) {
      paletteWindow.close()
      paletteWindow = null
    }

    // Get the display where the cursor currently is
    const cursorPoint = screen.getCursorScreenPoint()
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint)
    const { width, height } = currentDisplay.workAreaSize
    const { x: displayX, y: displayY } = currentDisplay.workArea

    console.log(
      `Creating non-focusable overlay on display: ${currentDisplay.id}, bounds: ${displayX},${displayY} ${width}x${height}`
    )

    paletteWindow = new BrowserWindow({
      width: 600,
      height: 400,
      x: displayX + Math.floor((width - 600) / 2),
      y: displayY + Math.floor((height - 400) / 3), // Position higher on screen
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
      focusable: !useGlobalCapture, // Only focusable if we can't capture globally
      fullscreenable: false,
      hasShadow: true,
      vibrancy: 'under-window', // macOS vibrancy effect
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false // Prevent throttling when window is hidden
      }
    })

    // Load the overlay-specific content
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      paletteWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#overlay`)
    } else {
      paletteWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: 'overlay'
      })
    }

    // Handle window events with debouncing to prevent focus/blur loops
    let blurTimeout: NodeJS.Timeout | null = null

    paletteWindow.on('blur', () => {
      console.log('Overlay window lost focus, scheduling hide')
      // Debounce the blur event to prevent rapid hide/show cycles
      if (blurTimeout) clearTimeout(blurTimeout)
      blurTimeout = setTimeout(() => {
        if (paletteWindow && !paletteWindow.isDestroyed() && !paletteWindow.isFocused()) {
          console.log('Overlay window hiding after blur timeout')
          paletteWindow.hide()
        }
      }, 200)
    })

    paletteWindow.on('focus', () => {
      console.log('Overlay window gained focus')
      if (blurTimeout) {
        clearTimeout(blurTimeout)
        blurTimeout = null
      }
    })

    paletteWindow.on('closed', () => {
      console.log('Overlay window closed')
      if (blurTimeout) {
        clearTimeout(blurTimeout)
        blurTimeout = null
      }
      paletteWindow = null
    })

    // Ensure the window stays on top and doesn't interfere with other apps
    paletteWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    paletteWindow.setAlwaysOnTop(true, 'screen-saver')

    return paletteWindow
  }

  async function handleCapture() {
    const window = getWindow()
    if (!window) {
      notifySystem({ success: false, message: 'Desktop window is not ready yet.' })
      pushStatus(window, 'failed', 'Desktop window unavailable')
      return
    }

    pushStatus(window, 'capturing', 'Capturing…')

    const { content, bookmark, method } = await readHighlightedText()
    if (!content) {
      const failure = {
        success: false,
        message: 'Highlight text in any app before pressing the shortcut.'
      }
      notifySystem(failure)
      pushStatus(window, 'failed', failure.message)
      return
    }

    const bookmarkTitle = bookmark?.title?.trim() || undefined
    const bookmarkUrl = bookmark?.url?.trim() || undefined
    const source = resolveSource(bookmarkUrl)
    const title = deriveTitle(content, bookmarkTitle)

    const metadata: Record<string, string> = {}
    if (bookmarkUrl) metadata.url = bookmarkUrl
    if (bookmarkTitle) metadata.bookmarkTitle = bookmarkTitle

    window.webContents.send('prompt:capture', {
      content,
      title,
      source,
      categoryPath: `inbox/${source}`,
      visibility: 'private',
      isFavorite: false,
      metadata: {
        ...metadata,
        captureMethod: method
      }
    } satisfies PromptCapturePayload)
  }

  function registerCaptureShortcut() {
    if (captureListening) return
    const success = globalShortcut.register(captureAccelerator, () => {
      void handleCapture()
    })
    if (!success) {
      pushStatus(getWindow(), 'failed', 'Unable to register capture shortcut')
      console.warn(`Unable to register global shortcut ${captureAccelerator}`)
      return
    }
    captureListening = true
    pushStatus(getWindow(), 'listening')
  }

  function registerPaletteShortcut() {
    if (paletteListening) return
    const success = globalShortcut.register(paletteAccelerator, () => {
      console.log(`Palette shortcut ${paletteAccelerator} triggered`)

      // Create the overlay window at the current cursor position
      const overlayWindow = createPaletteWindow()
      if (!overlayWindow) {
        console.warn('Failed to create palette overlay window')
        return
      }

      // Show the window
      overlayWindow.once('ready-to-show', () => {
        if (useGlobalCapture) {
          console.log('Non-focusable overlay window ready, showing without focus')
          overlayWindow.showInactive() // Show without focusing when using global capture
        } else {
          console.log('Focusable overlay window ready, showing with focus (fallback mode)')
          overlayWindow.show() // Show with focus when not using global capture
          overlayWindow.focus()
        }

        // Initialize the overlay state
        showOverlay()
      })
    })
    if (!success) {
      console.warn(`Unable to register global shortcut ${paletteAccelerator}`)
      return
    }
    console.log(`Successfully registered palette shortcut ${paletteAccelerator}`)
    paletteListening = true
  }

  function registerShortcuts() {
    registerCaptureShortcut()
    registerPaletteShortcut()
  }

  function unregisterCaptureShortcut() {
    if (!captureListening) return
    if (globalShortcut.isRegistered(captureAccelerator)) {
      globalShortcut.unregister(captureAccelerator)
    }
    captureListening = false
    pushStatus(getWindow(), 'idle')
  }

  function unregisterPaletteShortcut() {
    if (!paletteListening) return
    if (globalShortcut.isRegistered(paletteAccelerator)) {
      globalShortcut.unregister(paletteAccelerator)
    }
    paletteListening = false
  }

  function unregisterShortcuts() {
    unregisterCaptureShortcut()
    unregisterPaletteShortcut()
  }

  ipcMain.handle('prompt:capture:result', (_event, result: CaptureResult) => {
    notifySystem(result)
    const window = getWindow()
    pushStatus(window, result.success ? 'success' : 'failed', result.message)

    setTimeout(
      () => {
        pushStatus(window, captureListening ? 'listening' : 'idle')
      },
      result.success ? 1500 : 3000
    )
  })

  // Handle overlay hide requests
  ipcMain.on('overlay:hide', () => {
    console.log('Received overlay hide request')
    try {
      if (paletteWindow && !paletteWindow.isDestroyed()) {
        paletteWindow.hide()
      }
    } catch (error) {
      console.error('Error hiding overlay window:', error)
    }
  })

  // Handle force close requests (for when overlay gets stuck)
  ipcMain.on('overlay:force-close', () => {
    console.log('Received overlay force close request')
    try {
      if (paletteWindow && !paletteWindow.isDestroyed()) {
        paletteWindow.close()
        paletteWindow = null
      }
    } catch (error) {
      console.error('Error force closing overlay window:', error)
      // Force null the reference even if close failed
      paletteWindow = null
    }
  })

  // Handle prompt selection from overlay
  ipcMain.on('overlay:select-prompt', (_event, promptText: string) => {
    console.log('Received prompt selection:', promptText.substring(0, 50) + '...')
    selectedPromptText = promptText
    submitSelectedPrompt()
  })

  // Initialize global keyboard capture when shortcuts are enabled
  ipcMain.handle('prompt:capture:enable', () => {
    registerShortcuts()
    startGlobalKeyboardCapture()
    return captureListening
  })

  // Stop global keyboard capture when shortcuts are disabled
  ipcMain.handle('prompt:capture:disable', () => {
    unregisterShortcuts()
    stopGlobalKeyboardCapture()
    return captureListening
  })

  return {
    dispose() {
      unregisterShortcuts()
      stopGlobalKeyboardCapture()
      if (paletteWindow && !paletteWindow.isDestroyed()) {
        paletteWindow.close()
        paletteWindow = null
      }
      ipcMain.removeHandler('prompt:capture:enable')
      ipcMain.removeHandler('prompt:capture:disable')
      ipcMain.removeHandler('prompt:capture:result')
      ipcMain.removeAllListeners('overlay:hide')
      ipcMain.removeAllListeners('overlay:force-close')
      ipcMain.removeAllListeners('overlay:select-prompt')
    }
  }
}

export type CaptureService = ReturnType<typeof createCaptureService>
