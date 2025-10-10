import * as React from 'react'
import { AuthContext } from './auth-provider/auth-context'
import { workspaceStore } from './workspace-provider/workspace-context'

// Hook to use auth context
function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * BackgroundSyncProvider syncs authentication and workspace data to the background data service
 * This enables the capture service and prompt insertion palette to work when main window is closed
 */
export function BackgroundSyncProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const [hasInitialSync, setHasInitialSync] = React.useState(false)

  // Get configuration from environment
  const apiEndpoint = import.meta.env.VITE_API_URL
  const realtimeEndpoint = import.meta.env.VITE_REALTIME_ENDPOINT
  const authorizer = import.meta.env.VITE_AUTHORIZER
  const stage = import.meta.env.VITE_STAGE

  // Sync auth data to background service whenever auth state changes
  React.useEffect(() => {
    if (!window.electron?.ipcRenderer) {
      console.warn('Electron IPC not available - background sync disabled')
      return
    }

    if (!auth.isReady) {
      console.log('Auth not ready yet, waiting...')
      return
    }

    console.log('Auth state changed, syncing to background service...')

    const currentAccount = auth.current
    const currentWorkspace = workspaceStore.get()

    // If authenticated but no workspace yet, wait for workspace selection
    if (currentAccount && !currentWorkspace) {
      console.log('Auth ready but waiting for workspace selection...')
      return
    }

    let authData = {
      token: null as string | null,
      workspaceId: null as string | null,
      apiEndpoint: apiEndpoint || null,
      realtimeEndpoint: realtimeEndpoint || null,
      authorizer: authorizer || null,
      stage: stage || null
    }

    if (currentAccount && currentWorkspace) {
      authData = {
        token: currentAccount.token,
        workspaceId: currentWorkspace.id,
        apiEndpoint: apiEndpoint || null,
        realtimeEndpoint: realtimeEndpoint || null,
        authorizer: authorizer || null,
        stage: stage || null
      }
      console.log('Syncing auth data:', {
        hasToken: !!authData.token,
        workspaceId: authData.workspaceId,
        hasApiEndpoint: !!authData.apiEndpoint,
        hasRealtimeEndpoint: !!authData.realtimeEndpoint,
        hasAuthorizer: !!authData.authorizer,
        hasStage: !!authData.stage
      })
    } else {
      console.log('No auth or workspace data available, clearing background service')
    }

    // Send auth data to main process for background service
    window.electron.ipcRenderer.send('sync-auth-to-background-service', authData)

    setHasInitialSync(true)
  }, [auth.current, auth.isReady, apiEndpoint, realtimeEndpoint, authorizer, stage])

  // Handle requests from main process for auth data
  React.useEffect(() => {
    if (!window.electron?.ipcRenderer) return

    const handleAuthRequest = () => {
      console.log('Background service requesting auth data...')

      const currentAccount = auth.current
      const currentWorkspace = workspaceStore.get()

      // If authenticated but no workspace yet, don't sync yet
      if (currentAccount && !currentWorkspace) {
        console.log('Auth ready but waiting for workspace selection...')
        return
      }

      let authData = {
        token: null as string | null,
        workspaceId: null as string | null,
        apiEndpoint: apiEndpoint || null,
        realtimeEndpoint: realtimeEndpoint || null,
        authorizer: authorizer || null,
        stage: stage || null
      }

      if (currentAccount && currentWorkspace) {
        authData = {
          token: currentAccount.token,
          workspaceId: currentWorkspace.id,
          apiEndpoint: apiEndpoint || null,
          realtimeEndpoint: realtimeEndpoint || null,
          authorizer: authorizer || null,
          stage: stage || null
        }
      }

      window.electron.ipcRenderer.send('sync-auth-to-background-service', authData)
    }

    // Listen for auth requests from main process
    window.electron.ipcRenderer.on('request-auth-for-background-service', handleAuthRequest)

    return () => {
      window.electron.ipcRenderer.removeAllListeners('request-auth-for-background-service')
    }
  }, [auth.current, apiEndpoint, realtimeEndpoint, authorizer, stage])

  // Monitor workspace changes
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'prompt-saver.workspace') {
        console.log('Workspace changed, triggering auth sync...')
        // Trigger re-sync when workspace changes
        setTimeout(() => {
          if (auth.current) {
            const currentWorkspace = workspaceStore.get()

            // Only sync if workspace is available
            if (currentWorkspace) {
              const authData = {
                token: auth.current.token,
                workspaceId: currentWorkspace.id,
                apiEndpoint: apiEndpoint || null,
                realtimeEndpoint: realtimeEndpoint || null,
                authorizer: authorizer || null,
                stage: stage || null
              }
              window.electron?.ipcRenderer.send('sync-auth-to-background-service', authData)
            } else {
              console.log('Workspace cleared, clearing background service')
              window.electron?.ipcRenderer.send('sync-auth-to-background-service', {
                token: null,
                workspaceId: null,
                apiEndpoint: apiEndpoint || null,
                realtimeEndpoint: realtimeEndpoint || null,
                authorizer: authorizer || null,
                stage: stage || null
              })
            }
          }
        }, 100)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [auth.current, apiEndpoint, realtimeEndpoint, authorizer, stage])

  // Add dev tools info
  React.useEffect(() => {
    if (hasInitialSync && auth.isReady) {
      console.log('🔄 Background sync initialized:', {
        authenticated: !!auth.current,
        hasWorkspace: !!workspaceStore.get(),
        apiEndpoint: apiEndpoint || 'not configured',
        realtimeEndpoint: realtimeEndpoint || 'not configured',
        authorizer: authorizer || 'not configured',
        stage: stage || 'not configured'
      })
    }
  }, [hasInitialSync, auth.current, auth.isReady, apiEndpoint, realtimeEndpoint, authorizer, stage])

  return <>{children}</>
}

// Hook to check background sync status
export function useBackgroundSyncStatus() {
  const auth = useAuth()
  const [status, setStatus] = React.useState<{
    isConnected: boolean
    lastSync: Date | null
    promptCount: number
  }>({
    isConnected: false,
    lastSync: null,
    promptCount: 0
  })

  React.useEffect(() => {
    if (!window.electron?.ipcRenderer || !auth.isReady) return

    const checkStatus = async () => {
      try {
        const serviceStatus = await window.electron.ipcRenderer.invoke('background:get-status')
        setStatus({
          isConnected: serviceStatus.status === 'connected',
          lastSync: serviceStatus.lastSync ? new Date(serviceStatus.lastSync) : null,
          promptCount: serviceStatus.promptCount || 0
        })
      } catch (error) {
        console.warn('Failed to get background service status:', error)
        setStatus({
          isConnected: false,
          lastSync: null,
          promptCount: 0
        })
      }
    }

    // Check status immediately and then every 10 seconds
    checkStatus()
    const interval = setInterval(checkStatus, 10000)

    return () => clearInterval(interval)
  }, [auth.isReady])

  return status
}
