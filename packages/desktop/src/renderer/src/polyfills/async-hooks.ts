// Browser-compatible polyfill for Node.js AsyncLocalStorage
// Used in Electron renderer process where Node APIs are not available

export class AsyncLocalStorage<T> {
  private store: T | undefined = undefined

  getStore(): T | undefined {
    return this.store
  }

  run<R>(value: T, fn: () => R): R {
    const previousStore = this.store
    this.store = value
    try {
      return fn()
    } finally {
      this.store = previousStore
    }
  }

  exit<R>(fn: () => R): R {
    const previousStore = this.store
    this.store = undefined
    try {
      return fn()
    } finally {
      this.store = previousStore
    }
  }

  enterWith(value: T): void {
    this.store = value
  }

  disable(): void {
    this.store = undefined
  }
}
