// Content script to handle auth callback
// This script runs on the auth callback page and sends the token to the background

// Listen for URL changes that indicate auth callback
if (window.location.pathname.includes("/auth/callback")) {
  const hash = window.location.hash.substring(1)
  const params = new URLSearchParams(hash)
  const token = params.get("access_token")

  if (token) {
    // Send message to background script
    chrome.runtime.sendMessage({
      type: "AUTH_SUCCESS",
      payload: {
        token,
        // These should be extracted from your auth response
        // You may need to adjust based on your actual auth flow
        email: params.get("email") || "",
        workspaceID: params.get("workspace_id") || ""
      }
    })
  }
}

export {}
