/**
 * Website Unblocking and Bypass Service for PrivaChain Browser
 * Provides comprehensive censorship circumvention and access to blocked content
 */

export interface BlockedSite {
  domain: string
  country: string[]
  reason: 'government' | 'corporate' | 'geographic' | 'copyright'
  bypassMethods: BypassMethod[]
  lastChecked: number
}

export interface BypassMethod {
  type: 'proxy' | 'mirror' | 'archive' | 'p2p' | 'alternative'
  url: string
  reliability: number
  speed: number
  active: boolean
}

export interface UnblockingStats {
  totalSitesUnblocked: number
  successfulBypasses: number
  bypassMethodsUsed: Record<string, number>
  timesSaved: number
  dataDelivered: number
}

class WebsiteUnblockingService {
  private blockedSites: Map<string, BlockedSite> = new Map()
  private mirrorDomains: Map<string, string[]> = new Map()
  private stats: UnblockingStats = {
    totalSitesUnblocked: 0,
    successfulBypasses: 0,
    bypassMethodsUsed: {},
    timesSaved: 0,
    dataDelivered: 0
  }

  async initialize(): Promise<void> {
    await this.loadBlockedSiteDatabase()
    await this.loadMirrorDomains()
    this.setupBypassDetection()
  }

  private async loadBlockedSiteDatabase(): Promise<void> {
    // In production, this would fetch from a real database
    const blockedSitesList: BlockedSite[] = [
      {
        domain: 'youtube.com',
        country: ['CN', 'IR', 'PK'],
        reason: 'government',
        bypassMethods: [
          { type: 'proxy', url: 'https://proxy.privachain.org/youtube.com', reliability: 95, speed: 85, active: true },
          { type: 'mirror', url: 'https://invidious.io', reliability: 90, speed: 80, active: true }
        ],
        lastChecked: Date.now()
      },
      {
        domain: 'facebook.com',
        country: ['CN', 'IR', 'MM'],
        reason: 'government',
        bypassMethods: [
          { type: 'proxy', url: 'https://proxy.privachain.org/facebook.com', reliability: 92, speed: 88, active: true },
          { type: 'p2p', url: 'ipfs://QmFacebookMirror', reliability: 75, speed: 60, active: true }
        ],
        lastChecked: Date.now()
      },
      {
        domain: 'twitter.com',
        country: ['CN', 'IR', 'NG'],
        reason: 'government',
        bypassMethods: [
          { type: 'proxy', url: 'https://proxy.privachain.org/twitter.com', reliability: 94, speed: 90, active: true },
          { type: 'mirror', url: 'https://nitter.net', reliability: 88, speed: 85, active: true }
        ],
        lastChecked: Date.now()
      },
      {
        domain: 'wikipedia.org',
        country: ['CN', 'TR'],
        reason: 'government',
        bypassMethods: [
          { type: 'proxy', url: 'https://proxy.privachain.org/wikipedia.org', reliability: 98, speed: 95, active: true },
          { type: 'archive', url: 'https://archive.org/wikipedia', reliability: 85, speed: 70, active: true }
        ],
        lastChecked: Date.now()
      },
      {
        domain: 'reddit.com',
        country: ['CN', 'ID', 'IN'],
        reason: 'government',
        bypassMethods: [
          { type: 'proxy', url: 'https://proxy.privachain.org/reddit.com', reliability: 91, speed: 87, active: true },
          { type: 'alternative', url: 'https://libredd.it', reliability: 80, speed: 75, active: true }
        ],
        lastChecked: Date.now()
      },
      {
        domain: 'instagram.com',
        country: ['CN', 'IR', 'TR'],
        reason: 'government',
        bypassMethods: [
          { type: 'proxy', url: 'https://proxy.privachain.org/instagram.com', reliability: 89, speed: 83, active: true },
          { type: 'alternative', url: 'https://bibliogram.art', reliability: 70, speed: 65, active: false }
        ],
        lastChecked: Date.now()
      },
      {
        domain: 'netflix.com',
        country: ['CN', 'SY', 'KP'],
        reason: 'geographic',
        bypassMethods: [
          { type: 'proxy', url: 'https://premium.privachain.org/netflix.com', reliability: 85, speed: 90, active: true }
        ],
        lastChecked: Date.now()
      },
      {
        domain: 'thepiratebay.org',
        country: ['US', 'UK', 'AU', 'DE', 'FR'],
        reason: 'copyright',
        bypassMethods: [
          { type: 'mirror', url: 'https://thepiratebay10.org', reliability: 75, speed: 80, active: true },
          { type: 'mirror', url: 'https://tpb.party', reliability: 70, speed: 75, active: true },
          { type: 'alternative', url: 'https://1337x.to', reliability: 90, speed: 85, active: true }
        ],
        lastChecked: Date.now()
      }
    ]

    blockedSitesList.forEach(site => {
      this.blockedSites.set(site.domain, site)
    })
  }

