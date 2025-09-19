import { contextBridge } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

declare global {
  interface Window {
    electron: typeof electronAPI;
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
  } catch (error) {
    console.error("Failed to expose preload API", error);
  }
} else {
  // @ts-expect-error fallback when context isolation disabled
  window.electron = electronAPI;
}
