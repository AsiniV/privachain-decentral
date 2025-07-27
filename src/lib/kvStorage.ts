/**
 * Simple key-value storage using localStorage
 * Replacement for spark.kv functionality
 */

class LocalKVStorage {
  private prefix = 'privachain_';

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting key "${key}":`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting key "${key}":`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error(`Error deleting key "${key}":`, error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
      return keys;
    } catch (error) {
      console.error('Error getting keys:', error);
      return [];
    }
  }
}

// Global KV storage instance
export const kvStorage = new LocalKVStorage();

// Create a global spark-like object for compatibility
declare global {
  interface Window {
    spark: {
      kv: LocalKVStorage;
    };
  }
}

// Initialize global spark object
if (typeof window !== 'undefined') {
  window.spark = {
    kv: kvStorage
  };
}