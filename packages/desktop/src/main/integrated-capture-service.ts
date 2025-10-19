import { createCaptureService, updateSettings } from './capture-service.js'
import { SimplePaletteService } from './simple-palette-service.js'

interface ShortcutSettings {
  capture: string
  palette: string
  transcribe: string
}

export function createIntegratedCaptureService(
  getWindow: any,
  backgroundDataService: any,
  trayService?: any,
  shortcuts?: ShortcutSettings
) {
  // Use provided shortcuts or defaults
  const captureShortcut = shortcuts?.capture || (process.platform === 'darwin' ? 'Command+Shift+P' : 'Control+Shift+P')
  const paletteShortcut = shortcuts?.palette || (process.platform === 'darwin' ? 'Command+Shift+O' : 'Control+Shift+O')

  // Configure capture service with custom shortcut
  updateSettings({
    shortcutCapture: captureShortcut,
    shortcutPalette: process.platform === 'darwin' ? 'Command+Shift+F12' : 'Control+Shift+F12', // Disabled
    enableAutoCapture: true
  })

  console.log('🔧 Initialized capture service with shortcut:', captureShortcut)

  // Create the original capture service for prompt capturing functionality ONLY
  const captureService = createCaptureService(getWindow, backgroundDataService, trayService, {
    registerOverlaySelectionHandler: false
  })

  // Create the simplified palette service with custom shortcut
  const paletteService = new SimplePaletteService({
    initialShortcut: paletteShortcut,
    onShow: () => {
      console.log('✅ Simplified palette shown')
    },
    onHide: () => {
      console.log('✅ Simplified palette hidden')
    },
    getPrompts: () => {
      try {
        // First try background data service
        let prompts = backgroundDataService?.getPrompts?.() || []

        if (!Array.isArray(prompts) || prompts.length === 0) {
          console.log('Background service empty, will try main window via overlay handler')
        }

        return Array.isArray(prompts) ? prompts : []
      } catch (error) {
        console.error('Failed to get prompts for palette:', error)
        return []
      }
    }
  })

  // Original palette shortcut is now disabled via updateSettings above

  return {
    // Preserve original capture service functionality (for Cmd+Shift+C)
    getStatus: captureService.getStatus,
    isListening: captureService.isListening,

    // Override dispose to clean up both services
    dispose() {
      try {
        captureService.dispose()
      } catch (error) {
        console.error('Error disposing capture service:', error)
      }

      try {
        paletteService.dispose()
      } catch (error) {
        console.error('Error disposing palette service:', error)
      }
    },

    // Enable palette functionality
    enablePalette() {
      const success = paletteService.registerShortcut()
      const shortcut = process.platform === 'darwin' ? 'Command+Shift+O' : 'Control+Shift+O'
      console.log(`🎯 Simplified palette shortcut (${shortcut}) registered:`, success)
      return success
    },

    // Disable palette functionality
    disablePalette() {
      paletteService.unregisterShortcut()
      console.log('🎯 Simplified palette shortcut unregistered')
    },

    // Check if palette is visible
    isPaletteVisible() {
      return paletteService.isVisible()
    },

    // Manual palette toggle
    togglePalette() {
      console.log('🎯 Toggling simplified palette, currently visible:', paletteService.isVisible())
      if (paletteService.isVisible()) {
        paletteService.hide()
      } else {
        paletteService.show()
      }
    }
  }
}

export type IntegratedCaptureService = ReturnType<typeof createIntegratedCaptureService>
