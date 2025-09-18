// Shared utilities between main and renderer processes

// Remove unused import - types are imported locally where needed

/**
 * Validates if a URL belongs to a supported AI platform
 */
export function isSupportedPlatform(url: string): boolean {
  const supportedDomains = ['claude.ai', 'chat.openai.com', 'gemini.google.com', 'x.ai']
  try {
    const domain = new URL(url).hostname
    return supportedDomains.some((supported) => domain.includes(supported))
  } catch {
    return false
  }
}

/**
 * Extracts platform name from URL
 */
export function getPlatformFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname
    if (hostname.includes('claude.ai')) return 'claude'
    if (hostname.includes('chat.openai.com')) return 'chatgpt'
    if (hostname.includes('gemini.google.com')) return 'gemini'
    if (hostname.includes('x.ai')) return 'grok'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Sanitizes prompt content by removing excessive whitespace and special characters
 */
export function sanitizePromptContent(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-.,!?;:()]/g, '')
    .substring(0, 10000) // Limit to 10k characters
}

/**
 * Generates a title from prompt content
 */
export function generatePromptTitle(content: string, maxLength: number = 60): string {
  const sanitized = sanitizePromptContent(content)
  if (sanitized.length <= maxLength) return sanitized

  const truncated = sanitized.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  return lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) + '...' : truncated + '...'
}

/**
 * Validates prompt content
 */
export function isValidPromptContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false
  if (content.trim().length < 3) return false
  if (content.length > 10000) return false
  return true
}

/**
 * Formats date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return 'Today'
  if (diffDays === 2) return 'Yesterday'
  if (diffDays <= 7) return `${diffDays} days ago`

  return date.toLocaleDateString()
}

/**
 * Debounce function for search and other operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Chunks array into smaller arrays of specified size
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Escapes HTML entities
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Generates unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
