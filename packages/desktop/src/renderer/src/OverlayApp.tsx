import { ThemeProvider } from '@/providers/theme-provider'
import { PromptOverlay } from '@/components/prompt-insertion-palette'

function OverlayApp(): JSX.Element {
  console.log('OverlayApp: Initializing standalone overlay application')

  return (
    <ThemeProvider defaultTheme="system" storageKey="prompt-desktop-overlay-theme">
      <PromptOverlay />
    </ThemeProvider>
  )
}

export default OverlayApp
