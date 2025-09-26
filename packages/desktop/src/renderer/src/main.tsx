import './assets/main.css'

import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import OverlayApp from './OverlayApp'
import { SimplePromptPalette } from './components/prompt-insertion-palette/simple-prompt-palette'

// Check the URL hash to determine which component to render
const hash = window.location.hash
const isOverlayMode = hash === '#overlay'
const isPaletteMode = hash === '#palette'

let ComponentToRender: React.ComponentType = App
if (isOverlayMode) {
  ComponentToRender = OverlayApp
} else if (isPaletteMode) {
  ComponentToRender = SimplePromptPalette
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode><ComponentToRender /></React.StrictMode>
)
