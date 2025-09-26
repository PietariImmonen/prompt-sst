import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { createServer } from 'http'
import type { IncomingMessage, ServerResponse } from 'http'
import { AddressInfo } from 'net'
import { randomUUID } from 'crypto'
import { join } from 'path'
// Replaced electron-toolkit with native Electron APIs
import icon from '../../resources/icon.png?asset'
import { createCaptureService, updateSettings } from './capture-service.js'
import { createIntegratedCaptureService } from './integrated-capture-service.js'
import { TrayService } from './tray-service.js'
import { BackgroundDataService } from './background-data-service.js'
import { logger, logServiceStart, logServiceReady, logServiceError, logServiceStop } from './logger.js'

// Check if running in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Enhanced error handling with logging
process.on('uncaughtException', async (error) => {
  if (error.message.includes('iohook') || error.message.includes('Cannot find module')) {
    console.warn('Native module loading failed (functionality will be limited)')
    await logger.warn('system', 'Native module loading failed', { error: error.message })
    return
  }
  console.error('Uncaught Exception:', error)
  await logger.fatal('system', 'Uncaught exception', error)
  process.exit(1)
})

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  await logger.error('system', 'Unhandled promise rejection', { reason, promise })
})

const CALLBACK_HOST = '127.0.0.1'
const CALLBACK_PATH = '/'
const COMPLETE_PATH = '/complete'

type AuthCallbackPayload = {
  id: string
  hash: string
  search: string
  url: string
}

type AuthRequest = {
  id: string
  callbackUrl: string
  server: ReturnType<typeof createServer>
}

let mainWindow: BrowserWindow | null = null
let trayService: TrayService | null = null
let backgroundDataService: BackgroundDataService | null = null
let captureService: any = null
let isQuitting = false

const pendingAuthCallbacks: AuthCallbackPayload[] = []
let rendererReadyForAuthCallbacks = false
const activeAuthRequests = new Map<string, AuthRequest>()

const gotSingleInstanceLock = app.requestSingleInstanceLock()

console.log('Single instance lock acquired:', gotSingleInstanceLock)

if (!gotSingleInstanceLock) {
  console.log('Could not acquire single instance lock, quitting...')
  // In development mode, don't quit - allow multiple instances for debugging
  if (!isDev) {
    app.quit()
  } else {
    console.log('Development mode: allowing multiple instances')
  }
}

function flushPendingAuthCallbacks() {
  if (!rendererReadyForAuthCallbacks) return
  if (!mainWindow) return
  while (pendingAuthCallbacks.length > 0) {
    const payload = pendingAuthCallbacks.shift()
    if (payload) {
      mainWindow.webContents.send('auth:callback', payload)
    }
  }
}

function renderCallbackLanding() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Prompt Desktop</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0E111A; color: #E4E7F0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
      .card { max-width: 420px; padding: 32px; border-radius: 16px; background: rgba(255,255,255,0.05); box-shadow: 0 16px 40px rgba(14,17,26,0.45); text-align: center; }
      h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
      p { margin-bottom: 0.75rem; color: rgba(228,231,240,0.75); line-height: 1.5; }
      .status { margin-top: 1.25rem; font-size: 0.875rem; color: rgba(228,231,240,0.65); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Completing sign-in…</h1>
      <p>You can close this window once the desktop app confirms authentication.</p>
      <div class="status" id="status">Working…</div>
    </div>
    <script>
      (function complete() {
        try {
          const hash = window.location.hash ? window.location.hash.substring(1) : '';
          const query = window.location.search ? window.location.search.substring(1) : '';
          const payload = hash || query;
          const params = payload ? new URLSearchParams(payload).toString() : '';
          const target = params ? '${COMPLETE_PATH}?'+params : '${COMPLETE_PATH}';

          fetch(target, { method: 'GET', mode: 'same-origin', credentials: 'omit' })
            .then(() => {
              document.getElementById('status').textContent = 'Authentication received. You may close this window.';
              setTimeout(() => window.close(), 1500);
            })
            .catch(() => {
              document.getElementById('status').textContent = 'Unable to notify the desktop app automatically. You may close this tab and return to Prompt Desktop.';
            });
        } catch (error) {
          document.getElementById('status').textContent = 'Something went wrong. Close this tab and retry in Prompt Desktop.';
        }
      })();
    </script>
  </body>
</html>`
}

function renderCallbackComplete() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Prompt Desktop</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0E111A; color: #E4E7F0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
      .card { max-width: 420px; padding: 32px; border-radius: 16px; background: rgba(255,255,255,0.05); box-shadow: 0 16px 40px rgba(14,17,26,0.45); text-align: center; }
      h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
      p { margin-bottom: 0; color: rgba(228,231,240,0.75); line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Prompt Desktop</h1>
      <p>You can close this tab and return to the app.</p>
    </div>
    <script>
      setTimeout(() => window.close(), 2000);
    </script>
  </body>
</html>`
}

