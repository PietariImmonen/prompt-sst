# Universal Text Improvement Feature (Cmd+Shift+U)

- ID: 19-universal-text-improvement
- Owner: TBA
- Priority: P1
- Target Release: Sprint 3

## 1. Requirements Discovery

### 1.1. Context Snapshot

This feature enables users to highlight text anywhere on their system, press `Cmd+Shift+U` (macOS) / `Ctrl+Shift+U` (Windows/Linux), and have that text automatically improved by an LLM. The improved text is then automatically inserted back into the original field if editable, or placed in the clipboard for manual pasting.

**Key Differentiators from Existing Features:**
- **vs Prompt Capture (Cmd+Shift+C)**: This feature *transforms* text in place, not just saves it
- **vs Prompt Insertion (Cmd+Shift+O)**: This *improves* selected text, not inserts pre-saved prompts
- **vs Transcription (Cmd+Shift+T)**: This processes *text*, not audio

**Persona Impacted:**
- Writers who want to polish their drafts
- Professionals crafting emails and messages
- Students improving assignment text
- Developers writing better documentation
- Anyone using AI chat interfaces (ChatGPT, Claude, etc.)

### 1.2. Goals & Non-Goals

**Goals:**
- **G1: Frictionless Improvement**: Single shortcut press improves any highlighted text
- **G2: Automatic Insertion**: Improved text automatically replaces original in editable fields
- **G3: Real-time Preview**: Users see improvement happening with streaming tokens
- **G4: Clipboard Fallback**: Non-editable text improved to clipboard with notification
- **G5: Cross-Platform**: Works on macOS, Windows, Linux
- **G6: Multi-Provider Support**: OpenAI, Anthropic, or custom LLM endpoints

**Non-Goals:**
- **NG1: Automatic Submission**: Won't auto-send messages after improvement (user reviews first)
- **NG2: Source Detection**: Won't detect which app/LLM the text is from
- **NG3: Multi-Language Translation**: Focus on improvement, not translation
- **NG4: Offline Mode**: Requires internet connection for LLM API

### 1.3. User Stories

**US-001: ChatGPT Prompt Improvement**
```
As a ChatGPT user
I want to improve my prompts before sending
So that I get better AI responses

Acceptance:
- Highlight prompt in ChatGPT input
- Press Cmd+Shift+U
- See streaming improvement preview
- Improved text auto-replaces original
- Press Enter to send improved prompt
```

**US-002: Email Writing Enhancement**
```
As a professional writing emails
I want to polish my draft messages
So that my communication is more effective

Acceptance:
- Write draft email in Gmail/Outlook
- Highlight draft text
- Press Cmd+Shift+U
- See side-by-side comparison
- Improved text replaces draft
- Review and send
```

**US-003: Documentation Improvement**
```
As a developer writing docs
I want to improve my documentation text
So that it's clearer for readers

Acceptance:
- Write rough docs in VS Code
- Highlight paragraph
- Press Cmd+Shift+U
- Improved text inserted automatically
- Continue editing
```

**US-004: Read-Only Text Enhancement**
```
As a user copying from documentation
I want to improve copied examples
So that I can paste better versions into my work

Acceptance:
- Highlight read-only text in browser
- Press Cmd+Shift+U
- See notification: "Improved text in clipboard"
- Paste manually into target app
```

---

## 2. Architecture Planning

### 2.1. System Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        TextImprovementService (Orchestrator)         │  │
│  │  - Global shortcut (Cmd+Shift+U)                     │  │
│  │  - Workflow state machine                            │  │
│  │  - Overlay window management                         │  │
│  └────┬──────────────┬──────────────┬────────────────┘  │
│       │              │              │                       │
│  ┌────▼────┐    ┌───▼────┐    ┌────▼────┐    ┌─────────┐ │
│  │Text     │    │LLM     │    │Text     │    │Overlay  │ │
│  │Extract  │    │Improve │    │Insert   │    │Window   │ │
│  │Service  │    │Service │    │Service  │    │Manager  │ │
│  └────┬────┘    └───┬────┘    └────┬────┘    └────┬────┘ │
│       │             │              │              │        │
│  ┌────▼─────────────▼──────────────▼──────────────▼────┐ │
│  │         Integration with Existing Services          │ │
│  │  - BackgroundDataService (history persistence)      │ │
│  │  - Logger (error tracking)                          │ │
│  │  - TrayService (status indication)                  │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ IPC Communication
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   ELECTRON RENDERER PROCESS                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │       ImprovementOverlay React Component             │  │
│  │  - Real-time streaming preview                       │  │
│  │  - Side-by-side comparison                           │  │
│  │  - Action buttons (Insert/Copy/Cancel)               │  │
│  │  - Keyboard shortcuts (Enter/Esc/Cmd+Z)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2. Data Flow Sequence

