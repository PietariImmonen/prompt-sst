import { app, ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

interface Prompt {
  id: string
  content: string
  title: string
  categoryPath: string
  visibility: 'private' | 'workspace'
  isFavorite: boolean
  source: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

interface PromptCapturePayload {
  content: string
  title: string
  source: 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'other'
  categoryPath: string
  visibility: 'private' | 'workspace'
  isFavorite: boolean
  metadata?: Record<string, string | number | boolean | null>
}

interface CaptureResult {
  success: boolean
  message?: string
}

export class BackgroundDataService {
  private prompts: Prompt[] = []
  private isInitialized = false
  private authToken: string | null = null
  private workspaceId: string | null = null
  private apiEndpoint: string | null = null
  private syncInterval: NodeJS.Timeout | null = null
  private lastSyncTime: Date | null = null
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected'

  constructor() {
    this.setupIpcHandlers()
  }

  async initialize() {
    if (this.isInitialized) {
      return
    }

    try {
      console.log('Initializing background data service...')

      // Load environment configuration for production
      await this.loadEnvironmentConfig()

      // Initialize with empty state - will sync when auth is available
      this.prompts = []
      this.connectionStatus = 'disconnected'

      this.isInitialized = true
      console.log('Background data service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize background data service:', error)
      this.connectionStatus = 'error'
      throw error
    }
  }

  private async loadEnvironmentConfig() {
    // In production builds, load from environment variables that were injected during build
    if (!isDev) {
      this.apiEndpoint = process.env.VITE_API_URL || null
      console.log('Loaded API endpoint for production:', this.apiEndpoint ? 'configured' : 'missing')
    } else {
      // In development, these will be provided by the main window when it starts
      console.log('Development mode - waiting for configuration from main window')
    }
  }

  private setupIpcHandlers() {
    // Handle authentication updates from main window
    ipcMain.handle('background:set-auth', async (_event: IpcMainInvokeEvent, authData: {
      token: string | null
      workspaceId: string | null
      apiEndpoint: string | null
    }) => {
      console.log('Background service: Updating auth configuration')
      this.authToken = authData.token
      this.workspaceId = authData.workspaceId
      if (authData.apiEndpoint) {
        this.apiEndpoint = authData.apiEndpoint
      }

      if (this.authToken && this.workspaceId && this.apiEndpoint) {
        await this.startDataSync()
      } else {
        this.stopDataSync()
      }

      return { success: true }
    })

    // Handle prompts requests from overlay
    ipcMain.handle('background:get-prompts', async () => {
      console.log('Background service: Providing prompts to overlay, count:', this.prompts.length)
      return this.prompts
    })

    // Handle prompt capture from main window or overlay
    ipcMain.handle('background:capture-prompt', async (_event: IpcMainInvokeEvent, payload: PromptCapturePayload) => {
      return await this.capturePrompt(payload)
    })

    // Get connection status
    ipcMain.handle('background:get-status', async () => {
      return {
        status: this.connectionStatus,
        promptCount: this.prompts.length,
        lastSync: this.lastSyncTime?.toISOString() || null,
        hasAuth: !!(this.authToken && this.workspaceId)
      }
    })

    console.log('Background data service IPC handlers registered')
  }

  private async startDataSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    console.log('Starting data sync with API endpoint:', this.apiEndpoint)
    this.connectionStatus = 'connecting'

    try {
      // Initial sync
      await this.syncPrompts()
      this.connectionStatus = 'connected'

      // Set up periodic sync every 30 seconds
      this.syncInterval = setInterval(async () => {
        try {
          await this.syncPrompts()
        } catch (error) {
          console.warn('Periodic sync failed:', error)
          this.connectionStatus = 'error'
        }
      }, 30000)

      console.log('Data sync started successfully')
    } catch (error) {
      console.error('Failed to start data sync:', error)
      this.connectionStatus = 'error'
    }
  }

  private stopDataSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    this.connectionStatus = 'disconnected'
    console.log('Data sync stopped')
  }

  private async syncPrompts() {
    if (!this.authToken || !this.workspaceId || !this.apiEndpoint) {
      console.warn('Cannot sync prompts: missing auth token, workspace ID, or API endpoint')
      this.connectionStatus = 'disconnected'
      return
    }

    try {
      console.log('Syncing prompts with server...', {
        endpoint: this.apiEndpoint,
        hasToken: !!this.authToken,
        workspaceId: this.workspaceId
      })

      const response = await fetch(`${this.apiEndpoint}/prompts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to sync prompts: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()

      // Update local prompts cache
      if (Array.isArray((data as any).prompts)) {
        this.prompts = (data as any).prompts
        this.lastSyncTime = new Date()
        console.log('✅ Prompts synced successfully, count:', this.prompts.length)
      } else if (Array.isArray(data)) {
        // Handle case where the API returns prompts directly as array
        this.prompts = data
        this.lastSyncTime = new Date()
        console.log('✅ Prompts synced successfully (direct array), count:', this.prompts.length)
      } else {
        console.warn('Unexpected prompts data format:', data)
        // Don't update prompts if format is unexpected
      }

      if (this.connectionStatus !== 'connected') {
        this.connectionStatus = 'connected'
        console.log('✅ Background data service connected')
      }

    } catch (error) {
      console.error('❌ Background sync failed:', error)
      this.connectionStatus = 'error'

      // Don't throw error to prevent sync interval from breaking
      // The error is logged and status is updated for monitoring
    }
  }

  async capturePrompt(payload: PromptCapturePayload): Promise<CaptureResult> {
    if (!this.authToken || !this.workspaceId || !this.apiEndpoint) {
      return {
        success: false,
        message: 'Not authenticated - please sign in first'
      }
    }

    try {
      console.log('Capturing prompt:', payload.title.substring(0, 50))

      const response = await fetch(`${this.apiEndpoint}/prompts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          workspaceId: this.workspaceId
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to capture prompt: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      // Add the new prompt to local cache immediately for better UX
      if ((result as any).prompt) {
        this.prompts.unshift((result as any).prompt)
      }

      // Trigger a sync to get latest state
      setTimeout(() => {
        this.syncPrompts().catch(console.warn)
      }, 1000)

      return {
        success: true,
        message: 'Prompt captured successfully'
      }

    } catch (error) {
      console.error('Failed to capture prompt:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to capture prompt'
      }
    }
  }

  // Get current prompts for immediate access (no network call)
  getPrompts(): Prompt[] {
    return [...this.prompts] // Return copy to prevent mutations
  }

  // Get service statistics
  getStats() {
    return {
      promptCount: this.prompts.length,
      connectionStatus: this.connectionStatus,
      lastSyncTime: this.lastSyncTime,
      hasAuth: !!(this.authToken && this.workspaceId)
    }
  }

  dispose() {
    console.log('Disposing background data service...')

    try {
      // Stop data synchronization
      this.stopDataSync()

      // Remove IPC handlers
      ipcMain.removeHandler('background:set-auth')
      ipcMain.removeHandler('background:get-prompts')
      ipcMain.removeHandler('background:capture-prompt')
      ipcMain.removeHandler('background:get-status')

      // Clear data and reset state
      this.prompts = []
      this.authToken = null
      this.workspaceId = null
      this.apiEndpoint = null
      this.lastSyncTime = null
      this.connectionStatus = 'disconnected'
      this.isInitialized = false

      console.log('✅ Background data service disposed successfully')
    } catch (error) {
      console.error('❌ Error disposing background data service:', error)
    }
  }

  // Health check method
  isHealthy(): boolean {
    return this.isInitialized && (this.connectionStatus === 'connected' || this.connectionStatus === 'disconnected')
  }

  // Force refresh data
  async refresh(): Promise<boolean> {
    if (!this.authToken || !this.workspaceId || !this.apiEndpoint) {
      return false
    }

    try {
      await this.syncPrompts()
      return true
    } catch (error) {
      console.error('Failed to refresh data:', error)
      return false
    }
  }
}