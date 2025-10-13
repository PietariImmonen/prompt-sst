import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import OverlayApp from './OverlayApp'
import { SimplePromptPalette } from './components/prompt-insertion-palette/simple-prompt-palette'
import TranscriptionReminderDot from './pages/transcription-reminder-dot'

// Check the URL hash to determine which component to render
const hash = window.location.hash
const isOverlayMode = hash === '#overlay'
const isPaletteMode = hash === '#palette'
const isTranscriptionReminder = hash === '#transcription-reminder'

// Import global CSS only for components that need it
// Don't import for transcription reminder to avoid style conflicts
if (!isTranscriptionReminder) {
  await import('./assets/main.css')
}

let ComponentToRender: React.ComponentType = App
if (isOverlayMode) {
  ComponentToRender = OverlayApp
} else if (isPaletteMode) {
  ComponentToRender = SimplePromptPalette
} else if (isTranscriptionReminder) {
  ComponentToRender = TranscriptionReminderDot
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode><ComponentToRender /></React.StrictMode>
)
