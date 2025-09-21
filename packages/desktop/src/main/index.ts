import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { createServer } from 'http'
import type { IncomingMessage, ServerResponse } from 'http'
import { AddressInfo } from 'net'
import { randomUUID } from 'crypto'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createCaptureService } from './capture-service.js'

// Suppress verbose native module errors
process.on('uncaughtException', (error) => {
  if (error.message.includes('iohook') || error.message.includes('Cannot find module')) {
    console.warn('Native module loading failed (functionality will be limited)')
    return
  }
  console.error('Uncaught Exception:', error)
  process.exit(1)
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
const captureService = createCaptureService(() => mainWindow)

const pendingAuthCallbacks: AuthCallbackPayload[] = []
let rendererReadyForAuthCallbacks = false
const activeAuthRequests = new Map<string, AuthRequest>()

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
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

function createWindow(): void {
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

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow?.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
    rendererReadyForAuthCallbacks = false
  })

  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  // Initialize shortcuts after window is created
  setTimeout(() => {
    console.log('Initializing capture service shortcuts...')
    // The shortcuts will be registered when the renderer calls enable()
  }, 1000)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  captureService.dispose()
})
