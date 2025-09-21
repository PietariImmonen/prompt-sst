import { ThemeProvider } from '@/providers/theme-provider'
import { SimplePromptOverlay } from '@/components/prompt-insertion-palette/simple-overlay'

function OverlayApp(): JSX.Element {
  console.log('OverlayApp: Initializing standalone overlay application')

  return (
    <ThemeProvider defaultTheme="system" storageKey="prompt-desktop-overlay-theme">
      <SimplePromptOverlay />
    </ThemeProvider>
  )
}

export default OverlayApp
