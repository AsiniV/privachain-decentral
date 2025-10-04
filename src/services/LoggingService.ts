/**
 * Centralized Logging Service
 * Provides structured logging with PII/secret scrubbing
 * Supports multiple output formats and destinations
 */

import winston from 'winston'
import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'

export interface LogContext {
  correlationId?: string
  userId?: string
  action?: string
  component?: string
  [key: string]: unknown
}

export class LoggingService {
  private static instance: LoggingService
  private logger: winston.Logger
  private sensitivePatterns: RegExp[]

  private constructor() {
    // Initialize sensitive data patterns for scrubbing
    this.sensitivePatterns = [
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
      // Wallet addresses (cosmos/ethereum style)
      /cosmos[a-z0-9]{39}/gi,
      /0x[a-fA-F0-9]{40}/g,
      // Private keys (hex patterns)
      /[a-fA-F0-9]{64}/g
    ]

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const scrubbedMeta = this.scrubObjectSensitiveData(meta) as Record<string, unknown>
          const logEntry = {
            timestamp,
            level,
            message: this.scrubSensitiveData(message),
            ...scrubbedMeta
          }
          return JSON.stringify(logEntry)
        })
      ),
      defaultMeta: { service: 'privachain' },
      transports: [
        // Console output for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        // File output for production
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      ]
    })

    // Create logs directory if it doesn't exist
    if (typeof process !== 'undefined') {
      const logsDir = path.join(process.cwd(), 'logs')
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }
    }
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService()
    }
    return LoggingService.instance
  }

  /**
   * Scrub sensitive data from strings using HMAC for consistent redaction
   */
  private scrubSensitiveData(data: unknown): string {
    if (typeof data !== 'string') {
      return String(data)
    }

    let scrubbed = data
    for (const pattern of this.sensitivePatterns) {
      scrubbed = scrubbed.replace(pattern, (match) => {
        // Use HMAC for consistent redaction while preserving some information
        const hash = createHash('sha256')
          .update(match + 'privachain-salt')
          .digest('hex')
          .substring(0, 8)
        return `[REDACTED-${hash}]`
      })
    }
    return scrubbed
  }

  /**
   * Recursively scrub sensitive data from objects
   */
  private scrubObjectSensitiveData(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return this.scrubSensitiveData(obj)
      }
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.scrubObjectSensitiveData(item))
    }

    const scrubbed: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      // Scrub sensitive keys
      if (this.sensitivePatterns.some(pattern => pattern.test(key))) {
        const hash = createHash('sha256')
          .update(String(value) + 'privachain-salt')
          .digest('hex')
          .substring(0, 8)
        scrubbed[key] = `[REDACTED-${hash}]`
      } else {
        scrubbed[key] = this.scrubObjectSensitiveData(value)
      }
    }
    return scrubbed
  }

  /**
   * Generate correlation ID for request tracking
   */
  public generateCorrelationId(): string {
    return `privachain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Log info level message
   */
  public info(message: string, context?: LogContext): void {
    this.logger.info(message, context)
  }

  /**
   * Log warning level message
   */
  public warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context)
  }

  /**
   * Log error level message
   */
  public error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, {
      error: error?.message,
      stack: error?.stack,
      ...context
    })
  }

  /**
   * Log fatal level message
   */
  public fatal(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, {
      level: 'fatal',
      error: error?.message,
      stack: error?.stack,
      ...context
    })
  }

  /**
   * Log debug level message
   */
  public debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context)
  }

  /**
   * Create a child logger with default context
   */
  public child(defaultContext: LogContext): LoggingService {
    const childLogger = Object.create(this)
    childLogger.logger = this.logger.child(defaultContext)
    return childLogger
  }

  /**
   * Log structured event for monitoring
   */
  public logEvent(event: string, details: unknown, context?: LogContext): void {
    this.info(`Event: ${event}`, {
      event,
      details: this.scrubObjectSensitiveData(details),
      ...context
    })
  }

  /**
   * Log performance metrics
   */
  public logPerformance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      unit: 'ms',
      ...context
    })
  }

  /**
   * Get the underlying winston logger for advanced usage
   */
  public getLogger(): winston.Logger {
    return this.logger
  }
}

// Singleton instance
export const loggingService = LoggingService.getInstance()