```
User Action: Highlight text + Press Cmd+Shift+U
                    ↓
[1] TextImprovementService.handleShortcut()
    - Check feature enabled
    - Check API key configured
    - Show loading overlay
                    ↓
[2] TextExtractionService.extract()
    - Try Tier 1: Accessibility API (macOS AppleScript)
    - Try Tier 2: Clipboard copy (Cmd+C simulation)
    - Try Tier 3: Manual input prompt
    → Returns: { text, isEditable, focusContext }
                    ↓
[3] Show Overlay with Original Text
    - Display extracted text preview
    - Show "Processing..." spinner
                    ↓
[4] LLMImprovementService.improveText()
    - Send to OpenAI/Anthropic API
    - Stream tokens back via IPC
    - Update overlay in real-time
    → Returns: { improvedText, metadata }
                    ↓
[5] Show Complete State in Overlay
    - Side-by-side comparison
    - Buttons: [Insert] [Copy] [Cancel]
    - Wait for user action
                    ↓
[6a] User Clicks "Insert" OR Presses Enter
     ↓
     TextInsertionService.insert()
     - Restore focus to original field
     - Try Method 1: Direct typing (@nut-tree/nut-js)
     - Try Method 2: Clipboard paste
     - Fallback: Leave in clipboard
     ↓
     Success notification → Close overlay

[6b] User Clicks "Copy" OR Presses Cmd+C
     ↓
     Copy to clipboard → Show notification → Close overlay

[6c] User Clicks "Cancel" OR Presses Esc
     ↓
     Close overlay → No action
```

### 2.3. Technology Stack

**New Dependencies:**
- None required! All functionality uses existing dependencies:
  - `@nut-tree/nut-js` (already installed) - keyboard/mouse automation
  - `electron` built-in clipboard and globalShortcut APIs
  - Native `fetch` for LLM API calls (no SDK needed)

**Platform-Specific APIs:**
- **macOS**: AppleScript for accessibility, NSPasteboard for clipboard
- **Windows**: UI Automation via PowerShell, Win32 clipboard
- **Linux**: X11 selection API, xclip/xdotool utilities

---

## 3. Implementation Blueprint

### 3.1. File Structure

```
packages/desktop/src/
├── main/
│   ├── text-improvement-service.ts          [NEW] Main orchestration
│   ├── text-extraction-service.ts           [NEW] Multi-tier extraction
│   ├── text-insertion-service.ts            [NEW] Platform-specific insertion
│   ├── llm-improvement-service.ts           [NEW] LLM API abstraction
│   ├── providers/
│   │   ├── openai-provider.ts              [NEW] OpenAI GPT integration
│   │   ├── anthropic-provider.ts           [NEW] Claude integration
│   │   └── base-provider.ts                [NEW] Provider interface
│   └── index.ts                            [MODIFY] Add service initialization
│
├── renderer/src/
│   ├── pages/
│   │   └── text-improvement-overlay.tsx    [NEW] Overlay UI component
│   └── hooks/
│       └── use-text-improvement.ts         [NEW] IPC communication hook
│
└── preload/
    └── index.ts                             [MODIFY] Add textImprovement API
```

### 3.2. Phase 1: Core Service Infrastructure (Days 1-2)

**Deliverable:** Basic service skeleton and shortcut registration

#### Step 1.1: Create TextImprovementService Skeleton

**File:** `/packages/desktop/src/main/text-improvement-service.ts`

**Key Responsibilities:**
- Global shortcut registration/unregistration
- Workflow state machine (idle → extracting → processing → complete → inserting)
- Overlay window lifecycle management
- Error handling and recovery
- Integration with existing logger

**Implementation Pattern:**
Follow existing `transcription-service.ts` pattern (lines 1-200):
- Use `globalShortcut` API
- Create overlay `BrowserWindow` near cursor
- Implement `initialize()`, `dispose()`, `isEnabled()` methods
- Use `logger` for all operations

**Success Criteria:**
- ✅ Service initializes without errors
- ✅ Shortcut registers successfully (Cmd+Shift+U / Ctrl+Shift+U)
- ✅ Pressing shortcut logs event and shows placeholder overlay
- ✅ Service disposes cleanly on app quit

#### Step 1.2: Create Overlay Window and Basic UI

**File:** `/packages/desktop/src/renderer/src/pages/text-improvement-overlay.tsx`

**UI States:**
1. **Loading**: Spinner + "Extracting text..."
2. **Processing**: Streaming preview + token count
3. **Complete**: Side-by-side comparison + action buttons
4. **Error**: Error message + retry button

**Component Structure:**
```tsx
export function TextImprovementOverlay() {
  const [state, setState] = useState<'loading' | 'processing' | 'complete' | 'error'>('loading')
  const [originalText, setOriginalText] = useState('')
  const [improvedText, setImprovedText] = useState('')
  const [canInsert, setCanInsert] = useState(false)

  // IPC listeners
  useTextImprovementStatus(setState)
  useTextImprovementTokens(setImprovedText)
  useTextImprovementResult(({ original, improved, canInsert }) => {
    setOriginalText(original)
    setImprovedText(improved)
    setCanInsert(canInsert)
    setState('complete')
  })

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') window.textImprovement.insert()
      if (e.key === 'Escape') window.textImprovement.cancel()
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') window.textImprovement.copy()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="improvement-overlay">
      {state === 'loading' && <LoadingState />}
      {state === 'processing' && <ProcessingState text={improvedText} />}
      {state === 'complete' && (
        <CompleteState
          original={originalText}
          improved={improvedText}
          canInsert={canInsert}
          onInsert={() => window.textImprovement.insert()}
          onCopy={() => window.textImprovement.copy()}
          onCancel={() => window.textImprovement.cancel()}
        />
      )}
      {state === 'error' && <ErrorState />}
    </div>
  )
}
```

