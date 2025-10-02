/**
 * Metrics Collection Service
 * Provides Prometheus-compatible metrics for system monitoring
 * Tracks performance, errors, and privacy metrics
 */

import { register, collectDefaultMetrics, Counter, Histogram, Gauge, Summary } from 'prom-client'
import { loggingService } from './LoggingService'

export interface MetricsConfig {
  enableDefaultMetrics?: boolean
  defaultMetricsInterval?: number
  prefix?: string
}

export class MetricsService {
  private static instance: MetricsService
  private initialized = false
  private prefix: string

  // Request metrics
  private httpRequestsTotal: Counter<string>
  private httpRequestDuration: Histogram<string>
  
  // Error metrics
  private errorsTotal: Counter<string>
  private errorsByComponent: Counter<string>
  
  // Performance metrics
  private operationDuration: Histogram<string>
  private operationsTotal: Counter<string>
  
  // Resource metrics
  private activeConnections: Gauge<string>
  private queueSize: Gauge<string>
  private dbConnectionPool: Gauge<string>
  
  // Privacy metrics
  private dummyRealRatio: Gauge<string>
  private proofGenerationTime: Histogram<string>
  private batchFillRatio: Gauge<string>
  
  // Storage metrics
  private ipfsOperations: Counter<string>
  private ipfsOperationDuration: Histogram<string>
  private storedDataSize: Gauge<string>
  
  // Networking metrics
  private networkLatency: Histogram<string>
  private connectedPeers: Gauge<string>
  private networkErrors: Counter<string>

  private constructor(config: MetricsConfig = {}) {
    this.prefix = config.prefix || 'privachain_'
    
    // Initialize metrics
    this.initializeMetrics()
    
    // Enable default Node.js metrics
    if (config.enableDefaultMetrics !== false) {
      collectDefaultMetrics({ 
        register,
        prefix: this.prefix
      })
    }
    
    this.initialized = true
    loggingService.info('Metrics service initialized', { prefix: this.prefix })
  }

