import { useEffect, useState } from "react";
import { useAuth } from "~/hooks/use-auth";
import { AuthProvider } from "~/providers/auth-provider/auth-provider";

import "./style.css";

const authUrl = process.env.PLASMO_PUBLIC_AUTH_URL || "";

const providers = [
  {
    id: "google" as const,
    label: "Continue with Google",
  },
];

// Component for logged-in users with prompt sync status
function LoggedInContent({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const [capturedCount, setCapturedCount] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Monitor captured prompts count and sync events
  useEffect(() => {
    async function updateStatus() {
      try {
        // Get captured prompts count from background script
        const response = await chrome.runtime.sendMessage({
          type: "GET_CAPTURED_PROMPTS",
        });
        const prompts = response?.prompts || [];
        setCapturedCount(prompts.length);
      } catch (error) {
        console.error("Failed to get captured prompts status:", error);
      }
    }

    // Update status immediately
    updateStatus();

    // Update status every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    // Listen for sync events from background
    const listener = (message: { type: string; payload?: { timestamp?: number } }) => {
      if (message.type === "PROMPT_ADDED") {
        console.log("New prompt captured");
        updateStatus();
      }
      if (message.type === "PROMPT_SYNCED") {
        console.log("Prompt synced");
        setLastSync(Date.now());
        updateStatus();
      }
    };

    chrome.runtime.onMessage.addListener(listener);

    return () => {
      clearInterval(interval);
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  return (
    <div className="text-foreground w-[350px] bg-black">
      <div className="p-6">
        <div className="space-y-1.5 pb-6">
          <h2 className="text-xl font-semibold">Prompt Saver</h2>
          <p className="text-muted-foreground text-sm">
            Logged in as {auth.current?.email}
          </p>
        </div>
        <div className="space-y-4">
          <div className="border-border bg-muted/50 rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Capture Status</p>
              {capturedCount > 0 ? (
                <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded">
                  {capturedCount} pending
                </span>
              ) : (
                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">
                  ✓ Synced
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {capturedCount > 0
                ? `${capturedCount} prompt${capturedCount === 1 ? '' : 's'} will sync automatically in the background.`
                : "Extension is ready to capture prompts."}
            </p>
            {lastSync && (
              <p className="text-muted-foreground mt-2 text-xs">
                Last sync: {new Date(lastSync).toLocaleTimeString()}
              </p>
            )}
            <p className="text-muted-foreground mt-2 text-xs border-t border-border/40 pt-2">
              Visit ChatGPT, Claude, or Gemini to auto-capture your prompts.
            </p>
          </div>
          <button
            className="border-input hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-9 w-full items-center justify-center rounded-md border bg-black px-4 py-2 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50"
            onClick={() => auth.logout()}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

function PopupContent() {
  const auth = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProviderClick = async (provider: "google") => {
    if (!authUrl) {
      setError("Authentication not configured");
      return;
    }

    try {
      setError(null);
      setLoading(provider);

      const redirectUri = chrome.identity.getRedirectURL("callback");

      // Build OAuth URL manually
      const params = new URLSearchParams({
        client_id: "chrome-extension",
        redirect_uri: redirectUri,
        response_type: "token",
        provider,
      });

      const url = `${authUrl}/authorize?${params.toString()}`;

      chrome.identity.launchWebAuthFlow(
        {
          url,
          interactive: true,
        },
        (responseUrl) => {
          setLoading(null);

          if (chrome.runtime.lastError) {
            setError(
              chrome.runtime.lastError.message || "Authentication failed",
            );
            return;
          }

          if (!responseUrl) {
            setError("No response from authentication");
            return;
          }

          // Extract token from response URL
          const hash = new URL(responseUrl).hash.substring(1);
          console.log("Auth callback hash:", hash);
          window.location.hash = hash;

          // Force a small delay to ensure hash is set
          setTimeout(() => {
            auth.refresh();
          }, 100);
        },
      );
    } catch (err) {
      console.error("Failed to start OAuth flow", err);
      setError(err instanceof Error ? err.message : "Unable to start sign-in");
      setLoading(null);
    }
  };

  if (!auth.isReady) {
    return (
      <div className="flex h-[400px] w-[350px] items-center justify-center bg-black">
        <div className="border-muted-foreground h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (auth.current) {
    return <LoggedInContent auth={auth} />;
  }

  if (!authUrl) {
    return (
      <div className="text-foreground w-[350px] bg-black p-4">
        <div className="border-destructive/50 text-destructive relative w-full rounded-lg border bg-black px-4 py-3 text-sm">
          Authentication not configured. Set PLASMO_PUBLIC_AUTH_URL in .env
        </div>
      </div>
    );
  }

  return (
    <div className="text-foreground w-[350px] bg-black">
      <div className="p-6">
        <div className="space-y-1.5 pb-6">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Secure sign-in
          </div>
          <h2 className="text-xl font-semibold">Sign in to Prompt Saver</h2>
          <p className="text-muted-foreground text-sm">
            Sync your prompts across all your devices
          </p>
        </div>
        <div className="space-y-4">
          {error && (
            <div className="border-destructive/50 text-destructive relative w-full rounded-lg border bg-black px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {providers.map((provider) => (
              <button
                key={provider.id}
                className="border-input hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border bg-black px-8 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50"
                disabled={loading !== null}
                onClick={() => handleProviderClick(provider.id)}
              >
                {loading === provider.id && (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {provider.label}
              </button>
            ))}
          </div>

          <div className="bg-border h-px w-full" />

          <p className="text-muted-foreground text-xs">
            Authentication will open in a new window. We never store your
            provider passwords.
          </p>
        </div>
      </div>
    </div>
  );
}

function IndexPopup() {
  return (
    <AuthProvider>
      <PopupContent />
    </AuthProvider>
  );
}

export default IndexPopup;