**Success Criteria:**
- ✅ Overlay appears near cursor when shortcut pressed
- ✅ Overlay is always on top, frameless, transparent background
- ✅ Keyboard shortcuts work (Enter, Esc, Cmd+C)
- ✅ UI matches Tailwind design system

#### Step 1.3: Set Up IPC Communication

**File:** `/packages/desktop/src/preload/index.ts` (modify)

Add to preload API:
```typescript
const textImprovement = {
  onStatus: (callback: (status: ImprovementStatus) => void) => {
    const listener = (_: any, status: ImprovementStatus) => callback(status)
    ipcRenderer.on('improvement:status', listener)
    return () => ipcRenderer.removeListener('improvement:status', listener)
  },

  onToken: (callback: (token: string) => void) => {
    const listener = (_: any, token: string) => callback(token)
    ipcRenderer.on('improvement:token', listener)
    return () => ipcRenderer.removeListener('improvement:token', listener)
  },

  onResult: (callback: (result: ImprovementResult) => void) => {
    const listener = (_: any, result: ImprovementResult) => callback(result)
    ipcRenderer.on('improvement:result', listener)
    return () => ipcRenderer.removeListener('improvement:result', listener)
  },

  insert: () => ipcRenderer.send('improvement:insert'),
  copy: () => ipcRenderer.send('improvement:copy'),
  cancel: () => ipcRenderer.send('improvement:cancel'),
  undo: () => ipcRenderer.send('improvement:undo')
}

contextBridge.exposeInMainWorld('textImprovement', textImprovement)
```

**Success Criteria:**
- ✅ Main → Renderer communication works (status updates)
- ✅ Renderer → Main communication works (button clicks)
- ✅ Type-safe APIs with proper TypeScript definitions

---

### 3.3. Phase 2: Text Extraction (Days 3-4)

**Deliverable:** Reliable text extraction across platforms

#### Step 2.1: Implement Clipboard-Based Extraction (Tier 2 - Start Here)

**File:** `/packages/desktop/src/main/text-extraction-service.ts`

**Why Start with Clipboard:**
- Already proven reliable in `capture-service.ts` (lines 589-651)
- Works across all platforms consistently
- Minimal platform-specific code

**Implementation:**
```typescript
export class TextExtractionService {
  async extract(): Promise<ExtractionResult> {
    try {
      // Try clipboard method first (most reliable)
      return await this.extractViaClipboard()
    } catch (error) {
      await logger.error('extraction', 'All extraction methods failed', error)
      throw new ExtractionError('Could not extract text')
    }
  }

  private async extractViaClipboard(): Promise<ExtractionResult> {
    const previousClipboard = clipboard.readText()

    try {
      // Simulate Cmd+C / Ctrl+C
      await this.simulateCopyCommand()
      await this.delay(200) // Wait for clipboard update

      const copiedText = clipboard.readText()

      // Restore original clipboard
      setTimeout(() => clipboard.writeText(previousClipboard), 500)

      if (!copiedText || copiedText === previousClipboard) {
        throw new Error('No new text copied')
      }

      return {
        text: copiedText,
        isEditable: null, // Unknown with clipboard method
        method: 'clipboard',
        focusContext: await this.detectFocusedApp()
      }
    } catch (error) {
      clipboard.writeText(previousClipboard) // Immediate restore
      throw error
    }
  }

  private async simulateCopyCommand(): Promise<void> {
    const modifier = process.platform === 'darwin' ? Key.LeftSuper : Key.LeftControl
    await keyboard.pressKey(modifier)
    await keyboard.pressKey(Key.C)
    await keyboard.releaseKey(Key.C)
    await keyboard.releaseKey(modifier)
  }

  private async detectFocusedApp(): Promise<FocusContext> {
    if (process.platform === 'darwin') {
      const script = `
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          set frontWindow to name of front window of application process frontApp
          return {frontApp, frontWindow}
        end tell
      `
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' })
      const [appName, windowName] = result.trim().split(', ')
      return { appName, windowName }
    }
    // Windows/Linux implementations...
    return { appName: 'Unknown', windowName: 'Unknown' }
  }
}
```

**Success Criteria:**
- ✅ Extracts selected text reliably in 5+ apps (Chrome, Slack, VS Code, TextEdit, Notion)
- ✅ Restores original clipboard content
- ✅ Handles empty selection gracefully
- ✅ Detects source app and window name

#### Step 2.2: Add macOS Accessibility API Extraction (Tier 1 - Future Enhancement)

**File:** Same file, add method

