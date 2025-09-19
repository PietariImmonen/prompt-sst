import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@desktop': resolve(__dirname, 'src/renderer/src'),
        '@': resolve(__dirname, 'src/renderer/src'),
        '@sst-replicache-template/core': resolve(__dirname, '../core/src'),
        '@sst-replicache-template/functions': resolve(__dirname, '../functions/src')
      }
    },
    define: {
      'process.env': {},
      process: {
        env: {}
      }
    },
    plugins: [tailwindcss(), react()]
  }
})
