/**
 * Error Tracking Service
 * Centralized error tracking and reporting with Sentry integration
 * Includes PII scrubbing and context enrichment
 */

import * as Sentry from '@sentry/node'
import { loggingService } from './LoggingService'

export interface ErrorContext {
  correlationId?: string
  userId?: string
  component?: string
  action?: string
  extra?: Record<string, any>
  tags?: Record<string, string>
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
}

export class ErrorTrackingService {
  private static instance: ErrorTrackingService
  private initialized = false

  private constructor() {
    this.initialize()
  }

  public static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService()
    }
    return ErrorTrackingService.instance
  }

  /**
   * Initialize Sentry error tracking
   */
  private initialize(): void {
    try {
      const dsn = process.env.SENTRY_DSN
      
      if (!dsn) {
        loggingService.warn('SENTRY_DSN not configured - error tracking disabled')
        return
      }

      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.npm_package_version || '1.0.0',
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
        
        // PII scrubbing configuration
        beforeSend: (event) => {
          return this.scrubSentryEvent(event) as any
        },

        // Configure integrations using modern Sentry API
        integrations: [
          Sentry.httpIntegration(),
          Sentry.expressIntegration(),
          Sentry.onUncaughtExceptionIntegration(),
          Sentry.onUnhandledRejectionIntegration(),
        ],

        // Default tags
        initialScope: {
          tags: {
            service: 'privachain',
            component: 'backend'
          }
        }
      })

      this.initialized = true
      loggingService.info('Error tracking initialized with Sentry')

      // Handle uncaught exceptions and unhandled rejections
      this.setupGlobalErrorHandling()

    } catch (error) {
      loggingService.error('Failed to initialize error tracking', error)
    }
  }

  /**
   * Setup global error handling
   */
  private setupGlobalErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      this.captureException(error, {
        level: 'fatal',
        component: 'global',
        action: 'uncaught_exception'
      })
      
      // Log and exit gracefully
      loggingService.fatal('Uncaught exception - process will exit', error)
      process.exit(1)
    })

    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason))
      this.captureException(error, {
        level: 'error',
        component: 'global',
        action: 'unhandled_rejection',
        extra: { promise: promise.toString() }
      })
      
      loggingService.error('Unhandled promise rejection', error)
    })
  }

  /**
   * Scrub sensitive data from Sentry events
   */
  private scrubSentryEvent(event: Sentry.Event): Sentry.Event | null {
    if (!event) return event

    // Scrub sensitive data from exception messages
    if (event.exception?.values) {
      event.exception.values = event.exception.values.map(exception => ({
        ...exception,
        value: this.scrubSensitiveData(exception.value || ''),
        stacktrace: exception.stacktrace ? {
          ...exception.stacktrace,
          frames: exception.stacktrace.frames?.map(frame => ({
            ...frame,
            vars: this.scrubObjectSensitiveData(frame.vars || {})
          }))
        } : undefined
      }))
    }

    // Scrub sensitive data from request data
    if (event.request) {
      event.request = {
        ...event.request,
        data: this.scrubObjectSensitiveData(event.request.data),
        headers: this.scrubObjectSensitiveData(event.request.headers || {}),
        env: this.scrubObjectSensitiveData(event.request.env || {})
      }
    }

    // Scrub sensitive data from extra context
    if (event.extra) {
      event.extra = this.scrubObjectSensitiveData(event.extra)
    }

    // Scrub sensitive data from user context
    if (event.user) {
      event.user = {
        ...event.user,
        email: event.user.email ? this.hashEmail(event.user.email) : undefined
      }
    }

    return event
  }

  /**
   * Scrub sensitive data from strings
   */
  private scrubSensitiveData(data: string): string {
    if (typeof data !== 'string') return data

    const sensitivePatterns = [
      /METERED_TURN_SECRET/gi,
      /METERED_API_KEY/gi,
      /password/gi,
      /secret/gi,
      /token/gi,
      /key/gi,
      /credential/gi,
      /mnemonic/gi,
      /privatekey/gi,
      /private_key/gi,
      // Email patterns
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      // Wallet addresses
      /cosmos[a-z0-9]{39}/gi,
      /0x[a-fA-F0-9]{40}/g,
      // Private keys
      /[a-fA-F0-9]{64}/g
    ]

    let scrubbed = data
    for (const pattern of sensitivePatterns) {
      scrubbed = scrubbed.replace(pattern, '[REDACTED]')
    }
    return scrubbed
  }

  /**
   * Recursively scrub sensitive data from objects
   */
  private scrubObjectSensitiveData(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return this.scrubSensitiveData(obj)
      }
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.scrubObjectSensitiveData(item))
    }

    const scrubbed: any = {}
    const sensitiveKeys = ['password', 'secret', 'token', 'key', 'credential', 'mnemonic', 'privatekey', 'private_key']
    
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some(pattern => key.toLowerCase().includes(pattern))) {
        scrubbed[key] = '[REDACTED]'
      } else {
        scrubbed[key] = this.scrubObjectSensitiveData(value)
      }
    }
    return scrubbed
  }

  /**
   * Hash email for privacy while maintaining some tracking capability
   */
  private hashEmail(email: string): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(email + 'privachain-salt').digest('hex').substring(0, 16)
  }

  /**
   * Capture exception with context
   */
  public captureException(error: Error, context?: ErrorContext): void {
    // Always log to our logging service
    loggingService.error(error.message, error, {
      correlationId: context?.correlationId,
      component: context?.component,
      action: context?.action
    })

    if (!this.initialized) return

    try {
      Sentry.withScope((scope) => {
        // Set context
        if (context?.correlationId) scope.setTag('correlationId', context.correlationId)
        if (context?.userId) scope.setUser({ id: context.userId })
        if (context?.component) scope.setTag('component', context.component)
        if (context?.action) scope.setTag('action', context.action)
        if (context?.level) scope.setLevel(context.level)
        
        // Add extra context
        if (context?.extra) scope.setExtras(context.extra)
        if (context?.tags) {
          Object.entries(context.tags).forEach(([key, value]) => {
            scope.setTag(key, value)
          })
        }

        Sentry.captureException(error)
      })
    } catch (sentryError) {
      loggingService.error('Failed to send error to Sentry', sentryError)
    }
  }

  /**
   * Capture custom message
   */
  public captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: ErrorContext): void {
    // Always log to our logging service
    const logLevel = level === 'fatal' ? 'fatal' : level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info'
    loggingService[logLevel as keyof typeof loggingService](message, {
      correlationId: context?.correlationId,
      component: context?.component,
      action: context?.action
    } as any)

    if (!this.initialized) return

    try {
      Sentry.withScope((scope) => {
        // Set context
        if (context?.correlationId) scope.setTag('correlationId', context.correlationId)
        if (context?.userId) scope.setUser({ id: context.userId })
        if (context?.component) scope.setTag('component', context.component)
        if (context?.action) scope.setTag('action', context.action)
        
        // Add extra context
        if (context?.extra) scope.setExtras(context.extra)
        if (context?.tags) {
          Object.entries(context.tags).forEach(([key, value]) => {
            scope.setTag(key, value)
          })
        }

        Sentry.captureMessage(message, level)
      })
    } catch (sentryError) {
      loggingService.error('Failed to send message to Sentry', sentryError)
    }
  }

  /**
   * Set user context for subsequent errors
   */
  public setUser(user: { id?: string; email?: string; username?: string }): void {
    if (!this.initialized) return

    Sentry.setUser({
      id: user.id,
      email: user.email ? this.hashEmail(user.email) : undefined,
      username: user.username
    })
  }

  /**
   * Add breadcrumb for debugging context
   */
  public addBreadcrumb(message: string, category: string, data?: any): void {
    if (!this.initialized) return

    Sentry.addBreadcrumb({
      message,
      category,
      data: this.scrubObjectSensitiveData(data || {}),
      level: 'info'
    })
  }

  /**
   * Flush pending events (useful for shutdown)
   */
  public async flush(timeout = 2000): Promise<boolean> {
    if (!this.initialized) return true

    try {
      return await Sentry.flush(timeout)
    } catch (error) {
      loggingService.error('Failed to flush Sentry events', error)
      return false
    }
  }

  /**
   * Check if error tracking is initialized
   */
  public isInitialized(): boolean {
    return this.initialized
  }
}

// Singleton instance
export const errorTrackingService = ErrorTrackingService.getInstance()