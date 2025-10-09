// Background service worker for Chrome extension

type CapturedPrompt = {
  content: string
  title: string
  source: 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'other'
  url: string
  timestamp: number
}

type StoredWorkspace = {
  id: string
  name?: string
}

type StoredAccount = {
  token: string
  email?: string
  workspaces?: StoredWorkspace[]
}

type AuthStorage = {
  accounts: Record<string, StoredAccount>
  current?: string
}

const AUTH_STORAGE_KEYS = ['prompt-saver.auth', 'prompt-saver-auth'] as const
const WORKSPACE_STORAGE_KEY = 'prompt-saver.workspace'

const apiBaseUrl = (process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '')

let authState: AuthStorage | null = null
let currentAccount: StoredAccount | null = null
let cachedWorkspaceId: string | null = null
let isSyncing = false

// Store captured prompts in memory (service workers can be terminated)
// We'll also persist to chrome.storage.local for durability
let capturedPrompts: CapturedPrompt[] = []

function getFromStorage<T = unknown>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] as T | undefined)
    })
  })
}

function computeCurrentAccount(store: AuthStorage | null): StoredAccount | null {
  if (!store) return null
  if (store.current && store.accounts[store.current]) {
    return store.accounts[store.current]
  }
  const firstKey = Object.keys(store.accounts)[0]
  return firstKey ? store.accounts[firstKey] : null
}

async function refreshAuthState() {
  const raw = await new Promise<unknown | null>((resolve) => {
    chrome.storage.local.get([...AUTH_STORAGE_KEYS], (result) => {
      const value = AUTH_STORAGE_KEYS.map((key) => result[key]).find((entry) => entry != null)
      resolve(value ?? null)
    })
  })

  if (!raw) {
    authState = null
    currentAccount = null
    return
  }

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    authState = parsed as AuthStorage
    currentAccount = computeCurrentAccount(authState)
  } catch (error) {
    console.error('Failed to parse auth state from storage', error)
    authState = null
    currentAccount = null
  }
}

async function refreshWorkspaceId() {
  const stored = await getFromStorage<string>(WORKSPACE_STORAGE_KEY)
  cachedWorkspaceId = typeof stored === 'string' && stored.length > 0 ? stored : null
}

async function resolveWorkspaceId(account: StoredAccount | null): Promise<string | null> {
  if (!account) {
    return null
  }

  if (!cachedWorkspaceId) {
    await refreshWorkspaceId()
  }

  if (cachedWorkspaceId) {
    return cachedWorkspaceId
  }

  const workspace = account.workspaces?.[0]
  return workspace?.id || null
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return

  if (AUTH_STORAGE_KEYS.some((key) => key in changes)) {
    void refreshAuthState().then(() => {
      void syncCapturedPrompts()
    })
  }

  if (WORKSPACE_STORAGE_KEY in changes) {
    cachedWorkspaceId = null
    void refreshWorkspaceId().then(() => {
      void syncCapturedPrompts()
    })
  }
})

// Load captured prompts from storage on startup
chrome.storage.local.get('capturedPrompts', (result) => {
  if (result.capturedPrompts) {
    capturedPrompts = result.capturedPrompts
    console.log('Loaded', capturedPrompts.length, 'captured prompts from storage')
  }
})

void refreshAuthState().then(() => {
  void syncCapturedPrompts()
})
void refreshWorkspaceId()

setInterval(() => {
  void syncCapturedPrompts()
}, 30000)

// Save captured prompts to storage
function savePromptsToStorage() {
  chrome.storage.local.set({ capturedPrompts }, () => {
    console.log('Saved', capturedPrompts.length, 'prompts to storage')
  })
}

// Add a captured prompt
function addCapturedPrompt(prompt: CapturedPrompt) {
  // Deduplicate: skip if same content was captured recently
  const recentDuplicate = capturedPrompts.find(
    p => p.content === prompt.content &&
         Date.now() - p.timestamp < 5000
  )

  if (recentDuplicate) {
    console.log('Skipping duplicate prompt')
    return
  }

  capturedPrompts.push(prompt)
  savePromptsToStorage()

  void syncCapturedPrompts()

  // Notify any open popups that a new prompt was captured
  chrome.runtime.sendMessage({
    type: 'PROMPT_ADDED',
    payload: prompt
  }).catch(() => {
    // No listeners, that's fine
  })
}

// Get all captured prompts
function getCapturedPrompts(): CapturedPrompt[] {
  return capturedPrompts
}

// Clear captured prompts (called after syncing)
function clearCapturedPrompts() {
  capturedPrompts = []
  savePromptsToStorage()
}

async function syncCapturedPrompts() {
  if (isSyncing) {
    return
  }

  if (capturedPrompts.length === 0) {
    return
  }

  if (!currentAccount) {
    await refreshAuthState()
  }

  const account = currentAccount
  if (!account?.token) {
    console.warn('Cannot sync prompts: no authenticated account')
    return
  }

  const workspaceId = await resolveWorkspaceId(account)
  if (!workspaceId) {
    console.warn('Cannot sync prompts: no workspace selected')
    return
  }

  isSyncing = true

  try {
    const queue = [...capturedPrompts]

    for (const prompt of queue) {
      try {
        const response = await fetch(`${apiBaseUrl}/prompt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${account.token}`,
            'x-prompt-saver-workspace': workspaceId
          },
          body: JSON.stringify({
            title: prompt.title,
            content: prompt.content,
            source: prompt.source,
            categoryPath: `inbox/${prompt.source}`,
            visibility: 'private',
            isFavorite: false,
            metadata: {
              url: prompt.url,
              captureTimestamp: prompt.timestamp,
              captureSource: 'chrome-extension'
            }
          })
        })

        if (!response.ok) {
          const detail = await response.text().catch(() => response.statusText)
          throw new Error(`Failed with status ${response.status}: ${detail}`)
        }

        capturedPrompts = capturedPrompts.filter((item) => item !== prompt)
        savePromptsToStorage()

        chrome.runtime.sendMessage({
          type: 'PROMPT_SYNCED',
          payload: { timestamp: prompt.timestamp }
        }).catch(() => {
          // No listeners, safe to ignore
        })
      } catch (error) {
        console.error('Failed to sync captured prompt:', error)
        break
      }
    }
  } finally {
    isSyncing = false
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AUTH_SUCCESS") {
    // Forward auth success to all extension contexts
    chrome.runtime.sendMessage(message).catch(() => {})
  }

  if (message.type === "PROMPT_CAPTURED") {
    console.log('Received captured prompt:', message.payload.title)
    addCapturedPrompt({
      ...message.payload,
      timestamp: Date.now()
    })
    sendResponse({ success: true })
  }

  if (message.type === "GET_CAPTURED_PROMPTS") {
    sendResponse({ prompts: getCapturedPrompts() })
  }

  if (message.type === "CLEAR_CAPTURED_PROMPTS") {
    clearCapturedPrompts()
    sendResponse({ success: true })
  }

  return true
})

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Prompt Saver extension installed")
})

export {}
