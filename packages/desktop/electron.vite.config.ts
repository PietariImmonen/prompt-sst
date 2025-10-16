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
        '@prompt-saver/core': resolve(__dirname, '../core/src'),
        '@prompt-saver/functions': resolve(__dirname, '../functions/src'),
        // Polyfill Node.js modules for browser compatibility
        'node:async_hooks': resolve(__dirname, 'src/renderer/src/polyfills/async-hooks.ts')
      }
    },
    optimizeDeps: {
      // Our installed react-router-dom exposes only dist/index.js; skipping prebundle
      // avoids Vite expecting a non-existent dist/index.mjs entry.
      exclude: ['react-router-dom', 'react-router']
    },
    build: {
      rollupOptions: {
        external: [/^sst(\/.*)?$/, /^postgres(\/.*)?$/]
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
