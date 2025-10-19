import { contextBridge, ipcRenderer } from 'electron'
// Create a simple electronAPI implementation
const electronAPI = {
  ipcRenderer: {
    send: ipcRenderer.send.bind(ipcRenderer),
    invoke: ipcRenderer.invoke.bind(ipcRenderer),
    on: ipcRenderer.on.bind(ipcRenderer),
    off: ipcRenderer.off.bind(ipcRenderer),
    removeListener: ipcRenderer.removeListener.bind(ipcRenderer),
    removeAllListeners: ipcRenderer.removeAllListeners.bind(ipcRenderer)
  }
}

type PromptCapturePayload = {
  content: string
  title: string
  source: 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'other'
  categoryPath: string
  visibility: 'private' | 'workspace'
  isFavorite: boolean
  metadata?: Record<string, string | number | boolean | null>
}

type CaptureStatus = 'idle' | 'listening' | 'capturing' | 'success' | 'failed'

type CaptureStatusPayload = {
  status: CaptureStatus
  message?: string
}

type UpdaterStatusPayload = {
  event: string
  data?: unknown
}

type AuthCallbackPayload = {
  id: string
  hash: string
  search: string
  url: string
}

type AuthPrepareResult = {
  id: string
  callbackUrl: string
}

interface DesktopAuthAPI {
  onCallback: (callback: (payload: AuthCallbackPayload) => void) => () => void
  prepare: () => Promise<AuthPrepareResult>
  launch: (payload: { id: string; url: string }) => Promise<void>
  cancel: (payload: { id: string }) => Promise<void>
}

interface PromptCaptureAPI {
  onCapture: (callback: (payload: PromptCapturePayload) => void) => () => void
  onStatus: (callback: (payload: CaptureStatusPayload) => void) => () => void
  onOpenPalette: (callback: () => void) => () => void
  enable: () => Promise<boolean>
  disable: () => Promise<boolean>
  notifyCapture: (result: { success: boolean; message?: string }) => Promise<void>
}

const promptCapture: PromptCaptureAPI = {
  onCapture(callback) {
    const listener = (_event: Electron.IpcRendererEvent, payload: PromptCapturePayload) => {
      callback(payload)
    }
    ipcRenderer.on('prompt:capture', listener)
    return () => {
      ipcRenderer.removeListener('prompt:capture', listener)
    }
  },
  onStatus(callback) {
    const listener = (_event: Electron.IpcRendererEvent, payload: CaptureStatusPayload) => {
      callback(payload)
    }
    ipcRenderer.on('prompt:capture:status', listener)
    return () => {
      ipcRenderer.removeListener('prompt:capture:status', listener)
    }
  },
  onOpenPalette(callback) {
    const listener = () => {
      console.log('Preload: Received prompt:palette:open IPC message')
      callback()
    }
    console.log('Preload: Setting up onOpenPalette listener')
    ipcRenderer.on('prompt:palette:open', listener)
    return () => {
      console.log('Preload: Removing onOpenPalette listener')
      ipcRenderer.removeListener('prompt:palette:open', listener)
    }
  },
  enable() {
    return ipcRenderer.invoke('prompt:capture:enable')
  },
  disable() {
    return ipcRenderer.invoke('prompt:capture:disable')
  },
  notifyCapture(result) {
    return ipcRenderer.invoke('prompt:capture:result', result)
  }
}

const desktopAuth: DesktopAuthAPI = {
  onCallback(callback) {
    const listener = (_event: Electron.IpcRendererEvent, payload: AuthCallbackPayload) => {
      callback(payload)
    }

    ipcRenderer.on('auth:callback', listener)

    void ipcRenderer
      .invoke('auth:callback:ready')
      .then((pending: AuthCallbackPayload[] | undefined) => {
        if (!pending || !Array.isArray(pending)) return
        for (const payload of pending) {
          callback(payload)
        }
      })
      .catch((error) => {
        console.error('Failed to fetch pending auth callbacks', error)
      })

    return () => {
      ipcRenderer.removeListener('auth:callback', listener)
    }
  },
  prepare() {
    return ipcRenderer.invoke('auth:prepare')
  },
  launch(payload) {
    return ipcRenderer.invoke('auth:launch', payload)
  },
  cancel(payload) {
    return ipcRenderer.invoke('auth:cancel', payload)
  }
}

