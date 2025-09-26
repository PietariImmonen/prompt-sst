import * as React from 'react'

export type Theme = 'dark' | 'light' | 'system'

type ThemeState = {
  theme: Theme
  systemTheme: Theme
}

const STORAGE_KEY = 'prompt-desktop-theme'
const subscribers = new Set<() => void>()

let initialized = false
let state: ThemeState = {
  theme: 'system',
  systemTheme: 'light'
}

const getSystemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const applyTheme = (theme: Theme, systemTheme: Theme) => {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')

  const resolvedTheme = theme === 'system' ? systemTheme : theme
  root.classList.add(resolvedTheme)
}

const notify = () => {
  subscribers.forEach((listener) => listener())
}

const setTheme = (theme: Theme) => {
  if (state.theme === theme) return

  state = { ...state, theme }

  window.localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(state.theme, state.systemTheme)
  notify()
}

const initialize = () => {
  if (initialized || typeof window === 'undefined') {
    return
  }

  initialized = true

  const storedTheme = window.localStorage.getItem(STORAGE_KEY) as Theme | null
  const systemTheme = getSystemTheme()
  state = {
    theme: storedTheme ?? 'system',
    systemTheme
  }

  applyTheme(state.theme, state.systemTheme)

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const legacyMediaQuery = mediaQuery as MediaQueryList & {
    addListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void
  }
  const handleSystemThemeChange = (event: MediaQueryListEvent) => {
    state = {
      ...state,
      systemTheme: event.matches ? 'dark' : 'light'
    }

    if (state.theme === 'system') {
      applyTheme(state.theme, state.systemTheme)
    }

    notify()
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  } else if (typeof legacyMediaQuery.addListener === 'function') {
    legacyMediaQuery.addListener(handleSystemThemeChange)
  }
}

if (typeof window !== 'undefined') {
  initialize()
}

export const useTheme = () => {
  const [themeState, setThemeState] = React.useState<ThemeState>(() => state)

  React.useEffect(() => {
    initialize()

    const listener = () => setThemeState(state)
    subscribers.add(listener)

    return () => {
      subscribers.delete(listener)
    }
  }, [])

  const updateTheme = React.useCallback((theme: Theme) => {
    if (typeof window === 'undefined') {
      return
    }

    initialize()
    setTheme(theme)
  }, [])

  return React.useMemo(
    () => ({
      ...themeState,
      setTheme: updateTheme
    }),
    [themeState, updateTheme]
  )
}
