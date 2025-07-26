/**
 * Content Filtering and Security Service for PrivaChain Browser
 * Provides comprehensive security, ad-blocking, and content filtering
 */

export interface SecurityRule {
  id: string
  type: 'block' | 'allow' | 'sanitize' | 'redirect'
  pattern: string | RegExp
  category: SecurityCategory
  enabled: boolean
  description: string
}

export type SecurityCategory = 
  | 'malware' 
  | 'phishing' 
  | 'ads' 
  | 'trackers' 
  | 'social' 
  | 'analytics' 
  | 'cryptomining' 
  | 'adult'
  | 'gambling'
  | 'custom'

export interface ContentFilter {
  adBlock: boolean
  trackingProtection: boolean
  malwareProtection: boolean
  phishingProtection: boolean
  socialMediaBlock: boolean
  cryptominingBlock: boolean
  customRules: SecurityRule[]
}

export interface SecurityStatus {
  totalBlocked: number
  adsBlocked: number
  trackersBlocked: number
  malwareBlocked: number
  phishingBlocked: number
  bytesBlocked: number
  loadTimeImproved: number
}

class ContentFilteringService {
  private rules: SecurityRule[] = []
  private blockedDomains: Set<string> = new Set()
  private allowedDomains: Set<string> = new Set()
  private stats: SecurityStatus = {
    totalBlocked: 0,
    adsBlocked: 0,
    trackersBlocked: 0,
    malwareBlocked: 0,
    phishingBlocked: 0,
    bytesBlocked: 0,
    loadTimeImproved: 0
  }

  private adBlockRules: SecurityRule[] = [
    {
      id: 'google-ads',
      type: 'block',
      pattern: /^https?:\/\/.*\.googleadservices\.com/,
      category: 'ads',
      enabled: true,
      description: 'Google Ads'
    },
    {
      id: 'doubleclick',
      type: 'block',
      pattern: /^https?:\/\/.*\.doubleclick\.net/,
      category: 'ads',
      enabled: true,
      description: 'DoubleClick advertising'
    },
    {
      id: 'facebook-ads',
      type: 'block',
      pattern: /^https?:\/\/.*\.facebook\.com\/tr/,
      category: 'ads',
      enabled: true,
      description: 'Facebook tracking pixel'
    },
    {
      id: 'amazon-ads',
      type: 'block',
      pattern: /^https?:\/\/.*\.amazon-adsystem\.com/,
      category: 'ads',
      enabled: true,
      description: 'Amazon advertising'
    },
    {
      id: 'twitter-ads',
      type: 'block',
      pattern: /^https?:\/\/.*\.ads-twitter\.com/,
      category: 'ads',
      enabled: true,
      description: 'Twitter ads'
    }
  ]

  private trackingRules: SecurityRule[] = [
    {
      id: 'google-analytics',
      type: 'block',
      pattern: /^https?:\/\/.*\.google-analytics\.com/,
      category: 'trackers',
      enabled: true,
      description: 'Google Analytics'
    },
    {
      id: 'facebook-pixel',
      type: 'block',
      pattern: /^https?:\/\/.*\.facebook\.com\/tr/,
      category: 'trackers',
      enabled: true,
      description: 'Facebook Pixel'
    },
    {
      id: 'hotjar',
      type: 'block',
      pattern: /^https?:\/\/.*\.hotjar\.com/,
      category: 'trackers',
      enabled: true,
      description: 'Hotjar tracking'
    },
    {
      id: 'mixpanel',
      type: 'block',
      pattern: /^https?:\/\/.*\.mixpanel\.com/,
      category: 'trackers',
      enabled: true,
      description: 'Mixpanel analytics'
    },
    {
      id: 'segment',
      type: 'block',
      pattern: /^https?:\/\/.*\.segment\.com/,
      category: 'trackers',
      enabled: true,
      description: 'Segment analytics'
    }
  ]

