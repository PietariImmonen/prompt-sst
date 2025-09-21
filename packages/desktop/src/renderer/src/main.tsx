import './assets/main.css'

import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import OverlayApp from './OverlayApp'

// Check if we're in overlay mode based on the URL hash
const isOverlayMode = window.location.hash === '#overlay'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>{isOverlayMode ? <OverlayApp /> : <App />}</React.StrictMode>
)