**Implementation:**
```typescript
private async extractViaMacAccessibility(): Promise<ExtractionResult> {
  try {
    const script = `
      tell application "System Events"
        tell (first application process whose frontmost is true)
          set focusedElement to focused element of window 1
          set selectedText to value of attribute "AXSelectedText" of focusedElement
          set elementRole to value of attribute "AXRole" of focusedElement
          set isEditable to elementRole is in {"AXTextField", "AXTextArea", "AXTextView"}
          return selectedText & "|" & (isEditable as string)
        end tell
      end tell
    `

    const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8', timeout: 2000 })
    const [text, editableStr] = result.trim().split('|')

    return {
      text,
      isEditable: editableStr === 'true',
      method: 'accessibility',
      focusContext: await this.detectFocusedApp()
    }
  } catch (error) {
    throw new ExtractionError('Accessibility API failed', error)
  }
}
```

**Note:** This is optional for MVP. Start with clipboard method, add this later for better editability detection.

---

### 3.4. Phase 3: LLM Integration (Days 5-6)

**Deliverable:** Working LLM API integration with streaming

#### Step 3.1: Create Base LLM Provider Interface

**File:** `/packages/desktop/src/main/providers/base-provider.ts`

```typescript
export interface LLMProvider {
  improveText(
    text: string,
    options: ImprovementOptions
  ): AsyncGenerator<string, ImprovementResult, void>

  estimateCost(text: string): Promise<CostEstimate>
  testConnection(): Promise<boolean>
}

export interface ImprovementOptions {
  style?: 'professional' | 'casual' | 'concise' | 'detailed'
  temperature?: number
  maxTokens?: number
}

export interface ImprovementResult {
  improvedText: string
  model: string
  tokensUsed: number
  estimatedCost: number
  processingTimeMs: number
}

export interface CostEstimate {
  inputTokens: number
  estimatedOutputTokens: number
  totalCostUSD: number
}
```

#### Step 3.2: Implement OpenAI Provider

**File:** `/packages/desktop/src/main/providers/openai-provider.ts`

```typescript
export class OpenAIProvider implements LLMProvider {
  private apiKey: string
  private baseURL = 'https://api.openai.com/v1'
  private model = 'gpt-4o-mini' // Cost-effective for text improvement

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('OpenAI API key required')
    this.apiKey = apiKey
  }

  async *improveText(text: string, options: ImprovementOptions) {
    const startTime = Date.now()
    let improvedText = ''
    let tokensUsed = 0

    const systemPrompt = this.buildSystemPrompt(options.style)

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Improve this text:\n\n${text}` }
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '))

      for (const line of lines) {
        const data = line.slice(6) // Remove 'data: ' prefix
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices[0]?.delta?.content
          if (content) {
            improvedText += content
            yield content // Stream token to UI
          }
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }

    const processingTimeMs = Date.now() - startTime

    return {
      improvedText,
      model: this.model,
      tokensUsed: this.estimateTokens(text + improvedText),
      estimatedCost: this.calculateCost(tokensUsed),
      processingTimeMs
    }
  }

  private buildSystemPrompt(style?: string): string {
    const basePrompt = `You are a text improvement assistant. Improve the given text while preserving its core meaning and intent.`

    const styleGuides = {
      professional: 'Use formal, professional language suitable for business.',
      casual: 'Use friendly, conversational language while maintaining clarity.',
      concise: 'Make the text as concise as possible while retaining key information.',
      detailed: 'Expand with additional context and detail.'
    }

    const styleGuide = styleGuides[style || 'professional']

    return `${basePrompt}\n\n${styleGuide}\n\nReturn ONLY the improved text without explanations.`
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
  }

  private calculateCost(tokens: number): number {
    // GPT-4o-mini: $0.15 per 1M input tokens, $0.60 per 1M output tokens
    const inputCost = (tokens / 2) * 0.00000015 // Assume 50% input
    const outputCost = (tokens / 2) * 0.00000060 // Assume 50% output
    return inputCost + outputCost
  }

  async estimateCost(text: string): Promise<CostEstimate> {
    const inputTokens = this.estimateTokens(text)
    const estimatedOutputTokens = inputTokens * 1.5 // Improved text usually longer
    const totalCostUSD = this.calculateCost(inputTokens + estimatedOutputTokens)

    return { inputTokens, estimatedOutputTokens, totalCostUSD }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      })
      return response.ok
    } catch {
      return false
    }
  }
}
```

**Success Criteria:**
- ✅ Connects to OpenAI API with valid key
- ✅ Streams tokens back in real-time
- ✅ Handles errors gracefully (401, 429, 500)
- ✅ Estimates cost before processing
- ✅ Returns complete improved text

#### Step 3.3: Implement LLM Improvement Service (Orchestrator)

**File:** `/packages/desktop/src/main/llm-improvement-service.ts`

```typescript
export class LLMImprovementService {
  private provider: LLMProvider
  private requestsInLastMinute = 0
  private maxRequestsPerMinute = 20