function finalizeAuthRequest(id: string, params: URLSearchParams, request: AuthRequest) {
  try {
    request.server.close()
  } catch (error) {
    console.warn('Failed to close auth callback server', error)
  }
  activeAuthRequests.delete(id)

  const queryString = params.toString()
  const hash = queryString ? `#${queryString}` : ''
  const search = queryString ? `?${queryString}` : ''

  pendingAuthCallbacks.push({
    id,
    hash,
    search,
    url: `${request.callbackUrl}${hash}`
  })

  flushPendingAuthCallbacks()

  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
}

function handleAuthRequest(
  id: string,
  request: AuthRequest,
  req: IncomingMessage,
  res: ServerResponse
) {
  const base = new URL(request.callbackUrl)
  const incoming = new URL(req.url ?? '/', `http://${base.host}`)

  if (incoming.pathname === CALLBACK_PATH) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(renderCallbackLanding())
    return
  }

  if (incoming.pathname === COMPLETE_PATH) {
    finalizeAuthRequest(id, incoming.searchParams, request)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(renderCallbackComplete())
    return
  }

  res.writeHead(404)
  res.end()
}

async function createAuthRequest(): Promise<{ id: string; callbackUrl: string }> {
  const id = randomUUID()
  const server = createServer((req, res) => {
    const active = activeAuthRequests.get(id)
    if (!active) {
      res.writeHead(410)
      res.end()
      return
    }
    handleAuthRequest(id, active, req, res)
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, CALLBACK_HOST, () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('Failed to determine OAuth callback port')
  }

  const callbackUrl = `http://${CALLBACK_HOST}:${(address as AddressInfo).port}${CALLBACK_PATH}`
  const authRequest: AuthRequest = { id, callbackUrl, server }
  activeAuthRequests.set(id, authRequest)
  return { id, callbackUrl }
}

function cancelAuthRequest(id: string) {
  const existing = activeAuthRequests.get(id)
  if (!existing) return
  try {
    existing.server.close()
  } catch (error) {
    console.warn('Failed to close auth callback server during cancel', error)
  }
  activeAuthRequests.delete(id)
}

ipcMain.handle('auth:callback:ready', () => {
  rendererReadyForAuthCallbacks = true
  const payloads = [...pendingAuthCallbacks]
  pendingAuthCallbacks.length = 0
  return payloads
})

ipcMain.handle('auth:prepare', async () => {
  return createAuthRequest()
})

ipcMain.handle('auth:launch', async (_event, payload: { id: string; url: string }) => {
  const request = activeAuthRequests.get(payload.id)
  if (!request) {
    throw new Error('Auth request not found')
  }
  await shell.openExternal(payload.url)
})

ipcMain.handle('auth:cancel', async (_event, payload: { id: string }) => {
  cancelAuthRequest(payload.id)
})

// Handler for auth sync from main window to background service
ipcMain.on('sync-auth-to-background-service', (_event, authData: {
  token: string | null,
  workspaceId: string | null,
  apiEndpoint: string | null
}) => {
  console.log('Main process: Syncing auth to background service')
  if (backgroundDataService) {
    // Use the background service's IPC handler directly
    ipcMain.emit('background:set-auth', null, authData)
  }
})

function createWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return // Window already exists
  }

  rendererReadyForAuthCallbacks = false
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

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      // Always hide to tray instead of closing, on all platforms
      event.preventDefault()
      mainWindow?.hide()

      // Show notification about running in background
      if (process.platform === 'win32' && trayService) {
        trayService.displayBalloon(
          'Prompt Desktop',
          'Application is running in the background. Click the tray icon to access.',
          'info'
        )
      }

      console.log('Main window hidden to tray, app continues running in background')
      return false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // When main window becomes visible, update background service with auth info
  mainWindow.on('show', () => {
    // Request auth info from renderer when window shows
    if (mainWindow && backgroundDataService) {
      setTimeout(() => {
        mainWindow!.webContents.send('request-auth-for-background-service')
      }, 1000)
    }

    // Update tray menu
    if (trayService) {
      trayService.updateContextMenu()
    }
  })

  mainWindow.on('hide', () => {
    // Update tray menu
    if (trayService) {
      trayService.updateContextMenu()
    }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow?.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
  } else {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
  }
}

function hideMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide()
  }
}

function toggleMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    showMainWindow()
  } else if (mainWindow.isVisible()) {
    hideMainWindow()
  } else {
    showMainWindow()
  }
}

function quitApplication(): void {
  console.log('Quit requested from tray menu')
  isQuitting = true
  app.quit()
}

