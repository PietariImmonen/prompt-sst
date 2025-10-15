import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

type UpdaterStatusPayload = {
  event: string
  data?: unknown
}

type UpdaterEvent =
  | 'idle'
  | 'checking-for-update'
  | 'update-available'
  | 'update-not-available'
  | 'download-started'
  | 'download-progress'
  | 'update-downloaded'
  | 'update-error'
  | 'installing-update'

const KNOWN_EVENTS = new Set<UpdaterEvent>([
  'idle',
  'checking-for-update',
  'update-available',
  'update-not-available',
  'download-started',
  'download-progress',
  'update-downloaded',
  'update-error',
  'installing-update'
])

type DownloadProgressPayload = {
  percent?: number
}

type UpdateInfoPayload = {
  version?: string
}

type UpdateErrorPayload = {
  message?: string
}

export function useDesktopUpdater() {
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [updaterEvent, setUpdaterEvent] = useState<UpdaterEvent>('idle')
  const [availableVersion, setAvailableVersion] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false)
  const manualCheckRef = useRef(false)
  const availableVersionRef = useRef<string | null>(null)

  const updaterAvailable = useMemo(
    () => typeof window !== 'undefined' && Boolean(window.desktopUpdater),
    []
  )

  useEffect(() => {
    if (!updaterAvailable || !window.desktopUpdater) {
      return
    }

    let isMounted = true

    void window.desktopUpdater
      .getVersion()
      .then((version) => {
        if (isMounted) {
          setAppVersion(version)
        }
      })
      .catch(() => {
        if (isMounted) {
          setAppVersion(null)
        }
      })

    const unsubscribe = window.desktopUpdater.onStatus((payload: UpdaterStatusPayload) => {
      const event = KNOWN_EVENTS.has(payload.event as UpdaterEvent)
        ? (payload.event as UpdaterEvent)
        : 'idle'

      switch (event) {
        case 'checking-for-update': {
          setUpdaterEvent(event)
          setIsCheckingUpdate(true)
          setIsDownloadingUpdate(false)
          setDownloadProgress(null)
          break
        }
        case 'update-available': {
          setUpdaterEvent(event)
          setIsCheckingUpdate(false)
          setIsDownloadingUpdate(false)
          setDownloadProgress(null)
          const { version } = (payload.data ?? {}) as UpdateInfoPayload
          setAvailableVersion(version ?? null)
          availableVersionRef.current = version ?? null
          toast.success(
            version
              ? `Update ${version} is available. Download it when you're ready.`
              : 'A new update is available. Download it when you are ready.'
          )
          manualCheckRef.current = false
          break
        }
        case 'update-not-available': {
          setUpdaterEvent(event)
          setIsCheckingUpdate(false)
          setIsDownloadingUpdate(false)
          setAvailableVersion(null)
          availableVersionRef.current = null
          setDownloadProgress(null)
          if (manualCheckRef.current) {
            toast.info('You are already on the latest version.')
            manualCheckRef.current = false
          }
          break
        }
        case 'download-started': {
          setUpdaterEvent(event)
          setIsDownloadingUpdate(true)
          setDownloadProgress(0)
          break
        }
        case 'download-progress': {
          setUpdaterEvent(event)
          setIsDownloadingUpdate(true)
          const { percent } = (payload.data ?? {}) as DownloadProgressPayload
          if (typeof percent === 'number' && !Number.isNaN(percent)) {
            setDownloadProgress(Math.max(0, Math.min(100, Math.round(percent))))
          }
          break
        }
        case 'update-downloaded': {
          setUpdaterEvent(event)
          setIsDownloadingUpdate(false)
          setIsCheckingUpdate(false)
          const { version } = (payload.data ?? {}) as UpdateInfoPayload
          const resolvedVersion = version ?? availableVersionRef.current
          setAvailableVersion(resolvedVersion ?? null)
          availableVersionRef.current = resolvedVersion ?? null
          setDownloadProgress(100)
          toast.success(
            resolvedVersion
              ? `Update ${resolvedVersion} downloaded. Restart to install.`
              : 'Update downloaded. Restart to install.'
          )
          manualCheckRef.current = false
          break
        }
        case 'update-error': {
          setUpdaterEvent(event)
          setIsCheckingUpdate(false)
          setIsDownloadingUpdate(false)
          setDownloadProgress(null)
          const { message } = (payload.data ?? {}) as UpdateErrorPayload
          toast.error(message ? `Update failed: ${message}` : 'Update failed. Please try again.')
          manualCheckRef.current = false
          break
        }
        case 'installing-update': {
          setUpdaterEvent(event)
          toast.info('Installing update…')
          break
        }
        default: {
          setUpdaterEvent('idle')
          setIsCheckingUpdate(false)
          setIsDownloadingUpdate(false)
          setDownloadProgress(null)
        }
      }
    })

    return () => {
      isMounted = false
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [updaterAvailable])

  const checkForUpdates = useCallback(async () => {
    if (!window.desktopUpdater) {
      toast.error('Auto-updater is not available in this environment.')
      return
    }

    try {
      manualCheckRef.current = true
      setIsCheckingUpdate(true)
      await window.desktopUpdater.checkForUpdates()
    } catch (error) {
      manualCheckRef.current = false
      setIsCheckingUpdate(false)
      toast.error('Failed to check for updates. Please try again later.')
    }
  }, [])

  const downloadUpdate = useCallback(async () => {
    if (!window.desktopUpdater) {
      toast.error('Auto-updater is not available in this environment.')
      return
    }

    try {
      setIsDownloadingUpdate(true)
      setDownloadProgress(null)
      await window.desktopUpdater.downloadUpdate()
    } catch (error) {
      setIsDownloadingUpdate(false)
      toast.error('Failed to start update download. Please try again.')
    }
  }, [])

  const installUpdate = useCallback(async () => {
    if (!window.desktopUpdater) {
      toast.error('Auto-updater is not available in this environment.')
      return
    }

    try {
      await window.desktopUpdater.quitAndInstall()
    } catch (error) {
      toast.error('Failed to restart and install the update. Please try again.')
    }
  }, [])

  const statusLabel = useMemo(() => {
    switch (updaterEvent) {
      case 'checking-for-update':
        return 'Checking for updates…'
      case 'update-available':
        return 'Update available'
      case 'download-started':
        return 'Preparing download…'
      case 'download-progress':
        return 'Downloading update…'
      case 'update-downloaded':
        return 'Update ready to install'
      case 'update-error':
        return 'Update failed'
      case 'installing-update':
        return 'Installing update…'
      case 'update-not-available':
        return 'You are up to date'
      default:
        return 'Idle'
    }
  }, [updaterEvent])

  const showInstallButton = updaterEvent === 'update-downloaded'
  const showDownloadProgress =
    updaterEvent === 'download-progress' || updaterEvent === 'download-started'

  const progressValue = useMemo(() => {
    if (!showDownloadProgress) {
      return downloadProgress
    }

    if (typeof downloadProgress === 'number') {
      return downloadProgress
    }

    return isDownloadingUpdate ? 0 : null
  }, [downloadProgress, isDownloadingUpdate, showDownloadProgress])

  return {
    appVersion,
    updaterEvent,
    availableVersion,
    downloadProgress,
    isCheckingUpdate,
    isDownloadingUpdate,
    updaterAvailable,
    statusLabel,
    showInstallButton,
    showDownloadProgress,
    progressValue,
    checkForUpdates,
    downloadUpdate,
    installUpdate
  }
}

export type UseDesktopUpdaterReturn = ReturnType<typeof useDesktopUpdater>
