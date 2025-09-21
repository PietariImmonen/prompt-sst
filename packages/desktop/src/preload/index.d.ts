import type { ElectronAPI } from "@electron-toolkit/preload";

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

type AuthCallbackPayload = {
  id: string;
  hash: string;
  search: string;
  url: string;
};

type AuthPrepareResult = {
  id: string;
  callbackUrl: string;
};

type DesktopAuthAPI = {
  onCallback: (
    callback: (payload: AuthCallbackPayload) => void,
  ) => () => void;
  prepare: () => Promise<AuthPrepareResult>;
  launch: (payload: { id: string; url: string }) => Promise<void>;
  cancel: (payload: { id: string }) => Promise<void>;
};

type PromptCaptureAPI = {
  onCapture: (
    callback: (payload: PromptCapturePayload) => void,
  ) => () => void;
  onStatus: (callback: (payload: CaptureStatusPayload) => void) => () => void;
  onOpenPalette: (callback: () => void) => () => void;
  enable: () => Promise<boolean>;
  disable: () => Promise<boolean>;
  notifyCapture: (result: { success: boolean; message?: string }) => Promise<void>;
};

declare global {
  interface Window {
    electron: ElectronAPI;
    promptCapture: PromptCaptureAPI;
    desktopAuth: DesktopAuthAPI;
  }
}
