import DOMPurify from 'dompurify'

/**
 * Security utilities for content filtering and sanitization
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false
  })
}

/**
 * Content filters for search results and user input
 */
export class ContentFilter {
  private static readonly DISALLOWED_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
    /javascript:/gi,                                        // JavaScript URLs  
    /on\w+\s*=/gi,                                         // Event handlers
    /data:text\/html/gi,                                   // Data URLs
    /vbscript:/gi,                                         // VBScript
    /<iframe/gi,                                           // Iframes
    /<object/gi,                                           // Objects
    /<embed/gi,                                            // Embeds
    /<link/gi,                                             // External links
    /<meta/gi,                                             // Meta tags
  ]

  private static readonly SPAM_INDICATORS = [
    /\b(click here|free|urgent|limited time|act now)\b/gi,
    /\$\d+|\d+%\s*off/gi,                                  // Money/discount patterns
    /\b(viagra|cialis|casino|lottery|winner)\b/gi,        // Spam keywords
    /[\u4e00-\u9fff]{50,}/g,                              // Excessive Chinese chars
    /[А-Я]{50,}/g,                                         // Excessive Cyrillic
  ]

  /**
   * Filter and sanitize search content
   */
  static filterSearchContent(content: string): string {
    // Remove disallowed patterns
    let filtered = content
    for (const pattern of this.DISALLOWED_PATTERNS) {
      filtered = filtered.replace(pattern, '[FILTERED]')
    }

    // Sanitize HTML
    filtered = sanitizeHTML(filtered)

    // Limit length to prevent DoS
    if (filtered.length > 10000) {
      filtered = filtered.substring(0, 10000) + '...[TRUNCATED]'
    }

    return filtered
  }

  /**
   * Check if content appears to be spam
   */
  static isSpamContent(content: string): boolean {
    const spamScore = this.SPAM_INDICATORS.reduce((score, pattern) => {
      const matches = content.match(pattern)
      return score + (matches ? matches.length : 0)
    }, 0)

    // Consider spam if multiple indicators present
    return spamScore >= 2
  }

  /**
   * Validate email domain format
   */
  static isValidEmailDomain(domain: string): boolean {
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.prv$/
    return domainRegex.test(domain) && domain.length <= 64
  }

  /**
   * Rate limiting helper
   */
  static checkRateLimit(userKey: string, action: string, limit: number, window: number): boolean {
    const key = `${userKey}_${action}`
    const now = Date.now()
    
    // Get stored requests from sessionStorage (in production, use Redis)
    const stored = sessionStorage.getItem(key)
    let requests: number[] = stored ? JSON.parse(stored) : []
    
    // Remove old requests outside the window
    requests = requests.filter(time => now - time < window)
    
    // Check if limit exceeded
    if (requests.length >= limit) {
      return false
    }
    
    // Add current request
    requests.push(now)
    sessionStorage.setItem(key, JSON.stringify(requests))
    
    return true
  }

  /**
   * Validate ZK proof format (basic structural validation)
   */
  static isValidZKProofFormat(proof: string): boolean {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(proof)
      if (typeof parsed === 'object' && parsed.proof && parsed.publicSignals) {
        return true
      }
    } catch {
      // If not JSON, check if it's a hex string
      return /^[a-fA-F0-9]{64,}$/.test(proof)
    }
    
    return false
  }
}

/**
 * Input validation utilities
 */
export class InputValidator {
  /**
   * Validate domain name format
   */
  static validateDomainName(domain: string): { valid: boolean; error?: string } {
    if (!domain || domain.length === 0) {
      return { valid: false, error: 'Domain name cannot be empty' }
    }

    if (domain.length > 63) {
      return { valid: false, error: 'Domain name too long (max 63 characters)' }
    }

    if (domain.includes('.')) {
      return { valid: false, error: 'Domain name cannot contain dots' }
    }

    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(domain)) {
      return { valid: false, error: 'Invalid domain name format' }
    }

    return { valid: true }
  }

  /**
   * Validate email subject
   */
  static validateEmailSubject(subject: string): { valid: boolean; error?: string } {
    if (subject.length > 500) {
      return { valid: false, error: 'Subject too long (max 500 characters)' }
    }

    if (ContentFilter.isSpamContent(subject)) {
      return { valid: false, error: 'Subject appears to be spam' }
    }

    return { valid: true }
  }

  /**
   * Validate email body
   */
  static validateEmailBody(body: string): { valid: boolean; error?: string } {
    if (body.length > 50000) {
      return { valid: false, error: 'Email body too long (max 50KB)' }
    }

    if (ContentFilter.isSpamContent(body)) {
      return { valid: false, error: 'Email body appears to be spam' }
    }

    return { valid: true }
  }
}

export default ContentFilter