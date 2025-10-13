import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { promisify } from 'util'
import { exec } from 'child_process'

const execAsync = promisify(exec)

const DOT_SIZE = 12
const HIDE_DELAY_MS = 3500
const POLL_INTERVAL_MS = 1200
const SUPPORTED_ROLES = new Set([
  'AXTextField',
  'AXSearchField',
  'AXTextArea',
  'AXTextView',
  'AXEditText',
  'AXComboBox',
  'AXDocumentText',
  'unknown' // Fallback for fields where role detection fails but are editable
])

type FocusedEditable = {
  signature: string
  x: number
  y: number
  width: number
  height: number
}

export class TranscriptionReminderService {
  private window: BrowserWindow | null = null
  private pollTimer: NodeJS.Timeout | null = null
  private hideTimer: NodeJS.Timeout | null = null
  private currentSignature: string | null = null
  private initialized = false
  private permissionDenied = false
  private consecutiveErrors = 0
  private lastErrorCode: number | null = null

  async initialize() {
    if (this.initialized) return true

    if (process.platform !== 'darwin') {
      console.warn('🟣 Transcription reminder is only implemented for macOS at this time')
      return false
    }

    console.log('🟣 Transcription reminder service initializing...')
    this.initialized = true
    this.startPolling()
    console.log('🟣 Transcription reminder service started polling')
    return true
  }

