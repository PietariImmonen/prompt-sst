import { app, ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { createId } from '@paralleldrive/cuid2'
import mqtt, { MqttClient } from 'mqtt'

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
  private mqttClient: MqttClient | null = null
  private realtimeEndpoint: string | null = null
  private authorizer: string | null = null
  private stage: string | null = null

  constructor() {
    this.setupIpcHandlers()
  }

  private getClientGroupID(): string {
    if (!this.workspaceId) {
      throw new Error('workspaceId missing when computing clientGroupID')
    }
    const clientGroupID = `bg-${this.workspaceId}`
    return clientGroupID.length > 36 ? clientGroupID.slice(0, 36) : clientGroupID
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

  private normalizeApiUrl(url: string | null): string | null {
    if (!url) return null
    // Remove trailing slash for consistent URL construction
    return url.endsWith('/') ? url.slice(0, -1) : url
  }

  private async loadEnvironmentConfig() {
    // In production builds, load from environment variables that were injected during build
    if (!isDev) {
      this.apiEndpoint = this.normalizeApiUrl(process.env.VITE_API_URL || null)
      this.realtimeEndpoint = process.env.VITE_REALTIME_ENDPOINT || null
      this.authorizer = process.env.VITE_AUTHORIZER || null
      this.stage = process.env.VITE_STAGE || null
      console.log('Loaded configuration for production:', {
        apiEndpoint: this.apiEndpoint ? 'configured' : 'missing',
        realtimeEndpoint: this.realtimeEndpoint ? 'configured' : 'missing',
        authorizer: this.authorizer ? 'configured' : 'missing',
        stage: this.stage ? 'configured' : 'missing'
      })
    } else {
      // In development, these will be provided by the main window when it starts
      console.log('Development mode - waiting for configuration from main window')
    }
  }

  private setupIpcHandlers() {
    // Handle authentication updates from main window
    ipcMain.handle(
      'background:set-auth',
      async (
        _event: IpcMainInvokeEvent,
        authData: {
          token: string | null
          workspaceId: string | null
          apiEndpoint: string | null
          realtimeEndpoint?: string | null
          authorizer?: string | null
          stage?: string | null
        }
      ) => {
        console.log('Background service: Updating auth configuration')
        this.authToken = authData.token
        this.workspaceId = authData.workspaceId
        if (authData.apiEndpoint) {
          this.apiEndpoint = this.normalizeApiUrl(authData.apiEndpoint)
        }
        if (authData.realtimeEndpoint) {
          this.realtimeEndpoint = authData.realtimeEndpoint
        }
        if (authData.authorizer) {
          this.authorizer = authData.authorizer
        }
        if (authData.stage) {
          this.stage = authData.stage
        }

        if (this.authToken && this.workspaceId && this.apiEndpoint) {
          await this.startDataSync()
        } else {
          this.stopDataSync()
        }

        return { success: true }
      }
    )

    // Handle prompts requests from overlay
    ipcMain.handle('background:get-prompts', async () => {
      console.log('Background service: Providing prompts to overlay, count:', this.prompts.length)
      return this.prompts
    })

    // Handle prompt capture from main window or overlay
    ipcMain.handle(
      'background:capture-prompt',
      async (_event: IpcMainInvokeEvent, payload: PromptCapturePayload) => {
        return await this.capturePrompt(payload)
      }
    )

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
      // Initial sync to populate cache
      await this.syncPrompts()
      this.connectionStatus = 'connected'

      // Set up MQTT connection for realtime poke notifications
      this.connectToRealtime()

      // DISABLED: Periodic sync is not needed - Replicache in renderer handles all sync
      // The background service only needs data for offline prompt capture
      // Set up periodic sync every 5 minutes as fallback (only to keep cache fresh)
      this.syncInterval = setInterval(
        async () => {
          try {
            await this.syncPrompts()
          } catch (error) {
            console.warn('Periodic sync failed:', error)
            this.connectionStatus = 'error'
          }
        },
        5 * 60 * 1000
      ) // 5 minutes instead of 30 seconds

      console.log('Data sync started successfully (5 minute interval)')
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
    this.disconnectFromRealtime()
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
      console.log('Syncing prompts with server via Replicache pull...', {
        endpoint: this.apiEndpoint,
        hasToken: !!this.authToken,
        workspaceId: this.workspaceId
      })

      // Use Replicache pull endpoint to get all prompts
      const pullURL = `${this.apiEndpoint}/sync/pull`
      const clientGroupID = this.getClientGroupID()
      const response = await fetch(pullURL, {
        method: 'POST',
        headers: {
          'x-prompt-saver-workspace': this.workspaceId,
          Authorization: `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientGroupID,
          cookie: null,
          pullVersion: 1,
          schemaVersion: '8'
        })
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(
          `Failed to sync prompts: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const data = (await response.json()) as any

      // Extract prompts from Replicache pull response
      if (data.patch && Array.isArray(data.patch)) {
        const prompts: Prompt[] = []
        for (const operation of data.patch) {
          if (operation.op === 'put' && operation.key.startsWith('/prompt/')) {
            const prompt = operation.value
            // Filter out deleted prompts
            if (!prompt.timeDeleted) {
              prompts.push(prompt)
            }
          }
        }

        // Sort prompts: favorites first, then by creation time (newest first)
        this.prompts = prompts.sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1
          if (!a.isFavorite && b.isFavorite) return 1
          const timeA = (a as any).timeCreated ? new Date((a as any).timeCreated).getTime() : 0
          const timeB = (b as any).timeCreated ? new Date((b as any).timeCreated).getTime() : 0
          return timeB - timeA
        })

        this.lastSyncTime = new Date()
        console.log('✅ Prompts synced successfully via Replicache, count:', this.prompts.length)
      } else {
        console.warn('Unexpected Replicache pull response format:', data)
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
          Authorization: `Bearer ${this.authToken}`,
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

  private connectToRealtime() {
    // Only connect if we have all required configuration
    if (
      !this.authToken ||
      !this.workspaceId ||
      !this.realtimeEndpoint ||
      !this.authorizer ||
      !this.stage
    ) {
      console.log('Skipping realtime connection - missing configuration:', {
        hasToken: !!this.authToken,
        hasWorkspace: !!this.workspaceId,
        hasEndpoint: !!this.realtimeEndpoint,
        hasAuthorizer: !!this.authorizer,
        hasStage: !!this.stage
      })
      return
    }

    // Skip MQTT connection in development when using fallback localhost values
    if (this.realtimeEndpoint === 'localhost' || this.realtimeEndpoint.includes('127.0.0.1')) {
      console.log('⚠️  Skipping MQTT connection - using development fallback configuration')
      console.log('   Start SST backend and regenerate .env for realtime updates')
      return
    }

    // Disconnect existing connection if any
    this.disconnectFromRealtime()

    try {
      console.log('🔌 Connecting to realtime MQTT for poke notifications...')

      const url = new URL(`wss://${this.realtimeEndpoint}/mqtt`)
      url.searchParams.set('x-amz-customauthorizer-name', this.authorizer)

      this.mqttClient = mqtt.connect(url.toString(), {
        protocolVersion: 5,
        manualConnect: true,
        username: '', // must be empty for the authorizer to work
        password: this.authToken,
        clientId: 'bg_service_' + createId()
      })

      this.mqttClient.on('connect', async () => {
        console.log('✅ MQTT connected in background service')
        if (!this.workspaceId || !this.stage) return

        const topic = `prompt-saver/${this.stage}/${this.workspaceId}/all/#`
        console.log('📡 Subscribing to:', topic)

        try {
          await this.mqttClient?.subscribeAsync(topic, { qos: 1 })
          console.log('✅ Subscribed to poke notifications')
        } catch (error) {
          console.error('Failed to subscribe to MQTT topic:', error)
        }
      })

      this.mqttClient.on('error', (error) => {
        console.error('MQTT connection error:', error)
      })

      this.mqttClient.on('message', (fullTopic, payload) => {
        try {
          const splits = fullTopic.split('/')
          const topic = splits[4]

          if (topic === 'poke') {
            console.log('🔔 Received poke notification, triggering sync...')
            // Trigger immediate sync when poke received
            this.syncPrompts().catch((error) => {
              console.error('Failed to sync after poke:', error)
            })
          }
        } catch (error) {
          console.error('Error processing MQTT message:', error)
        }
      })

      this.mqttClient.on('disconnect', () => {
        console.log('MQTT disconnected')
      })

      this.mqttClient.connect()
    } catch (error) {
      console.error('Failed to connect to realtime:', error)
    }
  }

  private disconnectFromRealtime() {
    if (this.mqttClient) {
      console.log('🔌 Disconnecting from MQTT...')
      try {
        this.mqttClient.end()
      } catch (error) {
        console.error('Error disconnecting from MQTT:', error)
      }
      this.mqttClient = null
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
      this.realtimeEndpoint = null
      this.authorizer = null
      this.stage = null
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
    return (
      this.isInitialized &&
      (this.connectionStatus === 'connected' || this.connectionStatus === 'disconnected')
    )
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

  // Public method to set auth configuration (called from main process)
  async setAuth(authData: {
    token: string | null
    workspaceId: string | null
    apiEndpoint: string | null
    realtimeEndpoint?: string | null
    authorizer?: string | null
    stage?: string | null
  }): Promise<{ success: boolean }> {
    console.log('Background service: Updating auth configuration via setAuth')
    this.authToken = authData.token
    this.workspaceId = authData.workspaceId
    if (authData.apiEndpoint) {
      this.apiEndpoint = this.normalizeApiUrl(authData.apiEndpoint)
    }
    if (authData.realtimeEndpoint) {
      this.realtimeEndpoint = authData.realtimeEndpoint
    }
    if (authData.authorizer) {
      this.authorizer = authData.authorizer
    }
    if (authData.stage) {
      this.stage = authData.stage
    }

    if (this.authToken && this.workspaceId && this.apiEndpoint) {
      await this.startDataSync()
    } else {
      this.stopDataSync()
    }

    return { success: true }
  }
}