  private async loadMirrorDomains(): Promise<void> {
    // Load known mirror domains for popular sites
    this.mirrorDomains.set('youtube.com', [
      'invidious.io',
      'yewtu.be',
      'inv.riverside.rocks',
      'yt.artemislena.eu'
    ])

    this.mirrorDomains.set('twitter.com', [
      'nitter.net',
      'nitter.it',
      'nitter.42l.fr',
      'nitter.pussthecat.org'
    ])

    this.mirrorDomains.set('reddit.com', [
      'libredd.it',
      'teddit.net',
      'libreddit.spike.codes'
    ])

    this.mirrorDomains.set('instagram.com', [
      'bibliogram.art',
      'ig.opnxng.com'
    ])
  }

  private setupBypassDetection(): void {
    // Monitor for blocked requests and suggest bypasses
    const originalFetch = window.fetch

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const response = await originalFetch.call(window, input, init)
        
        // Check if request was blocked (status codes indicating censorship)
        if (response.status === 403 || response.status === 451 || 
            response.status === 0 || !response.ok) {
          const url = typeof input === 'string' ? input : input.toString()
          this.handleBlockedRequest(url)
        }
        
        return response
      } catch (error) {
        const url = typeof input === 'string' ? input : input.toString()
        this.handleBlockedRequest(url)
        throw error
      }
    }
  }

  private handleBlockedRequest(url: string): void {
    try {
      const domain = new URL(url).hostname
      const blockedSite = this.blockedSites.get(domain)
      
      if (blockedSite) {
        console.log(`Detected blocked access to ${domain}, suggesting bypass methods`)
        // This would trigger UI notifications in the browser
      }
    } catch {
      // Invalid URL, ignore
    }
  }

  async bypassUrl(url: string): Promise<string> {
    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname.replace('www.', '')
      
      // Check if we have bypass methods for this domain
      const blockedSite = this.blockedSites.get(domain)
      if (blockedSite) {
        const bestMethod = this.selectBestBypassMethod(blockedSite.bypassMethods)
        if (bestMethod) {
          this.updateStats(bestMethod.type)
          return await this.constructBypassUrl(url, bestMethod)
        }
      }

      // Check for mirror domains
      const mirrors = this.mirrorDomains.get(domain)
      if (mirrors && mirrors.length > 0) {
        const workingMirror = await this.findWorkingMirror(mirrors)
        if (workingMirror) {
          const bypassUrl = url.replace(domain, workingMirror)
          this.stats.successfulBypasses++
          return bypassUrl
        }
      }

      // Fall back to general proxy
      return this.useGeneralProxy(url)
    } catch (error) {
      console.error('Failed to bypass URL:', error)
      throw new Error('Unable to bypass this URL')
    }
  }

  private selectBestBypassMethod(methods: BypassMethod[]): BypassMethod | null {
    const activeMethods = methods.filter(method => method.active)
    if (activeMethods.length === 0) return null

    // Score methods based on reliability and speed
    return activeMethods.reduce((best, current) => {
      const currentScore = current.reliability * 0.6 + current.speed * 0.4
      const bestScore = best.reliability * 0.6 + best.speed * 0.4
      return currentScore > bestScore ? current : best
    })
  }

  private async constructBypassUrl(originalUrl: string, method: BypassMethod): Promise<string> {
    switch (method.type) {
      case 'proxy':
        // Use PrivaChain proxy infrastructure
        return `${method.url}?target=${encodeURIComponent(originalUrl)}`
      
      case 'mirror':
        // Replace domain with mirror
        const urlObj = new URL(originalUrl)
        const mirrorUrl = new URL(method.url)
        return originalUrl.replace(urlObj.hostname, mirrorUrl.hostname)
      
      case 'archive':
        // Use archive.org or similar
        return `${method.url}/${encodeURIComponent(originalUrl)}`
      
      case 'p2p':
        // Use IPFS or similar P2P network
        return method.url
      
      case 'alternative':
        // Use alternative service
        return method.url
      
      default:
        return originalUrl
    }
  }

  private async findWorkingMirror(mirrors: string[]): Promise<string | null> {
    for (const mirror of mirrors) {
      try {
        // Test if mirror is accessible
        const response = await fetch(`https://${mirror}`, { 
          method: 'HEAD',
          timeout: 5000 
        } as any)
        
        if (response.ok) {
          return mirror
        }
      } catch {
        // Mirror not working, try next one
        continue
      }
    }
    return null
  }

  private useGeneralProxy(url: string): string {
    // Use PrivaChain's general proxy as last resort
    return `https://proxy.privachain.org/browse?url=${encodeURIComponent(url)}`
  }

  private updateStats(bypassType: string): void {
    this.stats.totalSitesUnblocked++
    this.stats.successfulBypasses++
    this.stats.bypassMethodsUsed[bypassType] = (this.stats.bypassMethodsUsed[bypassType] || 0) + 1
  }

  // Check if a domain is known to be blocked
  isDomainBlocked(domain: string): boolean {
    return this.blockedSites.has(domain)
  }

  // Get available bypass methods for a domain
  getBypassMethods(domain: string): BypassMethod[] {
    const blockedSite = this.blockedSites.get(domain)
    return blockedSite?.bypassMethods || []
  }

  // Check if current location blocks certain content
  async detectCensorship(): Promise<string[]> {
    const testUrls = [
      'https://youtube.com',
      'https://facebook.com', 
      'https://twitter.com',
      'https://wikipedia.org'
    ]

    const blockedDomains: string[] = []

    for (const url of testUrls) {
      try {
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 3000) // 3 second timeout

        const response = await fetch(url, { 
          method: 'HEAD',
          signal: controller.signal
        })

        if (!response.ok || response.status === 403 || response.status === 451) {
          const domain = new URL(url).hostname
          blockedDomains.push(domain)
        }
      } catch {
        const domain = new URL(url).hostname
        blockedDomains.push(domain)
      }
    }

    return blockedDomains
  }

  // Smart DNS for bypassing DNS-based blocking
  async resolveWithSmartDNS(domain: string): Promise<string[]> {
    const smartDNSServers = [
      'https://cloudflare-dns.com/dns-query',
      'https://dns.google/dns-query',
      'https://dns.quad9.net/dns-query',
      'https://doh.opendns.com/dns-query'
    ]

    for (const dnsServer of smartDNSServers) {
      try {
        const response = await fetch(`${dnsServer}?name=${domain}&type=A`, {
          headers: { 'Accept': 'application/dns-json' }
        })

        const data = await response.json()
        if (data.Answer && data.Answer.length > 0) {
          return data.Answer.map((answer: any) => answer.data)
        }
      } catch {
        continue
      }
    }

    return []
  }

  // Generate bypass suggestions for blocked content
  generateBypassSuggestions(url: string): string[] {
    try {
      const domain = new URL(url).hostname.replace('www.', '')
      const suggestions: string[] = []

      // Add proxy suggestion
      suggestions.push(`Use PrivaChain Proxy: https://proxy.privachain.org/browse?url=${encodeURIComponent(url)}`)

      // Add mirror suggestions
      const mirrors = this.mirrorDomains.get(domain)
      if (mirrors) {
        mirrors.forEach(mirror => {
          suggestions.push(`Mirror site: https://${mirror}`)
        })
      }

      // Add alternative service suggestions
      const alternatives: Record<string, string[]> = {
        'youtube.com': ['Use Invidious', 'Use NewPipe (mobile)', 'Use FreeTube (desktop)'],
        'twitter.com': ['Use Nitter', 'Use Mastodon', 'Use Pleroma'],
        'reddit.com': ['Use Libreddit', 'Use Teddit', 'Use Lemmy'],
        'facebook.com': ['Use Diaspora', 'Use Friendica', 'Use Mastodon'],
        'instagram.com': ['Use Bibliogram', 'Use Pixelfed']
      }

      if (alternatives[domain]) {
        suggestions.push(...alternatives[domain])
      }

      return suggestions
    } catch {
      return ['Use PrivaChain Proxy for general bypass']
    }
  }

  // Update blocked site information
  updateBlockedSite(domain: string, info: Partial<BlockedSite>): void {
    const existing = this.blockedSites.get(domain)
    if (existing) {
      this.blockedSites.set(domain, { ...existing, ...info, lastChecked: Date.now() })
    } else {
      this.blockedSites.set(domain, {
        domain,
        country: info.country || [],
        reason: info.reason || 'government',
        bypassMethods: info.bypassMethods || [],
        lastChecked: Date.now()
      })
    }
  }

  // Get comprehensive unblocking statistics
  getStats(): UnblockingStats {
    return { ...this.stats }
  }

  // Test bypass method effectiveness
  async testBypassMethod(method: BypassMethod, originalUrl: string): Promise<boolean> {
    try {
      const bypassUrl = await this.constructBypassUrl(originalUrl, method)
      const response = await fetch(bypassUrl, { method: 'HEAD' })
      return response.ok
    } catch {
      return false
    }
  }

  // Automatic bypass attempt
  async autoBypass(url: string): Promise<{ success: boolean; bypassUrl?: string; method?: string }> {
    try {
      const bypassUrl = await this.bypassUrl(url)
      return { success: true, bypassUrl, method: 'auto' }
    } catch (error) {
      return { success: false }
    }
  }

  // Clear statistics
  resetStats(): void {
    this.stats = {
      totalSitesUnblocked: 0,
      successfulBypasses: 0,
      bypassMethodsUsed: {},
      timesSaved: 0,
      dataDelivered: 0
    }
  }
}

// Create global unblocking service instance
export const unblockingService = new WebsiteUnblockingService()

// Initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    unblockingService.initialize().catch(console.error)
  })
}

export default unblockingService