  public static getInstance(config?: MetricsConfig): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService(config)
    }
    return MetricsService.instance
  }

  /**
   * Initialize all metrics
   */
  private initializeMetrics(): void {
    // HTTP Request metrics
    this.httpRequestsTotal = new Counter({
      name: `${this.prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'endpoint', 'status_code']
    })

    this.httpRequestDuration = new Histogram({
      name: `${this.prefix}http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'endpoint', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
    })

    // Error metrics
    this.errorsTotal = new Counter({
      name: `${this.prefix}errors_total`,
      help: 'Total number of errors',
      labelNames: ['type', 'severity']
    })

    this.errorsByComponent = new Counter({
      name: `${this.prefix}errors_by_component_total`,
      help: 'Total number of errors by component',
      labelNames: ['component', 'error_type']
    })

    // Performance metrics
    this.operationDuration = new Histogram({
      name: `${this.prefix}operation_duration_seconds`,
      help: 'Operation duration in seconds',
      labelNames: ['operation', 'component'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30]
    })

    this.operationsTotal = new Counter({
      name: `${this.prefix}operations_total`,
      help: 'Total number of operations',
      labelNames: ['operation', 'component', 'status']
    })

    // Resource metrics
    this.activeConnections = new Gauge({
      name: `${this.prefix}active_connections`,
      help: 'Number of active connections',
      labelNames: ['type']
    })

    this.queueSize = new Gauge({
      name: `${this.prefix}queue_size`,
      help: 'Size of various queues',
      labelNames: ['queue_name']
    })

    this.dbConnectionPool = new Gauge({
      name: `${this.prefix}db_connection_pool`,
      help: 'Database connection pool metrics',
      labelNames: ['pool_name', 'state']
    })

    // Privacy metrics
    this.dummyRealRatio = new Gauge({
      name: `${this.prefix}dummy_real_ratio`,
      help: 'Ratio of dummy to real traffic for privacy',
      labelNames: ['component']
    })

    this.proofGenerationTime = new Histogram({
      name: `${this.prefix}proof_generation_time_seconds`,
      help: 'Time to generate zero-knowledge proofs',
      labelNames: ['proof_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    })

    this.batchFillRatio = new Gauge({
      name: `${this.prefix}batch_fill_ratio`,
      help: 'Ratio of batch filling for privacy batching',
      labelNames: ['batch_type']
    })

    // Storage metrics
    this.ipfsOperations = new Counter({
      name: `${this.prefix}ipfs_operations_total`,
      help: 'Total IPFS operations',
      labelNames: ['operation', 'status']
    })

    this.ipfsOperationDuration = new Histogram({
      name: `${this.prefix}ipfs_operation_duration_seconds`,
      help: 'IPFS operation duration in seconds',
      labelNames: ['operation'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120]
    })

    this.storedDataSize = new Gauge({
      name: `${this.prefix}stored_data_size_bytes`,
      help: 'Size of stored data in bytes',
      labelNames: ['storage_type']
    })

    // Networking metrics
    this.networkLatency = new Histogram({
      name: `${this.prefix}network_latency_seconds`,
      help: 'Network latency in seconds',
      labelNames: ['target', 'protocol'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
    })

    this.connectedPeers = new Gauge({
      name: `${this.prefix}connected_peers`,
      help: 'Number of connected peers',
      labelNames: ['network']
    })

    this.networkErrors = new Counter({
      name: `${this.prefix}network_errors_total`,
      help: 'Total network errors',
      labelNames: ['error_type', 'target']
    })
  }

  /**
   * Record HTTP request metrics
   */
  public recordHttpRequest(method: string, endpoint: string, statusCode: number, duration: number): void {
    if (!this.initialized) return

    this.httpRequestsTotal.inc({ method, endpoint, status_code: statusCode.toString() })
    this.httpRequestDuration.observe({ method, endpoint, status_code: statusCode.toString() }, duration)
  }

  /**
   * Record error metrics
   */
  public recordError(errorType: string, severity: 'low' | 'medium' | 'high' | 'critical', component?: string): void {
    if (!this.initialized) return

    this.errorsTotal.inc({ type: errorType, severity })
    
    if (component) {
      this.errorsByComponent.inc({ component, error_type: errorType })
    }
  }

  /**
   * Record operation metrics
   */
  public recordOperation(operation: string, component: string, duration: number, status: 'success' | 'error' | 'timeout'): void {
    if (!this.initialized) return

    this.operationDuration.observe({ operation, component }, duration)
    this.operationsTotal.inc({ operation, component, status })
  }

  /**
   * Set active connections
   */
  public setActiveConnections(type: string, count: number): void {
    if (!this.initialized) return
    this.activeConnections.set({ type }, count)
  }

  /**
   * Set queue size
   */
  public setQueueSize(queueName: string, size: number): void {
    if (!this.initialized) return
    this.queueSize.set({ queue_name: queueName }, size)
  }

  /**
   * Set database connection pool metrics
   */
  public setDbConnectionPool(poolName: string, state: 'active' | 'idle' | 'total', count: number): void {
    if (!this.initialized) return
    this.dbConnectionPool.set({ pool_name: poolName, state }, count)
  }

  /**
   * Set privacy dummy/real ratio
   */
  public setDummyRealRatio(component: string, ratio: number): void {
    if (!this.initialized) return
    this.dummyRealRatio.set({ component }, ratio)
  }

  /**
   * Record proof generation time
   */
  public recordProofGeneration(proofType: string, duration: number): void {
    if (!this.initialized) return
    this.proofGenerationTime.observe({ proof_type: proofType }, duration)
  }

  /**
   * Set batch fill ratio
   */
  public setBatchFillRatio(batchType: string, ratio: number): void {
    if (!this.initialized) return
    this.batchFillRatio.set({ batch_type: batchType }, ratio)
  }

  /**
   * Record IPFS operation
   */
  public recordIpfsOperation(operation: string, duration: number, status: 'success' | 'error'): void {
    if (!this.initialized) return

    this.ipfsOperations.inc({ operation, status })
    this.ipfsOperationDuration.observe({ operation }, duration)
  }

  /**
   * Set stored data size
   */
  public setStoredDataSize(storageType: string, sizeBytes: number): void {
    if (!this.initialized) return
    this.storedDataSize.set({ storage_type: storageType }, sizeBytes)
  }

  /**
   * Record network latency
   */
  public recordNetworkLatency(target: string, protocol: string, latency: number): void {
    if (!this.initialized) return
    this.networkLatency.observe({ target, protocol }, latency)
  }

  /**
   * Set connected peers
   */
  public setConnectedPeers(network: string, count: number): void {
    if (!this.initialized) return
    this.connectedPeers.set({ network }, count)
  }

  /**
   * Record network error
   */
  public recordNetworkError(errorType: string, target: string): void {
    if (!this.initialized) return
    this.networkErrors.inc({ error_type: errorType, target })
  }

  /**
   * Create custom counter
   */
  public createCounter(name: string, help: string, labelNames: string[] = []): Counter<string> {
    return new Counter({
      name: `${this.prefix}${name}`,
      help,
      labelNames
    })
  }

  /**
   * Create custom histogram
   */
  public createHistogram(name: string, help: string, labelNames: string[] = [], buckets?: number[]): Histogram<string> {
    return new Histogram({
      name: `${this.prefix}${name}`,
      help,
      labelNames,
      buckets
    })
  }

  /**
   * Create custom gauge
   */
  public createGauge(name: string, help: string, labelNames: string[] = []): Gauge<string> {
    return new Gauge({
      name: `${this.prefix}${name}`,
      help,
      labelNames
    })
  }

  /**
   * Get metrics in Prometheus format
   */
  public async getMetrics(): Promise<string> {
    if (!this.initialized) return ''

    try {
      return await register.metrics()
    } catch (error) {
      loggingService.error('Failed to get metrics', error)
      return ''
    }
  }

  /**
   * Get metrics as JSON
   */
  public async getMetricsAsJson(): Promise<any> {
    if (!this.initialized) return {}

    try {
      const metrics = await register.getMetricsAsJSON()
      return metrics
    } catch (error) {
      loggingService.error('Failed to get metrics as JSON', error)
      return {}
    }
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    if (!this.initialized) return
    register.clear()
  }

  /**
   * Get registry for advanced usage
   */
  public getRegistry() {
    return register
  }
}

// Singleton instance
export const metricsService = MetricsService.getInstance()