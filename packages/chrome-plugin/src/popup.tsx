import { useState } from "react";
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
              chrome.runtime.lastError.message || "Authentication failed"
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
        }
      );
    } catch (err) {
      console.error("Failed to start OAuth flow", err);
      setError(err instanceof Error ? err.message : "Unable to start sign-in");
      setLoading(null);
    }
  };

  if (!auth.isReady) {
    return (
      <div className="flex h-[400px] w-[350px] items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (auth.current) {
    return (
      <div className="w-[350px] bg-background text-foreground">
        <div className="p-6">
          <div className="space-y-1.5 pb-6">
            <h2 className="text-xl font-semibold">Prompt Saver</h2>
            <p className="text-sm text-muted-foreground">
              Logged in as {auth.current.email}
            </p>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Extension is synced and ready to capture prompts.
              </p>
            </div>
            <button
              className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              onClick={() => auth.logout()}
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!authUrl) {
    return (
      <div className="w-[350px] bg-background text-foreground p-4">
        <div className="relative w-full rounded-lg border border-destructive/50 bg-background px-4 py-3 text-sm text-destructive">
          Authentication not configured. Set PLASMO_PUBLIC_AUTH_URL in .env
        </div>
      </div>
    );
  }

  return (
    <div className="w-[350px] bg-background text-foreground">
      <div className="p-6">
        <div className="space-y-1.5 pb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Secure sign-in
          </div>
          <h2 className="text-xl font-semibold">Sign in to Prompt Saver</h2>
          <p className="text-sm text-muted-foreground">
            Sync your prompts across all your devices
          </p>
        </div>
        <div className="space-y-4">
          {error && (
            <div className="relative w-full rounded-lg border border-destructive/50 bg-background px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {providers.map((provider) => (
              <button
                key={provider.id}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
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

          <div className="h-px w-full bg-border" />

          <p className="text-xs text-muted-foreground">
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