  dispose() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }

    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }

    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }

    this.window = null
    this.currentSignature = null
    this.permissionDenied = false
  }

  private startPolling() {
    this.pollTimer = setInterval(() => {
      if (this.permissionDenied) {
        return
      }
      void this.checkFocusedElement()
    }, POLL_INTERVAL_MS)

    // Run immediately on init
    void this.checkFocusedElement()
  }

  private async checkFocusedElement() {
    if (this.permissionDenied) {
      return
    }
    try {
      const focused = await this.fetchFocusedEditable()
      if (!focused) {
        this.hide()
        return
      }

      console.log('🟣 Transcription reminder: Found focused editable field:', {
        signature: focused.signature,
        x: focused.x,
        y: focused.y,
        width: focused.width,
        height: focused.height
      })
      this.showDot(focused)
    } catch (error) {
      console.warn('⚠️  Failed to poll focused element for transcription reminder:', error)
      this.hide()
    }
  }

  private async fetchFocusedEditable(): Promise<FocusedEditable | null> {
    if (!app.isReady()) {
      return null
    }

    const script = `tell application "System Events"
set frontApp to first application process whose frontmost is true
if frontApp is missing value then return "NONE"
try
  set focusedElement to value of attribute "AXFocusedUIElement" of frontApp
  if focusedElement is missing value then return "NONE"

  -- Get role safely
  set axRole to "unknown"
  try
    set axRole to value of attribute "AXRole" of focusedElement
    if axRole is missing value then set axRole to "unknown"
  end try

  -- Get subrole safely
  set axSubrole to ""
  try
    set axSubrole to value of attribute "AXSubrole" of focusedElement
    if axSubrole is missing value then set axSubrole to ""
  end try

  -- Get editable status safely
  set isEditable to false
  try
    set isEditable to value of attribute "AXEditable" of focusedElement
    if isEditable is missing value then set isEditable to false
  end try

  -- Get position and size safely
  set axPosition to missing value
  set axSize to missing value
  try
    set axPosition to value of attribute "AXPosition" of focusedElement
    set axSize to value of attribute "AXSize" of focusedElement
  on error
    return "NONE"
  end try

  if axPosition is missing value or axSize is missing value then return "NONE"

  set appName to bundle identifier of frontApp
  return appName & "|" & axRole & "|" & axSubrole & "|" & (isEditable as string) & "|" & (item 1 of axPosition as integer) & "," & (item 2 of axPosition as integer) & "|" & (item 1 of axSize as integer) & "," & (item 2 of axSize as integer)
on error errMsg number errNum
  return "ERR|" & errNum & "|" & errMsg
end try
end tell`

    const { stdout } = await execAsync(`/usr/bin/osascript <<'APPLESCRIPT'\n${script}\nAPPLESCRIPT\n`)
    const output = stdout.trim()

    if (!output || output === 'NONE') {
      return null
    }

    if (output.startsWith('ERR')) {
      const [, codeRaw, ...msgParts] = output.split('|')
      const code = Number.parseInt(codeRaw ?? '', 10)
      const errorMsg = msgParts.join('|')

      // Permission errors - disable service
      if ([ -25211, -1719, -25205 ].includes(code)) {
        if (!this.permissionDenied) {
          console.warn('⚠️  Accessibility permission missing for transcription reminder. Disabling reminder until app restarts.')
          this.permissionDenied = true
        }
        this.hide()
        return null
      }

      // Transient errors (like -10006) - log only occasionally to avoid spam
      this.consecutiveErrors++
      if (code !== this.lastErrorCode || this.consecutiveErrors === 1 || this.consecutiveErrors % 10 === 0) {
        console.warn(`⚠️  Accessibility query failed (error ${code}, occurrence ${this.consecutiveErrors}): ${errorMsg}`)
        this.lastErrorCode = code
      }

      return null
    }

    // Reset error counter on success
    this.consecutiveErrors = 0
    this.lastErrorCode = null

    const [appName, role, subrole, editableRaw, positionRaw, sizeRaw] = output.split('|')
    const editable = editableRaw === 'true'

    if (!SUPPORTED_ROLES.has(role) && !editable) {
      return null
    }

    const [xRaw, yRaw] = positionRaw.split(',')
    const [widthRaw, heightRaw] = sizeRaw.split(',')

    const x = Number.parseInt(xRaw, 10)
    const y = Number.parseInt(yRaw, 10)
    const width = Number.parseInt(widthRaw, 10)
    const height = Number.parseInt(heightRaw, 10)

    if ([x, y, width, height].some((value) => Number.isNaN(value))) {
      return null
    }

    const signature = [appName, role, subrole, x, y, width, height].join('|')

    return { signature, x, y, width, height }
  }

  private ensureWindow() {
    if (this.window && !this.window.isDestroyed()) {
      return this.window
    }

    this.window = new BrowserWindow({
      width: DOT_SIZE,
      height: DOT_SIZE,
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
      focusable: false,
      fullscreenable: false,
      type: process.platform === 'darwin' ? 'panel' : undefined,
      hasShadow: false,
      useContentSize: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false
      }
    })

    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    this.window.setAlwaysOnTop(true, 'screen-saver', 2)
    // Allow clicks on the dot itself, but forward clicks outside it
    this.window.setIgnoreMouseEvents(false)

    if (app.isPackaged) {
      this.window.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: 'transcription-reminder'
      })
    } else if (process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#transcription-reminder`)
    }

    this.window.on('closed', () => {
      this.window = null
    })

    return this.window
  }

  private showDot(target: FocusedEditable) {
    const dotWindow = this.ensureWindow()

    if (this.currentSignature === target.signature && dotWindow.isVisible()) {
      this.scheduleHide()
      return
    }

    this.currentSignature = target.signature

    const bounds = this.computeDotBounds(target)
    console.log('🟣 Showing dot at bounds:', bounds)

    dotWindow.setBounds(bounds)

    if (!dotWindow.isVisible()) {
      console.log('🟣 Making dot window visible')
      dotWindow.showInactive()
    }

    this.scheduleHide()
  }

  private computeDotBounds(target: FocusedEditable) {
    const display = screen.getDisplayNearestPoint({ x: target.x, y: target.y })
    const workArea = display.bounds

    // Position at the top-left of the input field with small offset
    const offsetX = 4
    const offsetY = -DOT_SIZE - 4

    let dotX = target.x + offsetX
    let dotY = target.y + offsetY

    // If dot would go above screen, position it just inside the top of the field
    if (dotY < workArea.y) {
      dotY = target.y + 4
    }

    // Ensure dot stays within screen bounds
    dotX = Math.min(Math.max(dotX, workArea.x + 2), workArea.x + workArea.width - DOT_SIZE - 2)
    dotY = Math.min(Math.max(dotY, workArea.y + 2), workArea.y + workArea.height - DOT_SIZE - 2)

    return { x: Math.round(dotX), y: Math.round(dotY), width: DOT_SIZE, height: DOT_SIZE }
  }

  private scheduleHide() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
    }

    this.hideTimer = setTimeout(() => {
      this.hide()
    }, HIDE_DELAY_MS)
  }

  private hide() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }

    this.currentSignature = null

    if (this.window && !this.window.isDestroyed()) {
      this.window.hide()
    }
  }
}
