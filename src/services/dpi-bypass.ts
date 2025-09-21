// src/services/dpi-bypass.ts
export class DPIBypassService {
  private worker: Worker | null = null;
  private obfuscationKey: CryptoKey | null = null;
  private initialized = false;
  
  constructor() {
    this.initializeService();
  }
  
  private async initializeService() {
    try {
      // Check if we're in browser environment
      if (typeof window !== 'undefined' && window.Worker) {
        // Initialize Web Worker for DPI bypass operations
        this.worker = new Worker('/workers/dpi-worker.js', { type: 'module' });
        
        // Generate obfuscation key
        await this.initializeObfuscation();
        
        this.initialized = true;
        console.log('🔒 DPI Bypass Service initialized');
      } else {
        // Node.js environment - limited functionality
        console.log('🔒 DPI Bypass Service: Node.js mode (limited functionality)');
        await this.initializeObfuscation();
        this.initialized = true;
      }
    } catch (error) {
      console.warn('DPI Bypass Service initialization failed:', error);
      // Graceful fallback - service will work without advanced DPI bypass
    }
  }
  
  private async initializeObfuscation() {
    try {
      // Check if crypto.subtle is available (browser or Node.js with webcrypto)
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        this.obfuscationKey = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
      } else {
        console.warn('WebCrypto not available, DPI bypass encryption disabled');
      }
    } catch (error) {
      console.warn('Failed to generate obfuscation key:', error);
    }
  }
  
  async fetchWithBypass(url: string, options: RequestInit = {}): Promise<Response> {
    // If not initialized or in Node.js without Worker, fall back to enhanced direct fetch
    if (!this.initialized || !this.worker) {
      console.warn('DPI Bypass Worker not available, using enhanced fallback');
      return this.enhancedDirectFetch(url, options);
    }
    
    const bypassDomains = [
      'bypass1.privachain.io',
      'bypass2.privachain.io', 
      'bypass3.privachain.io'
    ];
    
    const domain = bypassDomains[Math.floor(Math.random() * bypassDomains.length)];
    
    try {
      if (!this.obfuscationKey) {
        return this.enhancedDirectFetch(url, options);
      }
      
      const obfuscationKeyBytes = await crypto.subtle.exportKey('raw', this.obfuscationKey);
      
      const bypassRequest = {
        type: 'FETCH',
        payload: {
          url,
          domain,
          options: {
            ...options,
            // Serialize headers for worker
            headers: options.headers ? 
              Object.fromEntries(new Headers(options.headers).entries()) : {}
          },
          obfuscationKey: Array.from(new Uint8Array(obfuscationKeyBytes))
        }
      };
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('DPI bypass request timeout'));
        }, 30000);
        
        this.worker!.postMessage(bypassRequest);
        
        this.worker!.onmessage = (event) => {
          clearTimeout(timeout);
          
          if (event.data.error) {
            console.warn('DPI bypass failed, falling back to direct fetch:', event.data.error);
            // Fallback to direct fetch
            this.enhancedDirectFetch(url, options).then(resolve).catch(reject);
          } else {
            const response = new Response(event.data.body, {
              status: event.data.status,
              statusText: event.data.statusText,
              headers: new Headers(event.data.headers)
            });
            resolve(response);
          }
        };
        
        this.worker!.onerror = (error) => {
          clearTimeout(timeout);
          console.warn('DPI bypass worker error, falling back:', error);
          // Fallback to direct fetch
          this.enhancedDirectFetch(url, options).then(resolve).catch(reject);
        };
      });
    } catch (error) {
      console.warn('DPI bypass error, falling back to direct fetch:', error);
      return this.enhancedDirectFetch(url, options);
    }
  }
  
  /**
   * Enhanced direct fetch with basic domain fronting simulation
   */
  private async enhancedDirectFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Add randomized headers for basic traffic obfuscation
    const headers = new Headers(options.headers);
    
    if (!headers.has('User-Agent')) {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      ];
      headers.set('User-Agent', userAgents[Math.floor(Math.random() * userAgents.length)]);
    }
    
    // Add random timing jitter to mask traffic patterns
    const jitter = Math.random() * 100; // 0-100ms
    await new Promise(resolve => setTimeout(resolve, jitter));
    
    return fetch(url, { ...options, headers });
  }
  
  /**
   * Obfuscate request data for DPI evasion
   */
  async obfuscateData(data: ArrayBuffer): Promise<ArrayBuffer> {
    if (!this.obfuscationKey) {
      return data; // Return original data if obfuscation not available
    }
    
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.obfuscationKey,
        data
      );
      
      // Combine IV and encrypted data
      const result = new Uint8Array(iv.length + encrypted.byteLength);
      result.set(iv);
      result.set(new Uint8Array(encrypted), iv.length);
      
      return result.buffer;
    } catch (error) {
      console.warn('Data obfuscation failed:', error);
      return data;
    }
  }
  
  /**
   * Deobfuscate response data
   */
  async deobfuscateData(obfuscatedData: ArrayBuffer): Promise<ArrayBuffer> {
    if (!this.obfuscationKey) {
      return obfuscatedData;
    }
    
    try {
      const data = new Uint8Array(obfuscatedData);
      const iv = data.slice(0, 12);
      const encrypted = data.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.obfuscationKey,
        encrypted
      );
      
      return decrypted;
    } catch (error) {
      console.warn('Data deobfuscation failed:', error);
      return obfuscatedData;
    }
  }
  
  /**
   * Check if DPI bypass is available and working
   */
  isAvailable(): boolean {
    return this.initialized && this.worker !== null && this.obfuscationKey !== null;
  }
  
  /**
   * Get bypass statistics
   */
  getStats() {
    return {
      available: this.isAvailable(),
      initialized: this.initialized,
      workerReady: this.worker !== null,
      encryptionReady: this.obfuscationKey !== null
    };
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.obfuscationKey = null;
    this.initialized = false;
  }
}

// Singleton instance
export const dpiBypass = new DPIBypassService();