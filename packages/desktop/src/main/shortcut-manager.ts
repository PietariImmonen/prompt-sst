import { updateSettings } from './capture-service.js'
import type { TranscriptionService } from './transcription-service.js'
import type { IntegratedCaptureService } from './integrated-capture-service.js'

export interface ShortcutSettings {
  capture: string
  palette: string
  transcribe: string
}

interface Services {
  captureService: IntegratedCaptureService | null
  transcriptionService: TranscriptionService | null
}

/**
 * Initialize shortcuts on app startup
 * Reads from localStorage-derived settings and applies to all services
 */
export function initializeShortcuts(
  shortcuts: ShortcutSettings,
  services: Services
): boolean {
  console.log('⌨️  Initializing shortcuts:', shortcuts)

  try {
    // Update capture service (via capture-service.ts updateSettings)
    const captureNeedsRestart = updateSettings({
      shortcutCapture: shortcuts.capture,
      shortcutPalette: shortcuts.palette,
      enableAutoCapture: true
    })

    console.log(
      `✅ Capture shortcuts initialized (restart needed: ${captureNeedsRestart})`
    )

    // Note: Palette shortcut is handled by SimplePaletteService directly
    // which gets initialized in integrated-capture-service.ts

    // Transcription service shortcut will be set during its initialization
    // by calling updateShortcut if needed

    return true
  } catch (error) {
    console.error('❌ Error initializing shortcuts:', error)
    return false
  }
}

/**
 * Update all shortcuts dynamically (hybrid approach: try immediate, notify if restart needed)
 * Returns success status and whether restart is required
 */
export async function updateAllShortcuts(
  newShortcuts: ShortcutSettings,
  services: Services
): Promise<{ success: boolean; requiresRestart: boolean; message?: string }> {
  console.log('⌨️  Updating all shortcuts:', newShortcuts)

  let requiresRestart = false
  const results: boolean[] = []

  try {
    // Update capture service shortcuts
    const captureNeedsRestart = updateSettings({
      shortcutCapture: newShortcuts.capture,
      shortcutPalette: newShortcuts.palette,
      enableAutoCapture: true
    })

    if (captureNeedsRestart) {
      console.log('⚠️  Capture service shortcuts require restart')
      requiresRestart = true
    } else {
      console.log('✅ Capture shortcut updated immediately')
    }

    results.push(!captureNeedsRestart)

    // Update palette shortcut via integrated capture service
    // Note: The SimplePaletteService inside IntegratedCaptureService
    // needs to be accessible. We'll need to update integrated-capture-service.ts
    // to expose a method for this.

    // For now, mark as requiring restart if we can't access the palette service directly
    // This will be improved when we add the updatePaletteShortcut method to IntegratedCaptureService
    if (services.captureService) {
      // Palette service is encapsulated, so we'll need to enhance IntegratedCaptureService
      // For now, we'll assume it needs restart
      console.log('⚠️  Palette shortcut update requires restart (service encapsulated)')
      requiresRestart = true
    }

    // Update transcription service shortcut
    if (services.transcriptionService) {
      const transcriptionSuccess = services.transcriptionService.updateShortcut(
        newShortcuts.transcribe
      )
      results.push(transcriptionSuccess)

      if (!transcriptionSuccess) {
        console.log('⚠️  Transcription shortcut update failed, restart recommended')
        requiresRestart = true
      } else {
        console.log('✅ Transcription shortcut updated immediately')
      }
    }

    const allSuccess = results.every((r) => r)

    if (requiresRestart) {
      return {
        success: true,
        requiresRestart: true,
        message: 'Shortcuts saved. Please restart the app for some changes to take effect.'
      }
    }

    return {
      success: allSuccess,
      requiresRestart: false,
      message: allSuccess
        ? 'All shortcuts updated successfully!'
        : 'Some shortcuts updated. Restart recommended.'
    }
  } catch (error) {
    console.error('❌ Error updating shortcuts:', error)
    return {
      success: false,
      requiresRestart: true,
      message: `Failed to update shortcuts: ${error instanceof Error ? error.message : 'Unknown error'}. Please restart the app.`
    }
  }
}
