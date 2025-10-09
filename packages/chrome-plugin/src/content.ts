// Content script for Prompt Saver Chrome extension.
// Handles OAuth callback processing AND automatic prompt capture on supported AI sites.

type PromptSource = "chatgpt" | "claude" | "gemini" | "grok" | "other";

const AUTH_CALLBACK_PATH = "/auth/callback";

function handleAuthCallback() {
  const fragment = window.location.hash?.substring(1) ?? "";
  const query = fragment.length > 0 ? fragment : window.location.search?.substring(1) ?? "";
  const params = new URLSearchParams(query);

  const token = params.get("access_token");
  if (!token) {
    console.warn("[Prompt Saver] Auth callback missing access_token");
    return;
  }

  const email = params.get("email") ?? "";
  const workspaceID =
    params.get("workspace_id") ?? params.get("workspaceId") ?? params.get("workspace") ?? "";

  chrome.runtime
    .sendMessage({
      type: "AUTH_SUCCESS",
      payload: {
        token,
        email,
        workspaceID,
      },
    })
    .then(() => {
      console.log("[Prompt Saver] ✅ Auth callback forwarded to background");
    })
    .catch((error) => {
      console.error("[Prompt Saver] Failed to notify background about auth callback", error);
    });
}

interface CapturedPrompt {
  content: string;
  title: string;
  source: PromptSource;
  url: string;
}

// Detect which platform we're on
function detectPlatform(): PromptSource {
  const hostname = window.location.hostname;
  if (hostname.includes("chat.openai.com")) return "chatgpt";
  if (hostname.includes("chatgpt.com")) return "chatgpt";
  if (hostname.includes("claude.ai")) return "claude";
  if (hostname.includes("gemini.google.com")) return "gemini";
  if (hostname.includes("x.ai")) return "grok";
  return "other";
}

// Generate title from content (first line, max 200 chars)
function generateTitle(content: string): string {
  const firstLine = content.split(/\r?\n/)[0]?.trim() ?? content.trim();
  return firstLine.slice(0, 200) || "Untitled prompt";
}

type SupportedSource = Exclude<PromptSource, "other" | "grok">;

type PlatformExtractor = {
  selector: string;
  submitButton: string;
  getPromptText(): string | null;
};

const platformExtractors: Record<SupportedSource, PlatformExtractor> = {
  chatgpt: {
    // ChatGPT sends messages via form submission or button click
    // Monitor the textarea and capture on submission
    selector:
      'textarea[data-id], textarea#prompt-textarea, div[contenteditable="true"][data-id], #prompt-textarea, [data-testid="textarea"]',
    submitButton: '#composer-submit-button, button[data-testid="send-button"], button[data-testid="send-message"], button[aria-label*="send"], button[aria-label="Send message"]',

    getPromptText(): string | null {
      // Try textarea selectors
      const textareas = document.querySelectorAll<HTMLTextAreaElement>(
        'textarea[data-id], textarea#prompt-textarea, [data-testid="textarea"]',
      );
      for (const textarea of textareas) {
        const text = textarea.value?.trim();
        if (text) return text;
      }

      // Try ProseMirror editor
      const proseMirror = document.querySelector<HTMLDivElement>(
        '#prompt-textarea.ProseMirror, div[contenteditable="true"].ProseMirror',
      );
      if (proseMirror) {
        const text = proseMirror.innerText?.trim();
        if (text) return text;
      }

      // Fallback to any contenteditable divs
      const editables = document.querySelectorAll<HTMLDivElement>(
        'div[contenteditable="true"][data-id], div[contenteditable="true"]',
      );
      for (const editable of editables) {
        const text = editable.innerText?.trim();
        if (text) return text;
      }

      return null;
    },
  },

  claude: {
    // Claude uses a contenteditable div for input
    selector:
      'div[contenteditable="true"].ProseMirror, div[contenteditable="true"][data-placeholder], div[data-testid="composer-text-area"], textarea[data-testid], [data-lexical-decorator="true"] div[contenteditable="true"]',
    submitButton: 'button[aria-label*="Send"], button[type="submit"], button[data-testid="send-button"], [data-testid="send-message"]',

    getPromptText(): string | null {
      // Try various Claude-specific selectors
      const selectors = [
        'div[contenteditable="true"].ProseMirror',
        'div[data-testid="composer-text-area"]',
        '[data-lexical-decorator="true"] div[contenteditable="true"]',
        'div[contenteditable="true"][data-placeholder]',
        'div[contenteditable="true"]',
        'textarea[data-testid]'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll<HTMLElement>(selector);
        for (const element of elements) {
          let text: string | undefined;

          if (element.tagName === 'TEXTAREA') {
            text = (element as HTMLTextAreaElement).value?.trim();
          } else {
            text = element.innerText?.trim() || element.textContent?.trim();
          }

          if (text && text.length > 0) {
            const placeholder =
              element.getAttribute('data-placeholder') ||
              element.getAttribute('placeholder');
            if (text !== placeholder) {
              return text;
            }
          }
        }
      }

      return null;
    },
  },

  gemini: {
    // Gemini uses a rich text editor
    selector:
      'rich-textarea, div[contenteditable="true"][role="textbox"], #prompt, textarea[aria-label*="prompt"], [data-testid="input-box"] div[contenteditable="true"]',
    submitButton: 'button[aria-label*="Send"], button.send-button, button[data-testid="send"], [data-testid="send-button"], #send, button[aria-label="Submit"]',

    getPromptText(): string | null {
      const richTextarea = document.querySelector('rich-textarea');
      if (richTextarea) {
        const editable = richTextarea.querySelector<HTMLDivElement>(
          'div[contenteditable="true"]',
        );
        if (editable) {
          const text = editable.innerText?.trim();
          if (text) return text;
        }
      }

      const selectors = [
        '#prompt',
        'textarea[aria-label*="prompt"]',
        '[data-testid="input-box"] div[contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll<HTMLElement>(selector);
        for (const element of elements) {
          let text: string | undefined;

          if (element.tagName === 'TEXTAREA') {
            text = (element as HTMLTextAreaElement).value?.trim();
          } else {
            text = element.innerText?.trim() || element.textContent?.trim();
          }

          if (text && text.length > 0) {
            const placeholder =
              element.getAttribute('aria-label') ||
              element.getAttribute('data-placeholder') ||
              element.getAttribute('placeholder');
            if (text !== placeholder && text !== 'Send a message' && text !== 'Enter a prompt') {
              return text;
            }
          }
        }
      }

      return null;
    },
  },
};

