// public/workers/dpi-worker.js
/**
 * DPI Bypass Web Worker
 * Handles domain fronting and traffic obfuscation in a separate thread
 */

class DPIWorker {
  constructor() {
    this.frontDomains = [
      'cloudfront.net',
      'azureedge.net', 
      'googleapis.com',
      'fastly.com',
      'cloudflare.com'
    ];
  }
  
  async handleFetchRequest(payload) {
    const { url, domain, options, obfuscationKey } = payload;
    
    try {
      // Select random front domain for domain fronting
      const frontDomain = this.frontDomains[Math.floor(Math.random() * this.frontDomains.length)];
      
      // Parse target URL
      const targetUrl = new URL(url);
      const targetHost = targetUrl.hostname;
      
      // Create fronted URL
      const frontedUrl = `https://${frontDomain}${targetUrl.pathname}${targetUrl.search}`;
      
      // Prepare headers with Host header spoofing for domain fronting
      const headers = new Headers(options.headers || {});
      headers.set('Host', targetHost);
      headers.set('User-Agent', this.getRandomUserAgent());
      
      // Add noise headers for traffic obfuscation
      this.addNoiseHeaders(headers);
      
      // Obfuscate request body if present
      let body = options.body;
      if (body && obfuscationKey) {
        body = await this.obfuscateData(body, obfuscationKey);
      }
      
      // Make the fronted request
      const response = await fetch(frontedUrl, {
        ...options,
        headers: Object.fromEntries(headers.entries()),
        body
      });
      
      // Read response
      let responseBody = await response.arrayBuffer();
      
      // Deobfuscate response if needed
      if (obfuscationKey && response.headers.get('x-obfuscated')) {
        responseBody = await this.deobfuscateData(responseBody, obfuscationKey);
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody
      };
      
    } catch (error) {
      console.error('DPI bypass request failed:', error);
      throw error;
    }
  }
  
  async obfuscateData(data, keyBytes) {
    try {
      // Convert key bytes to CryptoKey
      const key = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(keyBytes),
        'AES-GCM',
        false,
        ['encrypt']
      );
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt data
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        typeof data === 'string' ? new TextEncoder().encode(data) : data
      );
      
      // Combine IV and encrypted data
      const result = new Uint8Array(iv.length + encrypted.byteLength);
      result.set(iv);
      result.set(new Uint8Array(encrypted), iv.length);
      
      return result.buffer;
    } catch (error) {
      console.warn('Obfuscation failed:', error);
      return data;
    }
  }
  
  async deobfuscateData(obfuscatedData, keyBytes) {
    try {
      // Convert key bytes to CryptoKey
      const key = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(keyBytes),
        'AES-GCM',
        false,
        ['decrypt']
      );
      
      const data = new Uint8Array(obfuscatedData);
      const iv = data.slice(0, 12);
      const encrypted = data.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      return decrypted;
    } catch (error) {
      console.warn('Deobfuscation failed:', error);
      return obfuscatedData;
    }
  }
  
  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
  
  addNoiseHeaders(headers) {
    // Add random headers to obfuscate traffic patterns
    const noiseHeaders = [
      ['X-Requested-With', 'XMLHttpRequest'],
      ['Accept-Language', 'en-US,en;q=0.9'],
      ['Accept-Encoding', 'gzip, deflate, br'],
      ['Cache-Control', 'no-cache'],
      ['Pragma', 'no-cache'],
      ['DNT', '1'],
      ['Upgrade-Insecure-Requests', '1']
    ];
    
    // Randomly add some noise headers
    noiseHeaders.forEach(([name, value]) => {
      if (Math.random() > 0.5 && !headers.has(name)) {
        headers.set(name, value);
      }
    });
    
    // Add random custom headers occasionally
    if (Math.random() > 0.7) {
      const randomId = Math.random().toString(36).substring(7);
      headers.set(`X-Client-${randomId}`, Date.now().toString());
    }
  }
}

// Initialize worker
const dpiWorker = new DPIWorker();

// Handle messages from main thread
self.onmessage = async function(event) {
  const { type, payload } = event.data;
  
  try {
    switch (type) {
      case 'FETCH':
        const result = await dpiWorker.handleFetchRequest(payload);
        self.postMessage(result);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      error: error.message || 'DPI bypass operation failed'
    });
  }
};