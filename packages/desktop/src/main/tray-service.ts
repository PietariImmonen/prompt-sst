import { app, Tray, Menu, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

interface TrayServiceOptions {
  onShowMainWindow: () => void
  onHideMainWindow: () => void
  onToggleMainWindow: () => void
  onQuitApp: () => void
  getMainWindowVisibility: () => boolean
  getCaptureServiceStatus: () => 'idle' | 'listening' | 'capturing' | 'success' | 'failed'
  togglePalette?: () => void
}

export class TrayService {
  private tray: Tray | null = null
  private options: TrayServiceOptions
  private eventListenersSetup = false
  private isAppQuitting = false

  constructor(options: TrayServiceOptions) {
    this.options = options

    // Listen for app quit events
    app.on('before-quit', () => {
      this.isAppQuitting = true
    })
  }

  async initialize() {
    if (this.tray) {
      return
    }

    try {
      // Create tray icon from existing icon asset
      const trayIcon = nativeImage.createFromPath(icon)

      // Resize for tray - platform specific sizes
      let resizedIcon = trayIcon
      if (process.platform === 'darwin') {
        resizedIcon = trayIcon.resize({ width: 16, height: 16 })
      } else if (process.platform === 'win32') {
        resizedIcon = trayIcon.resize({ width: 16, height: 16 })
      } else {
        // Linux
        resizedIcon = trayIcon.resize({ width: 22, height: 22 })
      }

      resizedIcon.setTemplateImage(true) // For macOS dark mode support

      this.tray = new Tray(resizedIcon)

      // Set tooltip
      this.tray.setToolTip('Prompt Desktop - Click to show/hide')

      // Setup event listeners only once
      if (!this.eventListenersSetup) {
        this.setupEventListeners()
        this.eventListenersSetup = true
      }

      // Update context menu
      this.updateContextMenu()

      console.log('System tray initialized successfully')
    } catch (error) {
      console.error('Failed to initialize system tray:', error)
      throw error
    }
  }

  private setupEventListeners() {
    if (!this.tray) return

    // Handle tray click events - setup once only
    if (process.platform === 'darwin') {
      // On macOS, left-click toggles window, right-click shows context menu
      this.tray.on('click', () => {
        this.options.onToggleMainWindow()
      })
      this.tray.on('right-click', () => {
        this.showContextMenu()
      })
    } else {
      // On Windows/Linux, single click shows menu, double-click toggles window
      this.tray.on('click', () => {
        this.showContextMenu()
      })
      this.tray.on('double-click', () => {
        this.options.onToggleMainWindow()
      })
    }
  }

  updateContextMenu() {
    if (!this.tray) return

    const isMainWindowVisible = this.options.getMainWindowVisibility()
    const captureStatus = this.options.getCaptureServiceStatus()

    // Status indicator
    const statusText = {
      idle: '● Capture: Ready',
      listening: '🟢 Capture: Listening',
      capturing: '🔄 Capture: Processing',
      success: '✅ Capture: Success',
      failed: '❌ Capture: Failed'
    }[captureStatus]

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: statusText,
        enabled: false
      },
      { type: 'separator' },
      {
        label: isMainWindowVisible ? 'Hide Main Window' : 'Show Main Window',
        click: () => {
          this.options.onToggleMainWindow()
        }
      },
      {
        label: 'Show Main Window',
        visible: !isMainWindowVisible,
        click: () => {
          this.options.onShowMainWindow()
        }
      },
      {
        label: 'Hide to Tray',
        visible: isMainWindowVisible,
        click: () => {
          this.options.onHideMainWindow()
        }
      },
      { type: 'separator' },
      {
        label: 'Open Prompt Palette',
        click: () => {
          this.options.togglePalette?.()
        }
      },
      {
        label: 'Capture Settings',
        click: () => {
          this.options.onShowMainWindow()
          // TODO: Navigate to settings when main window is shown
        }
      },
      {
        label: isDev ? 'Development Mode' : 'About',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Quit Prompt Desktop',
        click: () => {
          this.options.onQuitApp()
        }
      }
    ]

    const contextMenu = Menu.buildFromTemplate(template)
    this.tray.setContextMenu(contextMenu)
  }

  showContextMenu() {
    if (!this.tray) return

    this.updateContextMenu()
    if (process.platform !== 'darwin') {
      // On Windows/Linux, show menu programmatically
      this.tray.popUpContextMenu()
    }
  }

  updateStatus(status: 'idle' | 'listening' | 'capturing' | 'success' | 'failed') {
    // Update context menu when status changes
    this.updateContextMenu()

    // Update tooltip based on status
    const tooltips = {
      idle: 'Prompt Desktop - Ready to capture',
      listening: 'Prompt Desktop - Listening for shortcuts',
      capturing: 'Prompt Desktop - Capturing prompt',
      success: 'Prompt Desktop - Prompt captured successfully',
      failed: 'Prompt Desktop - Capture failed'
    }

    this.tray?.setToolTip(tooltips[status])
  }

  // Recovery mechanism for tray icon
  async recreateTray(): Promise<boolean> {
    if (this.tray && !this.tray.isDestroyed()) {
      console.log('Tray already exists and is healthy')
      return true
    }

    try {
      console.log('Recreating tray icon after failure...')

      // Clear existing tray reference
      if (this.tray) {
        try {
          this.tray.removeAllListeners()
          if (!this.tray.isDestroyed()) {
            this.tray.destroy()
          }
        } catch (error) {
          console.warn('Error cleaning up existing tray:', error)
        }
        this.tray = null
      }

      // Reset event listeners setup flag to allow re-setup
      this.eventListenersSetup = false

      // Reinitialize tray
      await this.initialize()

      console.log('✅ Tray icon recreated successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to recreate tray icon:', error)
      return false
    }
  }

  // Check if tray is healthy (exists and not destroyed)
  isHealthy(): boolean {
    return this.tray !== null && !this.tray.isDestroyed()
  }

  displayBalloon(title: string, content: string, icon?: 'info' | 'warning' | 'error') {
    if (process.platform === 'win32' && this.tray) {
      this.tray.displayBalloon({
        title,
        content,
        icon: icon || 'info'
      })
    }
  }

  dispose() {
    console.log('Disposing system tray service...')

    if (this.tray) {
      try {
        // Remove all event listeners
        this.tray.removeAllListeners()

        // Only destroy the tray if the app is actually quitting
        // Otherwise, just hide it so we can recover later
        if (this.isAppQuitting) {
          this.tray.destroy()
          this.tray = null
          console.log('✅ System tray service disposed (app quitting)')
        } else {
          // Hide the tray but keep reference for potential recovery
          try {
            this.tray.setImage(nativeImage.createEmpty())
            console.log('✅ System tray service hidden (recoverable)')
          } catch (error) {
            // If hiding fails, destroy it
            this.tray.destroy()
            this.tray = null
            console.log('✅ System tray service disposed (hide failed)')
          }
        }
      } catch (error) {
        console.error('❌ Error disposing system tray:', error)
        // Force cleanup on error
        this.tray = null
      }
    }
  }

  isInitialized(): boolean {
    return this.tray !== null
  }

  // Platform-specific dock integration
  setupDockIntegration() {
    if (process.platform === 'darwin') {
      // On macOS, show in dock and handle dock click
      app.dock?.show()

      app.on('activate', () => {
        // This handles clicking the dock icon
        this.options.onShowMainWindow()
      })

      // Handle dock menu
      const dockTemplate: Electron.MenuItemConstructorOptions[] = [
        {
          label: 'Show Main Window',
          click: () => {
            this.options.onShowMainWindow()
          }
        },
        {
          label: 'Capture Settings',
          click: () => {
            this.options.onShowMainWindow()
            // TODO: Navigate to settings
          }
        }
      ]

      const dockMenu = Menu.buildFromTemplate(dockTemplate)
      app.dock?.setMenu(dockMenu)
    }
  }
}