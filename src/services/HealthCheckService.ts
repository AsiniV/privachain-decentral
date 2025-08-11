/**
 * Health Check Service
 * Provides system health status based on dependency validation
 * Implements degraded status when dependencies are unavailable
 * NO STUB / NO SIMULATION - Explicit status only
 */

import { dependencyValidator, ValidationResult } from './DependencyValidator'

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: HealthCheck[]
  message: string
  remediation?: string[]
}

export interface HealthCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  remediation?: string
}

export class HealthCheckService {
  private static instance: HealthCheckService
  
  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService()
    }
    return HealthCheckService.instance
  }

  /**
   * Performs comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResponse> {
    const timestamp = new Date().toISOString()
    
    // Get dependency validation results
    const validation = dependencyValidator.getValidationResult()
    
    if (!validation) {
      return {
        status: 'unhealthy',
        timestamp,
        checks: [],
        message: 'Health check failed - dependency validation not performed',
        remediation: ['Run system initialization first']
      }
    }
    
    const checks = this.convertValidationToHealthChecks(validation)
    const overallStatus = this.calculateOverallStatus(checks)
    const message = this.generateStatusMessage(overallStatus, checks)
    const remediation = this.generateRemediation(checks)
    
    return {
      status: overallStatus,
      timestamp,
      checks,
      message,
      remediation: remediation.length > 0 ? remediation : undefined
    }
  }

  /**
   * Gets current health status without full check
   */
  getCurrentStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    return dependencyValidator.getHealthCheckStatus()
  }

  /**
   * Checks if system is operational (healthy or degraded)
   */
  isOperational(): boolean {
    const status = this.getCurrentStatus()
    return status === 'healthy' || status === 'degraded'
  }

  /**
   * Gets privacy degradation banner message if applicable
   */
  getPrivacyDegradationMessage(): string | null {
    const validation = dependencyValidator.getValidationResult()
    
    if (!validation) {
      return 'Privacy status unknown - system not initialized'
    }
    
    const nymStatus = validation.all_statuses.find(s => s.name === 'NYM_MIXNET')
    const privacyConfigStatus = validation.all_statuses.find(s => s.name === 'PRIVACY_CONFIG')
    
    const degradedServices = []
    
    if (!nymStatus?.available) {
      degradedServices.push('anonymity layer')
    }
    
    if (!privacyConfigStatus?.available) {
      degradedServices.push('privacy configuration')
    }
    
    if (degradedServices.length > 0) {
      return `Privacy Degraded: ${degradedServices.join(', ')} unavailable. Some privacy features may not function as expected.`
    }
    
    return null
  }

  private convertValidationToHealthChecks(validation: ValidationResult): HealthCheck[] {
    const checks: HealthCheck[] = []
    
    // Convert dependency statuses to health checks
    for (const dependency of validation.all_statuses) {
      let status: 'pass' | 'warn' | 'fail'
      
      if (dependency.available) {
        status = 'pass'
      } else if (dependency.required) {
        status = 'fail'
      } else {
        status = 'warn'
      }
      
      checks.push({
        name: dependency.name,
        status,
        message: dependency.available 
          ? `${dependency.name} is available`
          : dependency.error || `${dependency.name} is not available`,
        remediation: dependency.remediation
      })
    }
    
    // Add overall system checks
    checks.push({
      name: 'OVERALL_DEPENDENCIES',
      status: validation.success ? 'pass' : 'fail',
      message: validation.success 
        ? 'All critical dependencies satisfied'
        : `${validation.critical_failures.length} critical dependencies missing`
    })
    
    return checks
  }

  private calculateOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
    const hasFailures = checks.some(check => check.status === 'fail')
    const hasWarnings = checks.some(check => check.status === 'warn')
    
    if (hasFailures) {
      return 'unhealthy'
    } else if (hasWarnings) {
      return 'degraded'
    } else {
      return 'healthy'
    }
  }

  private generateStatusMessage(status: 'healthy' | 'degraded' | 'unhealthy', checks: HealthCheck[]): string {
    switch (status) {
      case 'healthy':
        return 'All systems operational'
      case 'degraded':
        const warnings = checks.filter(c => c.status === 'warn')
        return `System operational with ${warnings.length} non-critical issue(s)`
      case 'unhealthy':
        const failures = checks.filter(c => c.status === 'fail')
        return `System unavailable due to ${failures.length} critical failure(s)`
    }
  }

  private generateRemediation(checks: HealthCheck[]): string[] {
    const remediation: string[] = []
    
    const failedChecks = checks.filter(c => c.status === 'fail' && c.remediation)
    const warnChecks = checks.filter(c => c.status === 'warn' && c.remediation)
    
    // Priority: fix failures first
    for (const check of failedChecks) {
      if (check.remediation) {
        remediation.push(`CRITICAL: ${check.remediation}`)
      }
    }
    
    // Then address warnings
    for (const check of warnChecks) {
      if (check.remediation) {
        remediation.push(`OPTIONAL: ${check.remediation}`)
      }
    }
    
    return remediation
  }
}

// Singleton instance
export const healthCheckService = HealthCheckService.getInstance()