const supportedSources: ReadonlyArray<SupportedSource> = [
  "chatgpt",
  "claude",
  "gemini",
];

function isSupportedSource(source: PromptSource): source is SupportedSource {
  return supportedSources.includes(source as SupportedSource);
}

const monitoredSources = new Set<SupportedSource>();
let chatgptFetchPatched = false;

// Capture prompt and send to background
async function capturePrompt(content: string, source: PromptSource) {
  if (!content || content.length < 3) {
    console.log(
      "[Prompt Saver] Content too short, skipping:",
      content.length,
      "chars",
    );
    return;
  }

  const prompt: CapturedPrompt = {
    content,
    title: generateTitle(content),
    source,
    url: window.location.href,
  };

  console.log(
    "[Prompt Saver] 📝 Captured prompt:",
    prompt.title.substring(0, 50) + "...",
  );
  console.log("[Prompt Saver] Full content length:", content.length);

  // Send to background script
  try {
    const response = await chrome.runtime.sendMessage({
      type: "PROMPT_CAPTURED",
      payload: prompt,
    });
    console.log("[Prompt Saver] Background response:", response);
  } catch (error) {
    console.error("[Prompt Saver] Failed to send to background:", error);
  }
}

// Set up monitoring for a specific platform
function setupPlatformMonitoring(source: PromptSource) {
  if (!isSupportedSource(source)) {
    console.log(`[Prompt Saver] Platform "${source}" - auto-capture disabled`);
    return;
  }

  if (monitoredSources.has(source)) {
    console.log(`[Prompt Saver] Monitoring already active for ${source}, skipping re-init`);
    return;
  }

  const extractor = platformExtractors[source];
  let lastCapturedContent = "";
  let lastCaptureTime = 0;

  console.log(`[Prompt Saver] 🎯 Setting up auto-capture for ${source}`);
  console.log("[Prompt Saver] Submit button selector:", extractor.submitButton);
  console.log("[Prompt Saver] Input selector:", extractor.selector);

  // For ChatGPT, intercept the fetch request to capture prompts more reliably
  if (source === "chatgpt" && !chatgptFetchPatched) {
    const originalFetch = window.fetch;
    const patchedFetch = async (
      ...args: Parameters<typeof window.fetch>
    ): ReturnType<typeof window.fetch> => {
      const [url, options] = args;

      // Check if this is a conversation request
      if (typeof url === 'string' && url.includes('/backend-api/') && url.includes('/conversation')) {
        try {
          if (options?.body && typeof options.body === 'string') {
            const body = JSON.parse(options.body);
            const message = body?.messages?.[0];
            const parts = message?.content?.parts;

            if (parts && Array.isArray(parts) && parts.length > 0) {
              const content = parts.join('\\n').trim();

              if (content && content.length >= 3) {
                // Deduplicate
                const now = Date.now();
                if (content !== lastCapturedContent || now - lastCaptureTime > 2000) {
                  console.log('[Prompt Saver] 📝 Intercepted from fetch:', content.substring(0, 50) + '...');
                  lastCapturedContent = content;
                  lastCaptureTime = now;
                  capturePrompt(content, source);
                }
              }
            }
          }
        } catch (error) {
          console.error('[Prompt Saver] Error parsing fetch body:', error);
        }
      }

      return originalFetch(...args);
    };

    Object.assign(patchedFetch, originalFetch);
    window.fetch = patchedFetch as typeof window.fetch;

    chatgptFetchPatched = true;
    console.log('[Prompt Saver] ✅ Fetch interception active for ChatGPT');
  }

  // Monitor for submit button clicks - use mousedown to capture BEFORE content is cleared
  document.addEventListener(
    "mousedown",
    (event) => {
      const target = event.target as HTMLElement;

      // Check if the clicked element is or contains a submit button
      const submitButton = target.closest(extractor.submitButton);
      if (!submitButton) return;

      console.log("[Prompt Saver] Submit button mousedown!");

      // Capture immediately before the click event clears the input
      const content = extractor.getPromptText();
      console.log(
        "[Prompt Saver] Extracted content:",
        content ? `${content.substring(0, 50)}...` : "null",
      );

      if (!content) return;

      // Deduplicate: don't capture the same content within 2 seconds
      const now = Date.now();
      if (content === lastCapturedContent && now - lastCaptureTime < 2000) {
        console.log("[Prompt Saver] ⏭️  Skipping duplicate prompt");
        return;
      }

      lastCapturedContent = content;
      lastCaptureTime = now;
      capturePrompt(content, source);
    },
    true,
  ); // Use capture phase to catch events early

  // Also monitor for Enter key in input fields
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey) return; // Shift+Enter/Ctrl+Enter/Alt+Enter for new line or special functions

      const target = event.target as HTMLElement;

      // Check if we're in the input field
      const inputField = target.closest(extractor.selector);
      if (!inputField) return;

      console.log("[Prompt Saver] Enter key pressed in input field!");

      // Small delay to ensure content is processed before capturing
      // This helps capture content before it might be cleared by the platform
      setTimeout(() => {
        // Capture immediately before the content is sent
        const content = extractor.getPromptText();
        console.log(
          "[Prompt Saver] Extracted content (Enter):",
          content ? `${content.substring(0, 50)}...` : "null",
        );

        if (!content) return;

        // Deduplicate
        const now = Date.now();
        if (content === lastCapturedContent && now - lastCaptureTime < 2000) {
          console.log("[Prompt Saver] ⏭️  Skipping duplicate prompt");
          return;
        }

        lastCapturedContent = content;
        lastCaptureTime = now;
        capturePrompt(content, source);
      }, 10); // Small delay to handle platform-specific timing
    },
    true,
  );

  // Add input event listener to catch form submissions that might clear content
  document.addEventListener(
    "input",
    (event) => {
      const target = event.target as HTMLElement;
      const inputField = target.closest(extractor.selector);
      if (!inputField) return;

      // We check for potential form submissions that clear content
      // For example, when Enter is pressed in an input field and it triggers form submit
      const form = inputField.closest("form");
      if (form) {
        form.addEventListener("submit", () => {
          // Small delay to capture content before it's cleared
          setTimeout(() => {
            const content = extractor.getPromptText();
            if (content) {
              const now = Date.now();
              if (content !== lastCapturedContent && now - lastCaptureTime >= 2000) {
                lastCapturedContent = content;
                lastCaptureTime = now;
                capturePrompt(content, source);
              }
            }
          }, 10); // Small delay to allow DOM updates before capturing
        }, { once: true }); // Only listen once per form
      }
    },
    true
  );

  console.log(`[Prompt Saver] ✅ Auto-capture monitoring active for ${source}`);
  monitoredSources.add(source);
}

// Initialize when DOM is ready
function startCaptureMonitoring() {
  console.log("[Prompt Saver] Content script loaded on:", window.location.href);

  function initMonitoring() {
    const platform = detectPlatform();
    console.log("[Prompt Saver] Platform detected:", platform);
    setupPlatformMonitoring(platform);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMonitoring, { once: true });
  } else {
    initMonitoring();
  }

  let lastUrl = window.location.href;
  const navigationObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      initMonitoring();
    }
  });

  const startNavigationObserver = () => {
    if (!document.body) {
      return;
    }
    navigationObserver.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startNavigationObserver, { once: true });
  } else {
    startNavigationObserver();
  }
}

if (window.location.pathname.includes(AUTH_CALLBACK_PATH)) {
  handleAuthCallback();
} else {
  startCaptureMonitoring();
}

export {};
