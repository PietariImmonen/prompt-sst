import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  autoSave: boolean
  showNotifications: boolean
  defaultCategory: string
  shortcutsEnabled: boolean
  autoCategorization: boolean
  openrouter_api_key?: string
}

interface AppStore {
  // State
  settings: AppSettings
  isOnline: boolean
  currentView: 'dashboard' | 'library' | 'public-browse' | 'settings'
  sidebarCollapsed: boolean

  // Actions
  updateSettings: (settings: Partial<AppSettings>) => void
  setOnlineStatus: (isOnline: boolean) => void
  setCurrentView: (view: 'dashboard' | 'library' | 'public-browse' | 'settings') => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

const defaultSettings: AppSettings = {
  theme: 'system',
  autoSave: true,
  showNotifications: true,
  defaultCategory: 'Other',
  shortcutsEnabled: true,
  autoCategorization: true
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: defaultSettings,
      isOnline: navigator.onLine,
      currentView: 'dashboard',
      sidebarCollapsed: false,

      // Actions
      updateSettings: (newSettings: Partial<AppSettings>) => {
        const { settings } = get()
        set({
          settings: { ...settings, ...newSettings }
        })
      },

      setOnlineStatus: (isOnline: boolean) => {
        set({ isOnline })
      },

      setCurrentView: (view: 'dashboard' | 'library' | 'public-browse' | 'settings') => {
        set({ currentView: view })
      },

      toggleSidebar: () => {
        const { sidebarCollapsed } = get()
        set({ sidebarCollapsed: !sidebarCollapsed })
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed })
      }
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        settings: state.settings,
        sidebarCollapsed: state.sidebarCollapsed
      })
    }
  )
)

// Initialize online status listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAppStore.getState().setOnlineStatus(true)
  })

  window.addEventListener('offline', () => {
    useAppStore.getState().setOnlineStatus(false)
  })
}
