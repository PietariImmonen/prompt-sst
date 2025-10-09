// Background service worker for Chrome extension
import { createId } from '@paralleldrive/cuid2'

type CapturedPrompt = {
  id: string
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

// Removed Replicache - using direct API calls instead to avoid service worker issues

async function refreshAuthState() {
  const raw = await new Promise<unknown | null>((resolve) => {
    chrome.storage.local.get([...AUTH_STORAGE_KEYS], (result) => {
      const value = AUTH_STORAGE_KEYS.map((key) => result[key]).find((entry) => entry != null)
      resolve(value ?? null)
    })
  })

  if (!raw) {
    console.log('No auth state found')
    authState = null
    currentAccount = null
    return
  }

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    authState = parsed as AuthStorage
    currentAccount = computeCurrentAccount(authState)
    console.log('Auth state refreshed:', { hasAccount: !!currentAccount, email: currentAccount?.email })
  } catch (error) {
    console.error('Failed to parse auth state from storage', error)
    authState = null
    currentAccount = null
  }
}

async function refreshWorkspaceId() {
  const stored = await getFromStorage<string>(WORKSPACE_STORAGE_KEY)
  cachedWorkspaceId = typeof stored === 'string' && stored.length > 0 ? stored : null
  console.log('Workspace ID refreshed:', { cachedWorkspaceId })

  // If no cached workspace, try to get from current account
  if (!cachedWorkspaceId && currentAccount?.workspaces?.length) {
    cachedWorkspaceId = currentAccount.workspaces[0].id
    console.log('Using workspace from account:', cachedWorkspaceId)
  }
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

// Initialize auth and workspace on startup
;(async () => {
  await Promise.all([refreshAuthState(), refreshWorkspaceId()])
  console.log('Background initialization complete')
  void syncCapturedPrompts()
})()

// Sync prompts when service worker wakes up (instead of interval-based)
chrome.runtime.onStartup.addListener(() => {
  console.log('Service worker started, checking for pending prompts...')
  void syncCapturedPrompts()
})

// Also try to sync when extension icon is clicked (opens popup)
chrome.action.onClicked.addListener(() => {
  void syncCapturedPrompts()
})

// Save captured prompts to storage
function savePromptsToStorage() {
  chrome.storage.local.set({ capturedPrompts }, () => {
    console.log('Saved', capturedPrompts.length, 'prompts to storage')
  })
}

// Add a captured prompt
function addCapturedPrompt(prompt: Omit<CapturedPrompt, 'id'>) {
  // Deduplicate: skip if same content was captured recently
  const recentDuplicate = capturedPrompts.find(
    p => p.content === prompt.content &&
         Date.now() - p.timestamp < 5000
  )

  if (recentDuplicate) {
    console.log('Skipping duplicate prompt')
    return
  }

  // Generate stable ID for this prompt
  const promptWithId: CapturedPrompt = {
    ...prompt,
    id: createId()
  }

  capturedPrompts.push(promptWithId)
  savePromptsToStorage()

  void syncCapturedPrompts()

  // Notify any open popups that a new prompt was captured
  chrome.runtime.sendMessage({
    type: 'PROMPT_ADDED',
    payload: promptWithId
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
    console.log('Sync already in progress, skipping')
    return
  }

  if (capturedPrompts.length === 0) {
    console.log('No captured prompts to sync')
    return
  }

  // Check auth state
  if (!currentAccount || !cachedWorkspaceId) {
    console.log('Refreshing auth and workspace state...')
    await refreshAuthState()
    await refreshWorkspaceId()
  }

  if (!currentAccount?.token || !cachedWorkspaceId) {
    console.error('Cannot sync prompts - missing credentials:', {
      hasToken: !!currentAccount?.token,
      hasWorkspace: !!cachedWorkspaceId
    })
    console.log('Prompts will remain queued and sync on next attempt')
    return
  }

  isSyncing = true
  console.log(`Starting sync of ${capturedPrompts.length} prompts via API...`)

  try {
    const queue = [...capturedPrompts]

    for (const prompt of queue) {
      try {
        console.log('Syncing prompt:', { id: prompt.id, title: prompt.title, source: prompt.source })

        // Direct API call instead of Replicache
        const response = await fetch(`${apiBaseUrl}/prompt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentAccount.token}`,
            'x-prompt-saver-workspace': cachedWorkspaceId
          },
          body: JSON.stringify({
            id: prompt.id,
            content: prompt.content,
            title: prompt.title,
            source: prompt.source,
            categoryPath: `inbox/${prompt.source}`,
            metadata: {
              url: prompt.url,
              captureTimestamp: prompt.timestamp.toString(),
              captureSource: 'chrome-extension'
            }
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API error: ${response.status} ${errorText}`)
        }

        console.log('✅ Successfully synced prompt via API:', prompt.title, 'with ID:', prompt.id)

        capturedPrompts = capturedPrompts.filter((item) => item !== prompt)
        savePromptsToStorage()

        chrome.runtime.sendMessage({
          type: 'PROMPT_SYNCED',
          payload: { timestamp: prompt.timestamp }
        }).catch(() => {
          // No listeners, safe to ignore
        })
      } catch (error) {
        console.error('❌ Failed to sync captured prompt via API:', error)
        // Don't break - try next prompt
        // break removed to attempt all prompts
      }
    }

    console.log(`Sync complete. Remaining prompts: ${capturedPrompts.length}`)
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
