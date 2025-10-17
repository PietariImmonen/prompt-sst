import electronUpdater from 'electron-updater'
import { app, BrowserWindow } from 'electron'
import { logger } from './logger.js'

// electron-updater is published as CommonJS, so we need to extract the updater instance
const { autoUpdater } = electronUpdater

// Configure updater
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false // Must be false to allow quitAndInstall() to work immediately

// Configure S3/CloudFront feed URL if available (production environment)
// In development or when CDN_URL is not set, it will fall back to GitHub releases
const cdnUrl = 'https://d1ofxq7pnbozg8.cloudfront.net'
if (cdnUrl && app.isPackaged) {
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: cdnUrl,
    channel: 'latest'
  })
  console.log('🌐 Using CDN for updates:', cdnUrl)
} else if (!app.isPackaged) {
  console.log('🛠️  Development mode: Updates will use GitHub releases configuration')
}

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null
  private updateCheckInterval: NodeJS.Timeout | null = null
  private initialized = false

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners() {
    autoUpdater.on('checking-for-update', async () => {
      console.log('🔍 Checking for updates...')
      await logger.info('updater', 'Checking for updates')
      this.sendStatusToWindow('checking-for-update')
    })

    autoUpdater.on('update-available', async (info) => {
      console.log('📦 Update available:', info.version)
      await logger.info('updater', 'Update available', { version: info.version })
      this.sendStatusToWindow('update-available', info)
    })

    autoUpdater.on('update-not-available', async (info) => {
      console.log('✅ App is up to date')
      await logger.info('updater', 'App is up to date', { version: info.version })
      this.sendStatusToWindow('update-not-available', info)
    })

    autoUpdater.on('error', async (err) => {
      console.error('❌ Update error:', err)
      await logger.error('updater', 'Update error', err)
      this.sendStatusToWindow('update-error', { message: err.message })
    })

    autoUpdater.on('download-progress', async (progressObj) => {
      const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`
      console.log('📥', logMessage)
      await logger.info('updater', 'Download progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      })
      this.sendStatusToWindow('download-progress', progressObj)
    })

    autoUpdater.on('update-downloaded', async (info) => {
      console.log('✅ Update downloaded, will install on quit')
      await logger.info('updater', 'Update downloaded', { version: info.version })
      this.sendStatusToWindow('update-downloaded', info)
    })
  }

  private sendStatusToWindow(event: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', { event, data })
    }
  }

  async initialize(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.initialized = true

    try {
      // Check for updates on startup (after a short delay to let app fully load)
      setTimeout(async () => {
        await this.checkForUpdates()
      }, 10000) // 10 seconds after app start

      // Check for updates every 6 hours
      this.updateCheckInterval = setInterval(
        async () => {
          await this.checkForUpdates()
        },
        6 * 60 * 60 * 1000
      ) // 6 hours

      await logger.info('updater', 'Auto-updater service initialized')
      console.log('✅ Auto-updater service initialized')
    } catch (error) {
      await logger.error('updater', 'Failed to initialize auto-updater', error)
      console.error('❌ Failed to initialize auto-updater:', error)
    }
  }

  async checkForUpdates(): Promise<void> {
    if (!this.initialized) {
      console.warn('⚠️  Auto-updater not initialized')
      return
    }

    try {
      // Don't check for updates in development
      if (!app.isPackaged) {
        console.log('🛠️  Development mode, skipping update check')
        return
      }

      await autoUpdater.checkForUpdates()
    } catch (error) {
      await logger.error('updater', 'Failed to check for updates', error)
      console.error('❌ Failed to check for updates:', error)
    }
  }

  async downloadUpdate(): Promise<void> {
    try {
      this.sendStatusToWindow('download-started')
      await autoUpdater.downloadUpdate()
      await logger.info('updater', 'Starting update download')
      console.log('📥 Starting update download...')
    } catch (error) {
      await logger.error('updater', 'Failed to download update', error)
      console.error('❌ Failed to download update:', error)
    }
  }

  quitAndInstall(): void {
    try {
      this.sendStatusToWindow('installing-update')

      // Force quit without waiting for async cleanup
      // This is necessary because quitAndInstall needs immediate app termination
      setImmediate(() => {
        // isSilent=false: show UI dialogs during installation
        // isForceRunAfter=true: run the app after installation
        autoUpdater.quitAndInstall(false, true)
      })

      logger.info('updater', 'Installing update and restarting app')
      console.log('🔄 Installing update and restarting app...')
    } catch (error) {
      logger.error('updater', 'Failed to quit and install', error)
      console.error('❌ Failed to quit and install:', error)
    }
  }

  dispose() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
      this.updateCheckInterval = null
    }
    this.initialized = false
    console.log('Auto-updater service disposed')
  }

  isInitialized(): boolean {
    return this.initialized
  }
}
