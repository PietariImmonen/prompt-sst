import {
  app,
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
// Replaced electron-toolkit with native check
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Removed native module dependencies (iohook, robotjs) to prevent crashes
// Using simple clipboard-based approach for better stability

let captureAccelerator = process.platform === 'darwin' ? 'Command+Shift+P' : 'Control+Shift+P'
let paletteAccelerator = process.platform === 'darwin' ? 'Command+Shift+O' : 'Control+Shift+O'
let enableAutoCapture = true

// Function to update shortcuts from user settings
export function updateSettings(newSettings: { 
  shortcutCapture?: string, 
  shortcutPalette?: string, 
  enableAutoCapture?: boolean 
}) {
  let needsRestart = false;
  
  if (newSettings.shortcutCapture && newSettings.shortcutCapture !== captureAccelerator) {
    captureAccelerator = newSettings.shortcutCapture;
    needsRestart = true;
  }
  
  if (newSettings.shortcutPalette && newSettings.shortcutPalette !== paletteAccelerator) {
    paletteAccelerator = newSettings.shortcutPalette;
    needsRestart = true;
  }
  
  if (newSettings.enableAutoCapture !== undefined && newSettings.enableAutoCapture !== enableAutoCapture) {
    enableAutoCapture = newSettings.enableAutoCapture;
    needsRestart = true;
  }
  
  return needsRestart;
}

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

interface FocusInfo {
  appName: string
  windowName: string
}

// Extend BrowserWindow interface to include focusInfo
declare module 'electron' {
  interface BrowserWindow {
    focusInfo?: FocusInfo | null
  }
}

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

  // Simplified overlay state - no global keyboard capture
  let overlayVisible = false

  // Removed global keyboard capture functions - using standard input handling

  function showOverlay() {
    overlayVisible = true

    if (paletteWindow && !paletteWindow.isDestroyed()) {
      paletteWindow.show()
      paletteWindow.webContents.send('overlay:show')

      // On Windows/Linux, we might need to focus to receive keyboard events
      if (process.platform !== 'darwin') {
        paletteWindow.focus()
      }
    }
  }

  function hideOverlay() {
    overlayVisible = false

    if (paletteWindow && !paletteWindow.isDestroyed()) {
      paletteWindow.hide()
      paletteWindow.webContents.send('overlay:hide')
    }
  }

  async function submitSelectedPrompt(promptText: string) {
    console.log('Submitting selected prompt:', promptText.substring(0, 50) + '...')

    try {
      // Get focus info stored on the palette window
      const focusInfo = paletteWindow?.focusInfo || null

      // Always copy to clipboard first as a reliable fallback
      clipboard.writeText(promptText)

      // Hide overlay first
      hideOverlay()

      // Restore focus to the original application
      if (focusInfo) {
        console.log('Restoring focus to:', focusInfo)
        await restoreFocus(focusInfo)
      }

      // Additional delay for focus to settle
      await delay(200)

      // Try to insert directly by typing the text character by character
      let insertedDirectly = false

      try {
        if (process.platform === 'darwin') {
          // Type the text directly character by character
          // This approach maintains focus better than clipboard paste
          const escapedText = promptText
            .replace(/\\/g, '\\\\') // Escape backslashes
            .replace(/"/g, '\\"') // Escape quotes
            .replace(/\n/g, '\\n') // Handle newlines
            .replace(/\r/g, '\\r') // Handle carriage returns
            .replace(/\t/g, '\\t') // Handle tabs

          execSync(
            `osascript -e 'tell application "System Events" to keystroke "${escapedText}"'`,
            { stdio: 'ignore', timeout: 5000 }
          )
          insertedDirectly = true
        } else if (process.platform === 'win32') {
          // On Windows: Use SendKeys to type the text
          const escapedText = promptText.replace(/"/g, '""').replace(/\r?\n/g, '{ENTER}')
          execSync(
            `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')"`,
            { stdio: 'ignore', timeout: 5000 }
          )
          insertedDirectly = true
        } else {
          // Linux: Use xdotool to type if available
          try {
            execSync(`xdotool type --delay 1 "${promptText.replace(/"/g, '\\"')}"`, {
              stdio: 'ignore',
              timeout: 5000
            })
            insertedDirectly = true
          } catch {
            // Fallback to clipboard paste
            execSync('xdotool key ctrl+v', { stdio: 'ignore', timeout: 2000 })
            insertedDirectly = true
          }
        }
      } catch (insertError) {
        console.log('Direct typing failed, falling back to clipboard:', insertError)
        insertedDirectly = false

        // Try clipboard paste as fallback
        try {
          if (process.platform === 'darwin') {
            execSync(
              'osascript -e "tell application \\"System Events\\" to keystroke \\"v\\" using {command down}"',
              { stdio: 'ignore', timeout: 2000 }
            )
            insertedDirectly = true
          } else if (process.platform === 'win32') {
            execSync(
              'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\\"^v\\")"',
              { stdio: 'ignore', timeout: 2000 }
            )
            insertedDirectly = true
          }
        } catch {
          insertedDirectly = false
        }
      }

      if (insertedDirectly) {
        notifySystem({
          success: true,
          message: 'Prompt inserted successfully'
        })
      } else {
        notifySystem({
          success: true,
          message: 'Prompt copied to clipboard - paste with Cmd+V (or Ctrl+V)'
        })
      }
    } catch (error) {
      console.error('Failed to submit prompt:', error)
      notifySystem({
        success: false,
        message: 'Failed to insert prompt'
      })
    }
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

    console.log(`Creating overlay window on display: ${currentDisplay.id}`)

    paletteWindow = new BrowserWindow({
      width: 600,
      height: 400,
      x: displayX + Math.floor((width - 600) / 2),
      y: displayY + Math.floor((height - 400) / 3),
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
      hasShadow: true,
      vibrancy: 'under-window',
      type: process.platform === 'darwin' ? 'panel' : undefined, // Don't steal focus on macOS
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false
      }
    })

    // Load the overlay content
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      paletteWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#overlay`)
    } else {
      paletteWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: 'overlay'
      })
    }

    // Simple window event handling
    paletteWindow.on('blur', () => {
      console.log('Overlay window lost focus - hiding')
      setTimeout(() => {
        if (paletteWindow && !paletteWindow.isDestroyed() && !paletteWindow.isFocused()) {
          hideOverlay()
        }
      }, 100)
    })

    paletteWindow.on('closed', () => {
      console.log('Overlay window closed')
      paletteWindow = null
      overlayVisible = false
    })

    // Keep window on top
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
    // Only register if auto capture is enabled
    if (!enableAutoCapture) {
      console.log('Auto capture is disabled, not registering capture shortcut')
      return
    }
    
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

  async function detectFocusedElement(): Promise<FocusInfo | null> {
    if (process.platform !== 'darwin') {
      return null // Focus detection is more complex on other platforms
    }

    try {
      // Get the current frontmost application and window information
      const appInfo = execSync(
        `osascript -e '
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          set appWindows to windows of first application process whose frontmost is true
          if (count of appWindows) > 0 then
            set frontWindow to name of first window of first application process whose frontmost is true
            return frontApp & "|" & frontWindow
          else
            return frontApp & "|"
          end if
        end tell'`,
        { encoding: 'utf8', timeout: 1000 }
      ).trim()

      const [appName, windowName] = appInfo.split('|')
      return { appName, windowName: windowName || '' }
    } catch (error) {
      console.log('Failed to detect focused element:', error)
      return null
    }
  }

  async function restoreFocus(focusInfo: FocusInfo | null): Promise<void> {
    if (!focusInfo || process.platform !== 'darwin') {
      return
    }

    try {
      // Restore focus to the specific application and window
      if (focusInfo.windowName) {
        execSync(
          `osascript -e '
          tell application "${focusInfo.appName}"
            activate
            if exists window "${focusInfo.windowName}" then
              set index of window "${focusInfo.windowName}" to 1
            end if
          end tell'`,
          { encoding: 'utf8', timeout: 2000 }
        )
      } else {
        execSync(`osascript -e 'tell application "${focusInfo.appName}" to activate'`, {
          encoding: 'utf8',
          timeout: 2000
        })
      }

      // Small delay to let the app become active
      await delay(100)

      // For browsers, try to focus back into the input field
      if (
        focusInfo.appName.toLowerCase().includes('chrome') ||
        focusInfo.appName.toLowerCase().includes('firefox') ||
        focusInfo.appName.toLowerCase().includes('safari') ||
        focusInfo.appName.toLowerCase().includes('edge')
      ) {
        // Try to focus the address/input field by clicking in the center of the window
        execSync(
          `osascript -e '
          tell application "System Events"
            # Try Tab key to restore focus to last focused element
            keystroke tab
            delay 0.1
            # If that doesn\'t work, try clicking in the center of the window
            if not exists (first UI element of first window of application process "${focusInfo.appName}" whose focused is true and role is not "AXWindow") then
              click at {400, 300}
            end if
          end tell'`,
          { encoding: 'utf8', timeout: 1000 }
        )
      }
    } catch (error) {
      console.log('Failed to restore focus:', error)
    }
  }

  function registerPaletteShortcut() {
    if (paletteListening) return
    const success = globalShortcut.register(paletteAccelerator, async () => {
      console.log(`Palette shortcut ${paletteAccelerator} triggered`)

      // Detect the currently focused element before showing overlay
      const focusInfo = await detectFocusedElement()
      console.log('Detected focus info:', focusInfo)

      // Store focus info for later restoration
      if (paletteWindow && !paletteWindow.isDestroyed()) {
        paletteWindow.focusInfo = focusInfo
      }

      // Small delay to ensure the current state is captured
      await delay(50)

      // Create the overlay window at the current cursor position
      const overlayWindow = createPaletteWindow()
      if (!overlayWindow) {
        console.warn('Failed to create palette overlay window')
        return
      }

      // Store focus info on the window
      overlayWindow.focusInfo = focusInfo

      // Show the window with focus
      overlayWindow.once('ready-to-show', () => {
        console.log('Overlay window ready, showing with focus')
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
    submitSelectedPrompt(promptText)
  })


  // Handle prompts data request from overlay
  ipcMain.handle('overlay:get-prompts', async () => {
    console.log('Overlay requesting prompts data')
    const window = getWindow()
    if (!window) {
      console.warn('Main window not available for prompts request')
      return []
    }

    try {
      // Send a message to the main window to get prompts via its provider context
      console.log('Requesting prompts from main window via IPC')
      window.webContents.send('overlay:request-prompts')

      // Wait for the response - this will be sent back via a separate IPC handler
      const prompts = await new Promise<any[]>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('Timeout waiting for prompts from main window')
          resolve([])
        }, 5000)

        const handler = (_event: any, data: any[]) => {
          console.log('Capture service: Received prompts response from main window:', data?.length || 0)
          clearTimeout(timeout)
          ipcMain.removeListener('overlay:prompts-response', handler)
          resolve(data || [])
        }

        ipcMain.once('overlay:prompts-response', handler)
      })

      console.log('Retrieved prompts for overlay:', prompts?.length || 0)
      return prompts || []
    } catch (error) {
      console.error('Failed to get prompts for overlay:', error)
      return []
    }
  })

  // Enable shortcuts
  ipcMain.handle('prompt:capture:enable', () => {
    registerShortcuts()
    return captureListening
  })

  // Disable shortcuts
  ipcMain.handle('prompt:capture:disable', () => {
    unregisterShortcuts()
    return captureListening
  })

  // Update settings from renderer
  ipcMain.handle('settings:update', async (_event, newSettings: { 
    shortcutCapture?: string, 
    shortcutPalette?: string, 
    enableAutoCapture?: boolean 
  }) => {
    const needsRestart = updateSettings(newSettings)
    if (needsRestart) {
      // Re-register shortcuts if they changed
      unregisterShortcuts()
      registerShortcuts()
    }
    return { success: true }
  })

  return {
    dispose() {
      unregisterShortcuts()
      if (paletteWindow && !paletteWindow.isDestroyed()) {
        paletteWindow.close()
        paletteWindow = null
      }
      ipcMain.removeHandler('prompt:capture:enable')
      ipcMain.removeHandler('prompt:capture:disable')
      ipcMain.removeHandler('prompt:capture:result')
      ipcMain.removeHandler('overlay:get-prompts')
      ipcMain.removeAllListeners('overlay:hide')
      ipcMain.removeAllListeners('overlay:force-close')
      ipcMain.removeAllListeners('overlay:select-prompt')
    }
  }
}

export type CaptureService = ReturnType<typeof createCaptureService>
