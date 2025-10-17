// eslint-disable
import { hc } from 'hono/client'

import type { Routes } from '@prompt-saver/functions/api'

// Ensure API URL has trailing slash for proper URL construction
const apiUrl = import.meta.env.VITE_API_URL.endsWith('/')
  ? import.meta.env.VITE_API_URL.slice(0, -1) // Remove trailing slash for hono client
  : import.meta.env.VITE_API_URL
// @ts-ignore
export const api = hc<Routes>(apiUrl)
