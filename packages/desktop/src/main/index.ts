import {
  app,
  shell,
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
  Notification,
} from 'electron'
import { execSync } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

type PromptSource = 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'other'

let mainWindow: BrowserWindow | null = null

const accelerator = process.platform === 'darwin' ? 'Command+Shift+P' : 'Control+Shift+P'

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

function notifyMainProcess(result: { success: boolean; message?: string }) {
  if (Notification.isSupported()) {
    const title = result.success ? 'Prompt captured' : 'Prompt not saved'
    const body =
      result.message ??
      (result.success
        ? 'Your selection is now in the workspace.'
        : 'Highlight some text before capturing.')
    new Notification({ title, body }).show()
  }
  if (result.success) {
    shell.beep()
  }
}

async function readHighlightedText() {
  const directSelection = clipboard.readText('selection').trim()
  if (directSelection) {
    return {
      content: directSelection,
      bookmark: safeReadBookmark(),
    }
  }

  const previousText = clipboard.readText()
  const previousBookmark = safeReadBookmark()

  let usedSimulatedCopy = false
  try {
    if (process.platform === 'darwin') {
      execSync(
        "osascript -e 'tell application \"System Events\" to keystroke \"c\" using {command down}'",
        { stdio: 'ignore' },
      )
      usedSimulatedCopy = true
    } else if (process.platform === 'win32') {
      execSync(
        'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\"^c\")"',
        { stdio: 'ignore' },
      )
      usedSimulatedCopy = true
    }
  } catch {
    // Unable to invoke copy programmatically
  }

  if (usedSimulatedCopy) {
    await delay(120)
  }
  const copiedText = clipboard.readText().trim()
  const copiedBookmark = safeReadBookmark()

  // Restore previous clipboard contents for user courtesy
  if (previousText) {
    clipboard.writeText(previousText)
  }
  if (previousBookmark.url || previousBookmark.title) {
    clipboard.writeBookmark(previousBookmark.title ?? '', previousBookmark.url ?? '')
  }

  return {
    content: copiedText,
    bookmark: copiedBookmark,
  }
}

function safeReadBookmark() {
  try {
    return clipboard.readBookmark()
  } catch {
    return { title: undefined, url: undefined }
  }
}

async function capturePrompt() {
  const { content, bookmark } = await readHighlightedText()

  if (!content) {
    notifyMainProcess({
      success: false,
      message: 'Highlight text in any app before pressing the shortcut.',
    })
    return
  }

  const bookmarkTitle = bookmark?.title?.trim() || undefined
  const bookmarkUrl = bookmark?.url?.trim() || undefined
  const source = resolveSource(bookmarkUrl)
  const title = deriveTitle(content, bookmarkTitle)
  const metadata: Record<string, string> = {}

  if (bookmarkUrl) metadata.url = bookmarkUrl
  if (bookmarkTitle) metadata.bookmarkTitle = bookmarkTitle

  if (!mainWindow) {
    notifyMainProcess({ success: false, message: 'Desktop window is not ready yet.' })
    return
  }

  mainWindow.webContents.send('prompt:capture', {
    content,
    title,
    source,
    categoryPath: `inbox/${source}`,
    visibility: 'private',
    isFavorite: false,
    metadata,
  })
}

ipcMain.handle('prompt:capture:result', (_event, result: { success: boolean; message?: string }) => {
  notifyMainProcess(result)
})

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow?.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  const registered = globalShortcut.register(accelerator, () => {
    void capturePrompt()
  })
  if (!registered) {
    console.warn(`Unable to register global shortcut ${accelerator}`)
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  if (globalShortcut.isRegistered(accelerator)) {
    globalShortcut.unregister(accelerator)
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