app.whenReady().then(async () => {
  try {
    // Initialize logger first
    await logger.initialize()
    await logger.logSystemInfo()

    app.setAppUserModelId('com.electron')

    app.on('browser-window-created', (_, window) => {
      rendererReadyForAuthCallbacks = false
    })

    ipcMain.on('ping', () => console.log('pong'))

    // Initialize background services
    await logServiceStart('BackgroundDataService')
    backgroundDataService = new BackgroundDataService()
    await backgroundDataService.initialize()
    await logServiceReady('BackgroundDataService')

    // Initialize tray service first so it can be passed to capture service
    await logServiceStart('TrayService')
    trayService = new TrayService({
      onShowMainWindow: showMainWindow,
      onHideMainWindow: hideMainWindow,
      onToggleMainWindow: toggleMainWindow,
      onQuitApp: quitApplication,
      getMainWindowVisibility: () => !!mainWindow && mainWindow.isVisible(),
      getCaptureServiceStatus: () => captureService?.getStatus() || 'idle',
      togglePalette: () => captureService?.togglePalette()
    })

    await trayService.initialize()
    trayService.setupDockIntegration()
    await logServiceReady('TrayService')

    // Initialize integrated capture service with tray service reference
    await logServiceStart('CaptureService')
    captureService = createIntegratedCaptureService(() => mainWindow, backgroundDataService, trayService)

    // Enable the simplified palette
    const paletteEnabled = captureService.enablePalette()
    console.log('Simplified palette enabled:', paletteEnabled)

    await logServiceReady('CaptureService')

    // Create main window
    createWindow()

    // Log application state
    await logger.logAppState({
      trayService: trayService.isInitialized(),
      backgroundDataService: backgroundDataService.isHealthy(),
      captureService: captureService?.isListening() || false,
      mainWindow: !!mainWindow
    })

    // Initialize shortcuts after all services are ready
    setTimeout(() => {
      logger.info('system', 'All services initialized, shortcuts will be registered when renderer is ready')
    }, 1000)

    // Set up periodic service health monitoring
    const healthCheckInterval = setInterval(async () => {
      try {
        let needsRecovery = false

        // Check tray service health
        if (trayService && !trayService.isHealthy()) {
          console.warn('🔧 Tray service unhealthy, attempting recovery...')
          await logger.warn('service', 'Tray service unhealthy, attempting recovery')
          const recovered = await trayService.recreateTray()
          if (recovered) {
            console.log('✅ Tray service recovered successfully')
            await logger.info('service', 'Tray service recovered successfully')
          } else {
            console.error('❌ Failed to recover tray service')
            await logger.error('service', 'Failed to recover tray service')
          }
          needsRecovery = true
        }

        // Check background data service health
        if (backgroundDataService && !backgroundDataService.isHealthy()) {
          console.warn('🔧 Background data service unhealthy, attempting restart...')
          await logger.warn('service', 'Background data service unhealthy, attempting restart')
          try {
            await backgroundDataService.initialize()
            console.log('✅ Background data service restarted successfully')
            await logger.info('service', 'Background data service restarted successfully')
          } catch (error) {
            console.error('❌ Failed to restart background data service:', error)
            await logger.error('service', 'Failed to restart background data service', error)
          }
          needsRecovery = true
        }

        // Log health check completion only if recovery was needed
        if (needsRecovery) {
          await logger.info('system', 'Service health check completed')
        }
      } catch (error) {
        console.error('Health check failed:', error)
        await logger.error('system', 'Service health check failed', error)
      }
    }, 30000) // Check every 30 seconds

    // Clean up health check on app quit
    app.on('before-quit', () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval)
      }
    })

    await logger.info('system', 'Application startup completed successfully')
    console.log('✅ All background services initialized successfully')
  } catch (error) {
    await logServiceError('ApplicationStartup', error)
    console.error('❌ Failed to initialize background services:', error)
    // Continue with limited functionality if services fail
    createWindow()
  }

  app.on('activate', function () {
    if (process.platform === 'darwin') {
      showMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Don't quit when all windows are closed - app should run in background
  console.log('All windows closed, but keeping app running in background')
})

app.on('before-quit', async () => {
  console.log('Application quitting, cleaning up services...')
  await logger.info('system', 'Application shutdown initiated')
  isQuitting = true
})

app.on('will-quit', async () => {
  try {
    // Log final app state
    await logger.logAppState({
      trayService: trayService?.isInitialized() || false,
      backgroundDataService: backgroundDataService?.isHealthy() || false,
      captureService: captureService?.isListening() || false,
      mainWindow: !!mainWindow
    })

    // Helper function to safely dispose each service
    const disposeService = async (service: any, name: string, disposeFn: () => Promise<void> | void) => {
      try {
        if (service) {
          await logServiceStop(name)
          console.log(`Disposing ${name}...`)
          await disposeFn()
          console.log(`✅ ${name} disposed successfully`)
        }
      } catch (error) {
        console.error(`❌ Error disposing ${name}:`, error)
        await logger.error('service', `${name} disposal failed`, error)
        // Continue with other services even if one fails
      }
    }

    // Dispose services in reverse order with individual error handling
    await disposeService(captureService, 'CaptureService', () => captureService?.dispose())
    await disposeService(backgroundDataService, 'BackgroundDataService', () => backgroundDataService?.dispose())
    await disposeService(trayService, 'TrayService', () => trayService?.dispose())

    await logger.info('system', 'Application shutdown completed')
    console.log('✅ Application shutdown completed successfully')
  } catch (error) {
    console.error('Critical error during app shutdown:', error)
    await logger.error('system', 'Critical error during application shutdown', error)
    // Force quit if disposal fails completely to prevent hanging
    process.exit(1)
  }
})
