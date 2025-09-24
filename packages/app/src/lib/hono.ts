import { Routes } from "@prompt-saver/functions/api";
import { hc } from "hono/client";

export const api = hc<Routes>(import.meta.env.VITE_API_URL);