  constructor(apiKey: string, providerType: 'openai' | 'anthropic' = 'openai') {
    if (providerType === 'openai') {
      this.provider = new OpenAIProvider(apiKey)
    } else {
      throw new Error(`Provider ${providerType} not yet implemented`)
    }
  }

  async *improveText(
    text: string,
    options: ImprovementOptions,
    onToken?: (token: string) => void
  ): AsyncGenerator<string, ImprovementResult, void> {
    // Rate limit check
    if (this.requestsInLastMinute >= this.maxRequestsPerMinute) {
      throw new Error('Rate limit exceeded. Please wait a moment.')
    }

    this.requestsInLastMinute++
    setTimeout(() => this.requestsInLastMinute--, 60000)

    // Stream tokens
    for await (const token of this.provider.improveText(text, options)) {
      if (onToken) onToken(token)
      yield token
    }

    // Return final result
    return this.provider.improveText(text, options).return!
  }

  async testConnection(): Promise<boolean> {
    return this.provider.testConnection()
  }
}
```

---

### 3.5. Phase 4: Text Insertion (Days 7-8)

**Deliverable:** Reliable text insertion back into source fields

#### Step 4.1: Implement Text Insertion Service

**File:** `/packages/desktop/src/main/text-insertion-service.ts`

```typescript
export class TextInsertionService {
  async insert(text: string, focusContext: FocusContext): Promise<InsertionResult> {
    try {
      // Step 1: Restore focus to original app/field
      await this.restoreFocus(focusContext)
      await this.delay(150)

      // Step 2: Try direct typing first (most reliable)
      const typingSuccess = await this.insertViaDirectTyping(text)
      if (typingSuccess) {
        return { success: true, method: 'typing' }
      }

      // Step 3: Fallback to clipboard paste
      const pasteSuccess = await this.insertViaClipboardPaste(text)
      if (pasteSuccess) {
        return { success: true, method: 'clipboard' }
      }

      // Step 4: Final fallback - leave in clipboard
      clipboard.writeText(text)
      return { success: false, method: 'clipboard-only', message: 'Text copied to clipboard' }

    } catch (error) {
      await logger.error('insertion', 'Text insertion failed', error)
      clipboard.writeText(text) // Ensure text is accessible
      return { success: false, method: 'error', message: error.message }
    }
  }

  private async insertViaDirectTyping(text: string): Promise<boolean> {
    try {
      // Select all existing content
      const modifier = process.platform === 'darwin' ? Key.LeftSuper : Key.LeftControl
      await keyboard.pressKey(modifier)
      await keyboard.pressKey(Key.A)
      await keyboard.releaseKey(Key.A)
      await keyboard.releaseKey(modifier)
      await this.delay(50)

      // Type new content
      await keyboard.type(text)
      await this.delay(100)

      return true
    } catch (error) {
      await logger.warn('insertion', 'Direct typing failed', error)
      return false
    }
  }

  private async insertViaClipboardPaste(text: string): Promise<boolean> {
    const previousClipboard = clipboard.readText()

    try {
      // Write text to clipboard
      clipboard.writeText(text)
      await this.delay(50)

      // Select all + paste
      const modifier = process.platform === 'darwin' ? Key.LeftSuper : Key.LeftControl
      await keyboard.pressKey(modifier)
      await keyboard.pressKey(Key.A)
      await keyboard.releaseKey(Key.A)
      await this.delay(50)
      await keyboard.pressKey(Key.V)
      await keyboard.releaseKey(Key.V)
      await keyboard.releaseKey(modifier)

      // Restore original clipboard after delay
      setTimeout(() => clipboard.writeText(previousClipboard), 500)

      return true
    } catch (error) {
      clipboard.writeText(previousClipboard)
      return false
    }
  }

