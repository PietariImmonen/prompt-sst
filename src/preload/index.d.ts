import { ElectronAPI } from '@electron-toolkit/preload'
import type { AuthBridge } from '../shared/types/bridge'

declare global {
  interface Window {
    electron: ElectronAPI
    auth: AuthBridge
    api: {
      auth: AuthBridge
      [key: string]: unknown
    }
  }
}