  private malwareRules: SecurityRule[] = [
    {
      id: 'suspicious-domains',
      type: 'block',
      pattern: /\.(tk|ml|ga|cf)$/,
      category: 'malware',
      enabled: true,
      description: 'Suspicious TLD domains'
    },
    {
      id: 'url-shorteners',
      type: 'sanitize',
      pattern: /^https?:\/\/(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly)/,
      category: 'malware',
      enabled: true,
      description: 'URL shorteners'
    }
  ]

  private phishingRules: SecurityRule[] = [
    {
      id: 'fake-banks',
      type: 'block',
      pattern: /(?:secure|login|account).*(?:bank|paypal|amazon|microsoft|apple|google).*\.(tk|ml|ga|cf|info)/,
      category: 'phishing',
      enabled: true,
      description: 'Fake banking sites'
    },
    {
      id: 'suspicious-subdomains',
      type: 'block',
      pattern: /^https?:\/\/[a-z0-9-]+\.(?:paypal|amazon|microsoft|apple|google|facebook)\.(?!com|org|net)/,
      category: 'phishing',
      enabled: true,
      description: 'Suspicious subdomains'
    }
  ]

  private cryptominingRules: SecurityRule[] = [
    {
      id: 'coinhive',
      type: 'block',
      pattern: /^https?:\/\/.*\.coinhive\.com/,
      category: 'cryptomining',
      enabled: true,
      description: 'Coinhive mining'
    },
    {
      id: 'cryptoloot',
      type: 'block',
      pattern: /^https?:\/\/.*\.crypto-loot\.com/,
      category: 'cryptomining',
      enabled: true,
      description: 'CryptoLoot mining'
    },
    {
      id: 'mining-scripts',
      type: 'block',
      pattern: /(?:miner|mining|cryptonight|monero)\.js/,
      category: 'cryptomining',
      enabled: true,
      description: 'Mining scripts'
    }
  ]

  async initialize(): Promise<void> {
    this.rules = [
      ...this.adBlockRules,
      ...this.trackingRules,
      ...this.malwareRules,
      ...this.phishingRules,
      ...this.cryptominingRules
    ]

    await this.loadAdBlockLists()
    await this.loadMalwareDomains()
    await this.loadPhishingDomains()
  }

  private async loadAdBlockLists(): Promise<void> {
    try {
      // In a real implementation, this would fetch from EasyList, uBlock Origin, etc.
      const commonAdDomains = [
        'googleadservices.com',
        'googlesyndication.com',
        'doubleclick.net',
        'googletagmanager.com',
        'facebook.com/tr',
        'amazon-adsystem.com',
        'ads.yahoo.com',
        'adsystem.amazon.com',
        'bing.com/sa',
        'outbrain.com',
        'taboola.com',
        'adskeeper.co.uk',
        'mgid.com',
        'criteo.com',
        'adsystem.amazon.co.uk',
        'pubmatic.com',
        'rubiconproject.com',
        'openx.com',
        'casalemedia.com',
        'adsystem.amazon.ca'
      ]

      commonAdDomains.forEach(domain => {
        this.blockedDomains.add(domain)
      })
    } catch (error) {
      console.warn('Failed to load ad block lists:', error)
    }
  }

  private async loadMalwareDomains(): Promise<void> {
    try {
      // In a real implementation, this would fetch from threat intelligence feeds
      const malwareDomains = [
        'malwaredomainlist.com',
        'malware.com.br',
        'phishing-domain.tk',
        'fake-bank-login.ml'
      ]

      malwareDomains.forEach(domain => {
        this.blockedDomains.add(domain)
      })
    } catch (error) {
      console.warn('Failed to load malware domains:', error)
    }
  }

  private async loadPhishingDomains(): Promise<void> {
    try {
      // In a real implementation, this would fetch from anti-phishing feeds
      const phishingDomains = [
        'phishtank.com',
        'fake-paypal.tk',
        'amazon-security.ml'
      ]

      phishingDomains.forEach(domain => {
        this.blockedDomains.add(domain)
      })
    } catch (error) {
      console.warn('Failed to load phishing domains:', error)
    }
  }

