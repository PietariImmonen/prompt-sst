// Background service worker for Chrome extension
export {}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AUTH_SUCCESS") {
    // Forward auth success to all extension contexts
    chrome.runtime.sendMessage(message)
  }
  return true
})

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Prompt Saver extension installed")
})
