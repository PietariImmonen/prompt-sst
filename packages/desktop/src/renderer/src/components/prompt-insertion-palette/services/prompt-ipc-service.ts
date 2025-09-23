import { Prompt, IPCPromptService } from '../types'

class PromptIPCServiceImpl implements IPCPromptService {
  private retryCount = 0
  private readonly maxRetries = 3
  private readonly retryDelay = 500
  private isLoading = false

  async getPrompts(): Promise<Prompt[]> {
    if (!window.electron?.ipcRenderer) {
      console.warn('IPC renderer not available')
      return []
    }

    // Prevent multiple concurrent requests
    if (this.isLoading) {
      console.log('Already loading prompts, waiting...')
      // Wait a bit and try again
      await this.delay(100)
      return this.isLoading ? [] : this.getPrompts()
    }

    this.isLoading = true

    try {
      console.log('Requesting prompts from main window...')
      const prompts = await window.electron.ipcRenderer.invoke('overlay:get-prompts')
      console.log('Received prompts:', prompts?.length || 0)

      // Only retry if we get absolutely no data (null/undefined)
      // Empty array is a valid response (no prompts exist)
      if (prompts === null || prompts === undefined) {
        if (this.retryCount < this.maxRetries) {
          this.retryCount++
          console.log(`No prompts data received, retrying... Attempt: ${this.retryCount}`)
          await this.delay(this.retryDelay * this.retryCount) // Exponential backoff
          this.isLoading = false
          return this.getPrompts()
        }
      }

      this.retryCount = 0
      return Array.isArray(prompts) ? prompts : []
    } catch (error) {
      console.error('Failed to get prompts:', error)
      this.retryCount = 0
      return []
    } finally {
      this.isLoading = false
    }
  }

  requestPrompts(): void {
    // Deprecated - use getPrompts() instead
    console.warn('requestPrompts() is deprecated, use getPrompts() instead')
  }

  onPromptsReceived(callback: (prompts: Prompt[]) => void): () => void {
    // Deprecated - prompts are loaded once via getPrompts()
    console.warn('onPromptsReceived() is deprecated, prompts are loaded once via getPrompts()')
    return () => {}
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  reset(): void {
    this.retryCount = 0
    this.isLoading = false
  }
}

export const promptIPCService = new PromptIPCServiceImpl()