  shouldBlockRequest(url: string, _type: string = 'other'): boolean {
    try {
      const urlObj = new URL(url)
      
      // Check if domain is explicitly allowed
      if (this.allowedDomains.has(urlObj.hostname)) {
        return false
      }

      // Check if domain is explicitly blocked
      if (this.blockedDomains.has(urlObj.hostname)) {
        this.updateStats('ads')
        return true
      }

      // Check against rules
      for (const rule of this.rules) {
        if (!rule.enabled) continue

        let matches = false
        if (typeof rule.pattern === 'string') {
          matches = url.includes(rule.pattern)
        } else {
          matches = rule.pattern.test(url)
        }

        if (matches && rule.type === 'block') {
          this.updateStats(rule.category)
          return true
        }
      }

      return false
    } catch {
      return false
    }
  }

  sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      
      // Remove tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', 'mc_eid', 'mc_cid',
        '_ga', '_gid', '_gat', 'ref', 'referrer'
      ]

      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param)
      })

      return urlObj.toString()
    } catch {
      return url
    }
  }

  sanitizeHTML(html: string): string {
    // Create a temporary div to safely parse HTML
    const temp = document.createElement('div')
    temp.innerHTML = html

    // Remove dangerous elements
    const dangerousElements = ['script', 'iframe', 'object', 'embed', 'form']
    dangerousElements.forEach(tag => {
      const elements = temp.querySelectorAll(tag)
      elements.forEach(el => el.remove())
    })

    // Remove dangerous attributes
    const dangerousAttributes = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus']
    temp.querySelectorAll('*').forEach(el => {
      dangerousAttributes.forEach(attr => {
        el.removeAttribute(attr)
      })
    })

    // Remove javascript: and data: URLs
    temp.querySelectorAll('a, img, link').forEach(el => {
      const href = el.getAttribute('href') || el.getAttribute('src')
      if (href && (href.startsWith('javascript:') || href.startsWith('data:'))) {
        el.removeAttribute('href')
        el.removeAttribute('src')
      }
    })

    return temp.innerHTML
  }

  injectCSP(): void {
    // Inject Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: https:",
      "connect-src 'self' https:",
      "font-src 'self' https:",
      "object-src 'none'",
      "media-src 'self' https:",
      "frame-src 'self' https:"
    ].join('; ')

    const meta = document.createElement('meta')
    meta.httpEquiv = 'Content-Security-Policy'
    meta.content = csp
    document.head.appendChild(meta)
  }

  private updateStats(category: SecurityCategory): void {
    this.stats.totalBlocked++
    
    switch (category) {
      case 'ads':
        this.stats.adsBlocked++
        this.stats.bytesBlocked += 50000 // Estimate 50KB saved per ad
        break
      case 'trackers':
        this.stats.trackersBlocked++
        this.stats.bytesBlocked += 10000 // Estimate 10KB saved per tracker
        break
      case 'malware':
        this.stats.malwareBlocked++
        break
      case 'phishing':
        this.stats.phishingBlocked++
        break
    }

    // Estimate load time improvement
    this.stats.loadTimeImproved = Math.floor(this.stats.bytesBlocked / 10000) // 1ms per 10KB saved
  }

  addCustomRule(rule: SecurityRule): void {
    this.rules.push(rule)
  }

  removeCustomRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId)
  }

  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId)
    if (rule) {
      rule.enabled = enabled
    }
  }

  allowDomain(domain: string): void {
    this.allowedDomains.add(domain)
    this.blockedDomains.delete(domain)
  }

  blockDomain(domain: string): void {
    this.blockedDomains.add(domain)
    this.allowedDomains.delete(domain)
  }

  getStats(): SecurityStatus {
    return { ...this.stats }
  }

  getRules(): SecurityRule[] {
    return [...this.rules]
  }

  resetStats(): void {
    this.stats = {
      totalBlocked: 0,
      adsBlocked: 0,
      trackersBlocked: 0,
      malwareBlocked: 0,
      phishingBlocked: 0,
      bytesBlocked: 0,
      loadTimeImproved: 0
    }
  }

  // Advanced security features
  detectPhishing(url: string, content: string): boolean {
    try {
      const urlObj = new URL(url)
      
      // Check for suspicious domain patterns
      const suspiciousPatterns = [
        /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // IP addresses
        /[a-z0-9-]+\.(?:tk|ml|ga|cf|info)$/, // Suspicious TLDs
        /(?:secure|login|account|verify).*(?:paypal|amazon|microsoft|apple|google)/, // Fake security pages
        /[a-z0-9]+\.(?:paypal|amazon|microsoft|apple|google)\.(?!com|org|net)/ // Typosquatting
      ]

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(urlObj.hostname)) {
          return true
        }
      }

      // Check content for phishing indicators
      const phishingKeywords = [
        'verify your account',
        'suspended account',
        'click here immediately',
        'confirm your identity',
        'security alert',
        'unusual activity'
      ]

      const lowerContent = content.toLowerCase()
      for (const keyword of phishingKeywords) {
        if (lowerContent.includes(keyword)) {
          return true
        }
      }

      return false
    } catch {
      return false
    }
  }

  detectMalware(url: string, content: string): boolean {
    try {
      // Check for malicious script patterns
      const maliciousPatterns = [
        /eval\s*\(\s*['"]/,
        /document\.write\s*\(\s*unescape/,
        /fromCharCode\s*\(\s*[0-9]/,
        /location\.href\s*=\s*['"]/,
        /window\.open\s*\(\s*['"]/
      ]

      for (const pattern of maliciousPatterns) {
        if (pattern.test(content)) {
          return true
        }
      }

      // Check for suspicious file downloads
      const urlObj = new URL(url)
      const suspiciousExtensions = ['.exe', '.scr', '.bat', '.com', '.pif', '.jar']
      for (const ext of suspiciousExtensions) {
        if (urlObj.pathname.endsWith(ext)) {
          return true
        }
      }

      return false
    } catch {
      return false
    }
  }

  // Privacy protection features
  removeTrackingCookies(): void {
    // Remove known tracking cookies
    const trackingCookies = [
      '_ga', '_gid', '_gat', '_gtag',
      '_fbp', '_fbc',
      '__utma', '__utmb', '__utmc', '__utmz',
      '_hjid', '_hjIncludedInSample'
    ]

    trackingCookies.forEach(cookie => {
      document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    })
  }

  spoofFingerprinting(): void {
    // Spoof common fingerprinting techniques
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'plugins', {
        get: () => []
      })

      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => []
      })

      Object.defineProperty(screen, 'colorDepth', {
        get: () => 24
      })

      Object.defineProperty(screen, 'pixelDepth', {
        get: () => 24
      })
    }
  }

  blockCanvasFingerprinting(): void {
    // Override canvas fingerprinting
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData

    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      // Add random noise to prevent fingerprinting
      const ctx = this.getContext('2d')
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height)
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] += Math.floor(Math.random() * 10) - 5
          imageData.data[i + 1] += Math.floor(Math.random() * 10) - 5
          imageData.data[i + 2] += Math.floor(Math.random() * 10) - 5
        }
        ctx.putImageData(imageData, 0, 0)
      }
      return originalToDataURL.apply(this, args)
    }

    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      const imageData = originalGetImageData.apply(this, args)
      // Add slight noise to prevent fingerprinting
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] += Math.floor(Math.random() * 6) - 3
        imageData.data[i + 1] += Math.floor(Math.random() * 6) - 3
        imageData.data[i + 2] += Math.floor(Math.random() * 6) - 3
      }
      return imageData
    }
  }
}

// Create global content filtering service instance
export const contentFilter = new ContentFilteringService()

// Initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    contentFilter.initialize().then(() => {
      contentFilter.injectCSP()
      contentFilter.removeTrackingCookies()
      contentFilter.spoofFingerprinting()
      contentFilter.blockCanvasFingerprinting()
    })
  })
}

export default contentFilter