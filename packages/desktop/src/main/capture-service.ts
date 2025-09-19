import {
  BrowserWindow,
  Notification,
  clipboard,
  globalShortcut,
  ipcMain,
  shell
} from 'electron'
import { execSync } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const accelerator = process.platform === 'darwin' ? 'Command+Shift+P' : 'Control+Shift+P'

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
        "osascript -e 'tell application \"System Events\" to keystroke \"c\" using {command down}'",
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
  let listening = false

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

  function registerShortcut() {
    if (listening) return
    const success = globalShortcut.register(accelerator, () => {
      void handleCapture()
    })
    if (!success) {
      pushStatus(getWindow(), 'failed', 'Unable to register capture shortcut')
      console.warn(`Unable to register global shortcut ${accelerator}`)
      return
    }
    listening = true
    pushStatus(getWindow(), 'listening')
  }

  function unregisterShortcut() {
    if (!listening) return
    if (globalShortcut.isRegistered(accelerator)) {
      globalShortcut.unregister(accelerator)
    }
    listening = false
    pushStatus(getWindow(), 'idle')
  }

  ipcMain.handle('prompt:capture:enable', () => {
    registerShortcut()
    return listening
  })

  ipcMain.handle('prompt:capture:disable', () => {
    unregisterShortcut()
    return listening
  })

  ipcMain.handle('prompt:capture:result', (_event, result: CaptureResult) => {
    notifySystem(result)
    const window = getWindow()
    pushStatus(window, result.success ? 'success' : 'failed', result.message)

    setTimeout(() => {
      pushStatus(window, listening ? 'listening' : 'idle')
    }, result.success ? 1500 : 3000)
  })

  return {
    dispose() {
      unregisterShortcut()
      ipcMain.removeHandler('prompt:capture:enable')
      ipcMain.removeHandler('prompt:capture:disable')
      ipcMain.removeHandler('prompt:capture:result')
    }
  }
}

export type CaptureService = ReturnType<typeof createCaptureService>
