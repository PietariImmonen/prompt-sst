import { useAppStore } from '../store/app'

/**
 * Custom hook for app state management
 */
export const useApp = () => {
  const appStore = useAppStore()

  return {
    settings: appStore.settings,
    isOnline: appStore.isOnline,
    currentView: appStore.currentView,
    sidebarCollapsed: appStore.sidebarCollapsed,
    updateSettings: appStore.updateSettings,
    setCurrentView: appStore.setCurrentView,
    toggleSidebar: appStore.toggleSidebar,
    setSidebarCollapsed: appStore.setSidebarCollapsed
  }
}
