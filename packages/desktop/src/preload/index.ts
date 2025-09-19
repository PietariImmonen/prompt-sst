import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

type PromptCapturePayload = {
  content: string;
  title: string;
  source: "chatgpt" | "claude" | "gemini" | "grok" | "other";
  categoryPath: string;
  visibility: "private" | "workspace";
  isFavorite: boolean;
  metadata?: Record<string, string | number | boolean | null>;
};

type CaptureStatus = "idle" | "listening" | "capturing" | "success" | "failed";

type CaptureStatusPayload = {
  status: CaptureStatus;
  message?: string;
};

interface PromptCaptureAPI {
  onCapture: (
    callback: (payload: PromptCapturePayload) => void,
  ) => () => void;
  onStatus: (callback: (payload: CaptureStatusPayload) => void) => () => void;
  enable: () => Promise<boolean>;
  disable: () => Promise<boolean>;
  notifyCapture: (result: { success: boolean; message?: string }) => Promise<void>;
}

const promptCapture: PromptCaptureAPI = {
  onCapture(callback) {
    const listener = (_event: Electron.IpcRendererEvent, payload: PromptCapturePayload) => {
      callback(payload);
    };
    ipcRenderer.on("prompt:capture", listener);
    return () => {
      ipcRenderer.removeListener("prompt:capture", listener);
    };
  },
  onStatus(callback) {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: CaptureStatusPayload,
    ) => {
      callback(payload);
    };
    ipcRenderer.on("prompt:capture:status", listener);
    return () => {
      ipcRenderer.removeListener("prompt:capture:status", listener);
    };
  },
  enable() {
    return ipcRenderer.invoke("prompt:capture:enable");
  },
  disable() {
    return ipcRenderer.invoke("prompt:capture:disable");
  },
  notifyCapture(result) {
    return ipcRenderer.invoke("prompt:capture:result", result);
  },
};

declare global {
  interface Window {
    electron: typeof electronAPI;
    promptCapture: PromptCaptureAPI;
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("promptCapture", promptCapture);
  } catch (error) {
    console.error("Failed to expose preload API", error);
  }
} else {
  // @ts-expect-error fallback when context isolation disabled
  window.electron = electronAPI;
  // @ts-expect-error fallback when context isolation disabled
  window.promptCapture = promptCapture;
}
