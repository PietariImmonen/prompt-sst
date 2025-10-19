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

type UpdaterStatusPayload = {
  event: string;
  data?: unknown;
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

type TranscriptionAPI = {
  getStatus: () => Promise<{
    status: string;
    isRecording: boolean;
    hasApiKey: boolean;
  }>;
  requestMicrophoneAccess: () => Promise<boolean>;
};

type UpdaterAPI = {
  onStatus: (callback: (payload: UpdaterStatusPayload) => void) => () => void;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  getVersion: () => Promise<string>;
};

type ShortcutUpdatePayload = {
  capture: string;
  palette: string;
  transcribe: string;
};

type ShortcutUpdateResult = {
  success: boolean;
  requiresRestart: boolean;
  message?: string;
};

type ShortcutsAPI = {
  update: (shortcuts: ShortcutUpdatePayload) => Promise<void>;
  onUpdateResult: (
    callback: (result: ShortcutUpdateResult) => void,
  ) => () => void;
};

declare global {
  interface Window {
    electron: ElectronAPI;
    promptCapture: PromptCaptureAPI;
    desktopAuth: DesktopAuthAPI;
    transcription: TranscriptionAPI;
    desktopUpdater: UpdaterAPI;
    shortcuts: ShortcutsAPI;
  }
}