  private async restoreFocus(focusContext: FocusContext): Promise<void> {
    if (process.platform === 'darwin') {
      const script = `
        tell application "${focusContext.appName}"
          activate
        end tell
      `
      try {
        execSync(`osascript -e '${script}'`, { timeout: 2000 })
      } catch (error) {
        await logger.warn('insertion', 'Focus restoration failed', error)
      }
    }
    // Windows/Linux implementations...
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

**Success Criteria:**
- ✅ Inserts text successfully in 75%+ of common apps
- ✅ Restores focus reliably before insertion
- ✅ Clipboard fallback always works
- ✅ Original clipboard restored after 500ms

---

### 3.6. Phase 5: Integration and Polish (Days 9-10)

**Deliverable:** Complete feature with error handling and settings

#### Step 5.1: Wire Everything Together in TextImprovementService

**File:** `/packages/desktop/src/main/text-improvement-service.ts`

```typescript
export class TextImprovementService {
  private extractionService: TextExtractionService
  private llmService: LLMImprovementService
  private insertionService: TextInsertionService
  private overlayWindow: BrowserWindow | null = null
  private isProcessing = false

  constructor(private options: {
    getMainWindow: () => BrowserWindow | null
    backgroundDataService: any
    apiKey: string
  }) {
    this.extractionService = new TextExtractionService()
    this.llmService = new LLMImprovementService(options.apiKey, 'openai')
    this.insertionService = new TextInsertionService()
  }

  async initialize(): Promise<boolean> {
    try {
      // Test LLM connection
      const connected = await this.llmService.testConnection()
      if (!connected) {
        await logger.warn('improvement', 'LLM API connection test failed')
        return false
      }

      // Register global shortcut
      const shortcut = process.platform === 'darwin' ? 'Command+Shift+U' : 'Control+Shift+U'
      const registered = globalShortcut.register(shortcut, () => this.handleShortcut())

      if (!registered) {
        await logger.error('improvement', `Failed to register shortcut: ${shortcut}`)
        return false
      }

      await logger.info('improvement', `Text improvement shortcut registered: ${shortcut}`)
      return true
    } catch (error) {
      await logger.error('improvement', 'Initialization failed', error)
      return false
    }
  }

  private async handleShortcut(): Promise<void> {
    if (this.isProcessing) {
      await logger.info('improvement', 'Ignoring shortcut - already processing')
      return
    }

    this.isProcessing = true

    try {
      // Step 1: Show loading overlay
      this.showOverlay('loading')

      // Step 2: Extract text
      this.sendStatus('extracting', 'Extracting text...')
      const extraction = await this.extractionService.extract()

      if (!extraction.text || extraction.text.length < 3) {
        this.sendStatus('error', 'No text selected')
        setTimeout(() => this.closeOverlay(), 2000)
        return
      }

      // Step 3: Send to LLM for improvement
      this.sendStatus('processing', 'Improving text...')
      let improvedText = ''

      for await (const token of this.llmService.improveText(extraction.text, {})) {
        improvedText += token
        this.sendToken(token)
      }

      // Step 4: Show result
      this.sendResult({
        originalText: extraction.text,
        improvedText,
        canInsert: extraction.isEditable !== false,
        focusContext: extraction.focusContext
      })

      // Wait for user action (insert/copy/cancel)

    } catch (error) {
      await logger.error('improvement', 'Improvement failed', error)
      this.sendStatus('error', error.message || 'Improvement failed')
      setTimeout(() => this.closeOverlay(), 3000)
    } finally {
      this.isProcessing = false
    }
  }

  private showOverlay(state: string): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.show()
      return
    }

    const cursorPoint = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursorPoint)

    this.overlayWindow = new BrowserWindow({
      width: 700,
      height: 500,
      x: display.bounds.x + (display.bounds.width - 700) / 2,
      y: display.bounds.y + (display.bounds.height - 500) / 3,
      show: true,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        contextIsolation: true
      }
    })

    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) {
      this.overlayWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/text-improvement-overlay.html`)
    } else {
      this.overlayWindow.loadFile(join(__dirname, '../renderer/text-improvement-overlay.html'))
    }
  }

  private sendStatus(status: string, message?: string): void {
    this.overlayWindow?.webContents.send('improvement:status', { status, message })
  }

  private sendToken(token: string): void {
    this.overlayWindow?.webContents.send('improvement:token', token)
  }

  private sendResult(result: any): void {
    this.overlayWindow?.webContents.send('improvement:result', result)
  }

  private closeOverlay(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close()
      this.overlayWindow = null
    }
  }

  dispose(): void {
    globalShortcut.unregisterAll()
    this.closeOverlay()
  }

  isEnabled(): boolean {
    return true
  }
}
```

#### Step 5.2: Add Service to Main Process Initialization

**File:** `/packages/desktop/src/main/index.ts` (modify)

Add after transcription service initialization (around line 494):

```typescript
// Initialize text improvement service
await logServiceStart('TextImprovementService')
const textImprovementService = new TextImprovementService({
  getMainWindow: () => mainWindow,
  backgroundDataService,
  apiKey: process.env.VITE_OPENAI_API_KEY || process.env.VITE_ANTHROPIC_API_KEY
})
const improvementEnabled = await textImprovementService.initialize()
await logServiceReady('TextImprovementService')

