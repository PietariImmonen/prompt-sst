import { hc } from 'hono/client'

import type { Routes } from '@sst-replicache-template/functions/api'

export const api = hc<Routes>(import.meta.env.VITE_API_URL)