interface TranscriptionAPI {
  getStatus: () => Promise<{
    status: string
    isRecording: boolean
    hasApiKey: boolean
  }>
  requestMicrophoneAccess: () => Promise<boolean>
}

interface UpdaterAPI {
  onStatus: (callback: (payload: UpdaterStatusPayload) => void) => () => void
  checkForUpdates: () => Promise<void>
  downloadUpdate: () => Promise<void>
  quitAndInstall: () => Promise<void>
  getVersion: () => Promise<string>
}

type ShortcutUpdatePayload = {
  capture: string
  palette: string
  transcribe: string
}

type ShortcutUpdateResult = {
  success: boolean
  message?: string
  requiresRestart?: boolean
}

interface ShortcutsAPI {
  update: (shortcuts: ShortcutUpdatePayload) => Promise<void>
  onUpdateResult: (callback: (result: ShortcutUpdateResult) => void) => () => void
}

const transcription: TranscriptionAPI = {
  getStatus() {
    return ipcRenderer.invoke('transcription:get-status')
  },
  requestMicrophoneAccess() {
    return ipcRenderer.invoke('request-microphone-access')
  }
}

const desktopUpdater: UpdaterAPI = {
  onStatus(callback) {
    const listener = (_event: Electron.IpcRendererEvent, payload: UpdaterStatusPayload) => {
      callback(payload)
    }

    ipcRenderer.on('update-status', listener)

    return () => {
      ipcRenderer.removeListener('update-status', listener)
    }
  },
  checkForUpdates() {
    return ipcRenderer.invoke('updater:check-for-updates')
  },
  downloadUpdate() {
    return ipcRenderer.invoke('updater:download-update')
  },
  quitAndInstall() {
    return ipcRenderer.invoke('updater:quit-and-install')
  },
  getVersion() {
    return ipcRenderer.invoke('app:get-version')
  }
}

const shortcuts: ShortcutsAPI = {
  update(shortcuts) {
    return ipcRenderer.invoke('shortcuts:update', shortcuts)
  },
  onUpdateResult(callback) {
    const listener = (_event: Electron.IpcRendererEvent, result: ShortcutUpdateResult) => {
      callback(result)
    }

    ipcRenderer.on('shortcuts:update-result', listener)

    return () => {
      ipcRenderer.removeListener('shortcuts:update-result', listener)
    }
  }
}

declare global {
  interface Window {
    electron: typeof electronAPI
    promptCapture: PromptCaptureAPI
    desktopAuth: DesktopAuthAPI
    transcription: TranscriptionAPI
    shortcuts: ShortcutsAPI
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('promptCapture', promptCapture)
    contextBridge.exposeInMainWorld('desktopAuth', desktopAuth)
    contextBridge.exposeInMainWorld('transcription', transcription)
    contextBridge.exposeInMainWorld('desktopUpdater', desktopUpdater)
    contextBridge.exposeInMainWorld('shortcuts', shortcuts)
  } catch (error) {
    console.error('Failed to expose preload API', error)
  }
} else {
  // @ts-expect-error fallback when context isolation disabled
  window.electron = electronAPI
  // @ts-expect-error fallback when context isolation disabled
  window.promptCapture = promptCapture
  // @ts-expect-error fallback when context isolation disabled
  window.desktopAuth = desktopAuth
  // @ts-expect-error fallback when context isolation disabled
  window.transcription = transcription
  // @ts-expect-error fallback when context isolation disabled
  window.desktopUpdater = desktopUpdater
  // @ts-expect-error fallback when context isolation disabled
  window.shortcuts = shortcuts
}
