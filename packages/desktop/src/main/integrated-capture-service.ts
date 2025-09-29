import { createCaptureService, updateSettings } from './capture-service.js'
import { SimplePaletteService } from './simple-palette-service.js'

export function createIntegratedCaptureService(getWindow: any, backgroundDataService: any, trayService?: any) {
  // Disable the palette functionality in the original capture service by setting an unused shortcut
  updateSettings({
    shortcutPalette: process.platform === 'darwin' ? 'Command+Shift+F12' : 'Control+Shift+F12', // Use an unused key to effectively disable
    enableAutoCapture: true // Keep capture functionality
  })

  console.log('🔧 Disabled original palette shortcut (set to F12) to prevent conflicts')

  // Create the original capture service for prompt capturing functionality ONLY
  const captureService = createCaptureService(getWindow, backgroundDataService, trayService, {
    registerOverlaySelectionHandler: false
  })

  // Create the simplified palette service with better prompt loading
  const paletteService = new SimplePaletteService({
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
