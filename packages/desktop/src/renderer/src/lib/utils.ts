import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Strips HTML tags from a string and returns plain text
 * @param html - The HTML string to strip tags from
 * @returns Plain text with HTML tags removed
 */
export function stripHtml(html: string): string {
  // Create a temporary div element to parse the HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // Get the text content which will be the HTML without tags
  return tempDiv.textContent || tempDiv.innerText || ''
}

/**
 * Truncates a string to the specified length and adds an ellipsis if truncated
 * @param value - The string to truncate
 * @param limit - The maximum length (default: 160)
 * @returns The truncated string with ellipsis if needed
 */
export function truncateString(value: string, limit = 160): string {
  if (value.length <= limit) return value
  return `${value.slice(0, limit)}…`
}
