import { hc } from "hono/client"

import type { Routes } from "@prompt-saver/functions/api"

const apiUrl = process.env.PLASMO_PUBLIC_API_URL || "http://localhost:3000"

export const api = hc<Routes>(apiUrl)
