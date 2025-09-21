/**
 * Mock storage for testing - Phase 5: Cosmos SDK Integration
 */

// Mock localStorage for Node.js test environment
class MockStorage {
  private storage = new Map<string, string>()

  getItem(key: string): string | null {
    return this.storage.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value)
  }

  removeItem(key: string): void {
    this.storage.delete(key)
  }

  get length(): number {
    return this.storage.size
  }

  key(index: number): string | null {
    const keys = Array.from(this.storage.keys())
    return keys[index] || null
  }

  clear(): void {
    this.storage.clear()
  }
}

// Set up global localStorage for testing
if (typeof globalThis !== 'undefined' && !globalThis.localStorage) {
  globalThis.localStorage = new MockStorage()
}

if (typeof global !== 'undefined' && !global.localStorage) {
  ;(global as any).localStorage = new MockStorage()
}