if (improvementEnabled) {
  console.log('✅ Text improvement service enabled (Cmd+Shift+U)')
} else {
  console.log('⚠️  Text improvement service disabled (no API key or connection failed)')
}
```

Add to disposal in `will-quit` handler:

```typescript
await disposeService(textImprovementService, 'TextImprovementService', () =>
  textImprovementService?.dispose()
)
```

#### Step 5.3: Add Environment Variables

**File:** `/scripts/generate-desktop-env.mjs` (modify)

Add environment variables:

```javascript
const env = {
  // ... existing variables ...

  // Text Improvement Feature
  VITE_OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  VITE_ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  VITE_IMPROVEMENT_ENABLED: 'true',
  VITE_IMPROVEMENT_DEFAULT_STYLE: 'professional'
}
```

---

## 4. Strict TODO Checklist

### Phase 1: Core Infrastructure ✅
- [ ] Create `TextImprovementService` skeleton with shortcut registration
- [ ] Create overlay window `BrowserWindow` lifecycle management
- [ ] Build `TextImprovementOverlay` React component with 4 states (loading/processing/complete/error)
- [ ] Extend preload API with `textImprovement` IPC methods
- [ ] Add IPC handlers in main process (insert/copy/cancel/undo)

### Phase 2: Text Extraction ✅
- [ ] Create `TextExtractionService` with clipboard-based extraction (Tier 2)
- [ ] Implement `simulateCopyCommand()` using `@nut-tree/nut-js`
- [ ] Add clipboard restoration logic with 500ms delay
- [ ] Implement `detectFocusedApp()` for macOS using AppleScript
- [ ] Add error handling for empty selection and extraction failures

### Phase 3: LLM Integration ✅
- [ ] Create `base-provider.ts` interface with `LLMProvider` contract
- [ ] Implement `OpenAIProvider` with streaming support
- [ ] Build system prompt generator with style variants (professional/casual/concise/detailed)
- [ ] Add token counting and cost estimation logic
- [ ] Create `LLMImprovementService` orchestrator with rate limiting
- [ ] Implement error handling for 401/429/500 API errors

### Phase 4: Text Insertion ✅
- [ ] Create `TextInsertionService` with multi-method insertion
- [ ] Implement `insertViaDirectTyping()` using keyboard automation
- [ ] Implement `insertViaClipboardPaste()` as fallback
- [ ] Add `restoreFocus()` for macOS/Windows/Linux
- [ ] Implement clipboard restoration after successful paste

### Phase 5: Integration & Polish ✅
- [ ] Wire all services together in `TextImprovementService.handleShortcut()`
- [ ] Add service initialization to `main/index.ts` after transcription service
- [ ] Add service disposal to `will-quit` handler
- [ ] Add environment variables to `generate-desktop-env.mjs`
- [ ] Implement keyboard shortcuts in overlay (Enter/Esc/Cmd+C)
- [ ] Add success/error notifications using Electron Notification API

### Phase 6: Testing & Documentation ✅
- [ ] Manual testing in 5+ applications (Chrome, Slack, VS Code, TextEdit, Notion)
- [ ] Test error scenarios (no selection, network failure, rate limit)
- [ ] Cross-platform testing (macOS primary, Windows/Linux if available)
- [ ] Document known limitations and incompatible apps
- [ ] Add user-facing documentation with screenshots

---

## 5. Test & QA Plan

### 5.1. Manual Testing Scenarios

**Test Suite 1: Basic Workflow**
1. **TC-001**: Highlight text in TextEdit → Press Cmd+Shift+U → Verify improved text inserted
2. **TC-002**: Highlight text in Chrome → Press Cmd+Shift+U → Verify improved text inserted
3. **TC-003**: Press Cmd+Shift+U without selection → Verify error "No text selected"
4. **TC-004**: Highlight 5000 characters → Verify no truncation or error

**Test Suite 2: LLM Integration**
1. **TC-101**: Configure OpenAI API key → Test improvement → Verify streaming works
2. **TC-102**: Use invalid API key → Verify error message "Invalid API key"
3. **TC-103**: Disconnect network → Verify error "Network error"
4. **TC-104**: Improve same text 3 times rapidly → Verify rate limiting doesn't block

**Test Suite 3: Text Insertion**
1. **TC-201**: Improve text in input field → Verify auto-insertion
2. **TC-202**: Improve text in textarea → Verify auto-insertion
3. **TC-203**: Improve text in contenteditable div (Notion) → Verify auto-insertion
4. **TC-204**: Improve read-only text → Verify clipboard notification

**Test Suite 4: Edge Cases**
1. **TC-301**: Improve text with emojis and special characters → Verify preserved
2. **TC-302**: Improve multi-line text → Verify line breaks preserved
3. **TC-303**: Switch apps during processing → Verify graceful handling
4. **TC-304**: Press shortcut twice rapidly → Verify second press ignored

**Test Suite 5: Cross-Platform**
1. **TC-401**: Test on macOS (primary) → All features work
2. **TC-402**: Test on Windows (if available) → Keyboard shortcuts adapted (Ctrl+Shift+U)
3. **TC-403**: Test on Linux (if available) → Basic functionality works

### 5.2. Application Compatibility Matrix

Test improvement workflow in these applications:

| Application | Capture | Insert | Notes |
|-------------|---------|--------|-------|
| Chrome (web apps) | ✅ | ✅ | Primary target |
| Slack Desktop | ✅ | ✅ | Electron app |
| VS Code | ✅ | ⚠️ | May conflict with shortcuts |
| Notion | ✅ | ✅ | Contenteditable |
| TextEdit | ✅ | ✅ | Native app |
| Gmail (browser) | ✅ | ✅ | Web app |
| ChatGPT (browser) | ✅ | ✅ | Primary use case |
| Terminal | ⚠️ | ❌ | Limited support |

### 5.3. Performance Benchmarks

- **Text Extraction**: < 200ms
- **LLM Processing** (100-word prompt): < 10 seconds
- **Text Insertion**: < 300ms
- **Total User-Visible Delay**: < 15 seconds (95th percentile)

---

## 6. Open Questions & Decisions

### 6.1. Resolved Decisions

**Q: Should we support streaming preview?**
✅ **Decision:** Yes - improves UX significantly, users see progress

**Q: How to handle editability detection?**
✅ **Decision:** Start with clipboard method (isEditable = null), attempt insertion with clipboard fallback

**Q: Which LLM provider to start with?**
✅ **Decision:** OpenAI GPT-4o-mini (fast, cost-effective, well-documented API)

**Q: Should we save improvement history?**
✅ **Decision:** Yes, but optional - save to `BackgroundDataService` for user reference

### 6.2. Open Questions (Need Input)

**Q: Should we auto-submit after improvement in chat interfaces?**
- **Risk:** User loses review opportunity
- **Recommendation:** No auto-submit, user presses Enter to send

**Q: Should we show before/after comparison or just improved text?**
- **Option A:** Side-by-side comparison (more UI space)
- **Option B:** Just show improved text with "Show original" button
- **Recommendation:** Side-by-side for transparency

**Q: What's the daily API cost budget default?**
- **Recommendation:** $5/day default, configurable in settings

**Q: Should we support custom improvement prompts per style?**
- **Recommendation:** Phase 2 feature - start with hardcoded prompts

---

## 7. Success Criteria

### 7.1. Launch Criteria (Must Have)

✅ **Feature works end-to-end:**
- Text extraction succeeds in 5+ common apps
- LLM improvement completes within 15 seconds
- Text insertion succeeds or clipboard fallback works
- Zero crashes or data loss

✅ **User Experience:**
- Overlay appears within 200ms of shortcut press
- Streaming preview provides real-time feedback
- Clear error messages for all failure modes
- Keyboard shortcuts work (Enter/Esc/Cmd+C)

✅ **Security & Privacy:**
- API keys never exposed in renderer
- User consent before first use
- No text logging or persistence (unless explicit save)

### 7.2. Success Metrics (Post-Launch)

- **Adoption:** 50%+ of active users try feature within first week
- **Success Rate:** 80%+ of improvement attempts succeed
- **Satisfaction:** 4.0+ star rating in user feedback
- **Performance:** 95th percentile latency < 20 seconds

---

## 8. Future Enhancements (Phase 2+)

### 8.1. Advanced Features
- **Anthropic Claude provider** for alternative LLM
- **Custom improvement prompts** per use case (e.g., "Make more persuasive", "Simplify for ELI5")
- **Context-aware improvements** (detect source app and adapt style)
- **Improvement history viewer** with search and replay
- **Diff view** showing exact changes made
- **Undo with Cmd+Z** to restore original text

### 8.2. Performance Optimizations
- **Local LLM support** (Ollama) for offline use
- **Response caching** for repeated improvements
- **Parallel processing** for long documents (chunk by paragraph)

### 8.3. Platform Enhancements
- **Linux X11/Wayland** full support with native APIs
- **Windows UI Automation** for better editability detection
- **Browser extension companion** for deeper integration with web apps

---

## 9. Dependencies & Integration

### 9.1. No New Dependencies Required

This feature uses only existing dependencies:
- ✅ `@nut-tree/nut-js` (already installed)
- ✅ `electron` built-in APIs (clipboard, globalShortcut, screen)
- ✅ Native `fetch` for LLM API calls

**Note:** `robotjs` was recently added to dependencies (see package.json). However, based on comments in `capture-service.ts` about native module instability, we recommend using `@nut-tree/nut-js` exclusively for keyboard automation.

### 9.2. Integration Points

**Uses existing services:**
- `BackgroundDataService` - for improvement history persistence
- `Logger` - for error tracking and debugging
- `TrayService` - for status indication (optional)

**Follows existing patterns:**
- Similar to `transcription-service.ts` for overlay management
- Similar to `capture-service.ts` for clipboard operations
- Similar to `simple-palette-service.ts` for keyboard automation

---

## 10. Documentation Requirements

### 10.1. User-Facing Documentation

Create documentation in `/agents/docs/user-guide/text-improvement.md`:
- Feature overview with screenshots
- Keyboard shortcuts and workflow
- Supported applications and limitations
- API key setup instructions (OpenAI/Anthropic)
- Troubleshooting common issues
- Privacy and security information

### 10.2. Developer Documentation

Add code comments to all services:
- `TextImprovementService`: Workflow state machine
- `TextExtractionService`: Platform-specific extraction methods
- `LLMImprovementService`: Provider abstraction and streaming
- `TextInsertionService`: Insertion strategies and focus restoration

---

## Conclusion

This feature brings AI-powered text improvement directly into users' workflows, making it effortless to polish prompts, emails, documentation, and any other text. By leveraging existing infrastructure and proven patterns from the transcription and capture features, we can deliver a reliable, performant, and user-friendly experience.

The phased implementation approach ensures we can ship a working MVP (clipboard extraction + OpenAI integration) quickly, then iterate with platform-specific enhancements and additional LLM providers based on user feedback.

**Estimated Timeline:** 10 working days for MVP (Phases 1-5), additional 5 days for polish and cross-platform testing (Phases 6-7).
