import { hc } from 'hono/client'

import type { Routes } from '@prompt-saver/functions/api'

export const api = hc<Routes>(import.meta.env.VITE_API_URL)
