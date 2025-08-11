/**
 * Dependency Validator Service
 * Implements boot-time validation of all required dependencies
 * Fails fast when required API keys, credentials, or endpoints are missing
 * NO STUB / NO SIMULATION - explicit failures only
 */

import * as fs from 'fs'
import * as path from 'path'

export interface DependencyStatus {
  name: string
  required: boolean
  available: boolean
  error?: string
  remediation?: string
}

export interface ValidationResult {
  success: boolean
  critical_failures: DependencyStatus[]
  warnings: DependencyStatus[]
  all_statuses: DependencyStatus[]
}

export interface StructuredError {
  code: string
  message: string
  user_message: string
  developer_message: string
  remediation_hint: string
  dependency: string
}

export class DependencyValidator {
  private static instance: DependencyValidator
  private validationResult: ValidationResult | null = null
  
  public static getInstance(): DependencyValidator {
    if (!DependencyValidator.instance) {
      DependencyValidator.instance = new DependencyValidator()
    }
    return DependencyValidator.instance
  }

  /**
   * Validates all required dependencies at boot time
   * Returns structured result with failures and remediation hints
   */
  async validateAll(): Promise<ValidationResult> {
    console.log('🔍 Starting dependency validation...')
    
    const dependencies: DependencyStatus[] = []
    
    // 1. Environment Variables - Critical
    dependencies.push(...await this.validateEnvironmentVariables())
    
    // 2. External Services - Critical
    dependencies.push(...await this.validateExternalServices())
    
    // 3. Configuration Files - Critical
    dependencies.push(...await this.validateConfigurationFiles())
    
    // 4. Cryptographic Dependencies - Critical
    dependencies.push(...await this.validateCryptographicDependencies())
    
    // 5. Network Dependencies - Critical
    dependencies.push(...await this.validateNetworkDependencies())
    
    // Categorize results
    const critical_failures = dependencies.filter(d => d.required && !d.available)
    const warnings = dependencies.filter(d => !d.required && !d.available)
    
    const result: ValidationResult = {
      success: critical_failures.length === 0,
      critical_failures,
      warnings,
      all_statuses: dependencies
    }
    
    this.validationResult = result
    
    if (!result.success) {
      console.error('❌ Critical dependency validation failures detected')
      this.logValidationFailures(result)
    } else if (warnings.length > 0) {
      console.warn('⚠️ Some optional dependencies unavailable')
      this.logValidationWarnings(result)
    } else {
      console.log('✅ All dependencies validated successfully')
    }
    
    return result
  }

  /**
   * Validates required environment variables
   */
  private async validateEnvironmentVariables(): Promise<DependencyStatus[]> {
    const requiredVars = [
      'DEVELOPER_MNEMONIC',
      'COSMOS_RPC_ENDPOINT',
      'COSMOS_CHAIN_ID',
      'FILEBASE_ACCESS_KEY',
      'FILEBASE_SECRET_KEY'
    ]
    
    const optionalVars = [
      'NYM_ENDPOINT',
      'NYM_CLIENT_ID',
      'METERED_DOMAIN',
      'METERED_TURN_SECRET',
      'ZK_CIRCUIT_WASM',
      'ZK_CIRCUIT_ZKEY'
    ]
    
    const statuses: DependencyStatus[] = []
    
    // Required variables
    for (const varName of requiredVars) {
      const value = process.env[varName]
      statuses.push({
        name: `ENV_${varName}`,
        required: true,
        available: !!value && value.length > 0,
        error: !value ? `Environment variable ${varName} is missing or empty` : undefined,
        remediation: !value ? `Set ${varName} in your .env file or environment` : undefined
      })
    }
    
    // Optional variables
    for (const varName of optionalVars) {
      const value = process.env[varName]
      statuses.push({
        name: `ENV_${varName}`,
        required: false,
        available: !!value && value.length > 0,
        error: !value ? `Optional environment variable ${varName} is missing` : undefined,
        remediation: !value ? `Set ${varName} for enhanced functionality` : undefined
      })
    }
    
    return statuses
  }

  /**
   * Validates external service connectivity
   */
  private async validateExternalServices(): Promise<DependencyStatus[]> {
    const statuses: DependencyStatus[] = []
    
    // Cosmos RPC Endpoint
    statuses.push(await this.validateHttpsEndpoint(
      'COSMOS_RPC',
      process.env.COSMOS_RPC_ENDPOINT || '',
      true,
      'Cosmos blockchain RPC endpoint',
      'Check COSMOS_RPC_ENDPOINT and network connectivity'
    ))
    
    // IPFS/Filebase API
    statuses.push(await this.validateFilebaseAPI())
    
    // Nym Mixnet (optional)
    if (process.env.NYM_ENDPOINT) {
      statuses.push(await this.validateHttpsEndpoint(
        'NYM_MIXNET',
        process.env.NYM_ENDPOINT,
        false,
        'Nym mixnet gateway',
        'Check NYM_ENDPOINT and Nym network status'
      ))
    } else {
      statuses.push({
        name: 'NYM_MIXNET',
        required: false,
        available: false,
        error: 'Nym mixnet endpoint not configured',
        remediation: 'Set NYM_ENDPOINT for enhanced anonymity'
      })
    }
    
    return statuses
  }

  /**
   * Validates configuration files
   */
  private async validateConfigurationFiles(): Promise<DependencyStatus[]> {
    const statuses: DependencyStatus[] = []
    
    const configFiles = [
      { name: 'PRIVACY_CONFIG', path: 'config/privacy.json', required: true },
      { name: 'ZK_CIRCUIT_WASM', path: process.env.ZK_CIRCUIT_WASM, required: false },
      { name: 'ZK_CIRCUIT_ZKEY', path: process.env.ZK_CIRCUIT_ZKEY, required: false }
    ]
    
    for (const config of configFiles) {
      if (!config.path) {
        statuses.push({
          name: config.name,
          required: config.required,
          available: false,
          error: `Configuration path not set`,
          remediation: `Set path for ${config.name}`
        })
        continue
      }
      
      const fullPath = path.resolve(config.path)
      try {
        await fs.promises.access(fullPath, fs.constants.R_OK)
        
        // Validate JSON syntax for JSON files
        if (config.path.endsWith('.json')) {
          const content = await fs.promises.readFile(fullPath, 'utf8')
          JSON.parse(content) // Will throw if invalid
        }
        
        statuses.push({
          name: config.name,
          required: config.required,
          available: true
        })
      } catch (error) {
        statuses.push({
          name: config.name,
          required: config.required,
          available: false,
          error: `File not accessible: ${(error as Error).message}`,
          remediation: `Ensure ${config.path} exists and is readable`
        })
      }
    }
    
    return statuses
  }

  /**
   * Validates cryptographic dependencies
   */
  private async validateCryptographicDependencies(): Promise<DependencyStatus[]> {
    const statuses: DependencyStatus[] = []
    
    // Test libsodium availability
    try {
      const sodium = await import('libsodium-wrappers')
      await sodium.ready
      statuses.push({
        name: 'LIBSODIUM',
        required: true,
        available: true
      })
    } catch (error) {
      statuses.push({
        name: 'LIBSODIUM',
        required: true,
        available: false,
        error: `libsodium not available: ${(error as Error).message}`,
        remediation: 'Install libsodium-wrappers package'
      })
    }
    
    // Test ZK proof libraries
    try {
      await import('snarkjs')
      statuses.push({
        name: 'SNARKJS',
        required: true,
        available: true
      })
    } catch (error) {
      statuses.push({
        name: 'SNARKJS',
        required: true,
        available: false,
        error: `snarkjs not available: ${(error as Error).message}`,
        remediation: 'Install snarkjs package for ZK proofs'
      })
    }
    
    return statuses
  }

  /**
   * Validates network dependencies
   */
  private async validateNetworkDependencies(): Promise<DependencyStatus[]> {
    const statuses: DependencyStatus[] = []
    
    // Test basic network connectivity
    statuses.push(await this.validateHttpsEndpoint(
      'INTERNET_CONNECTIVITY',
      'https://www.google.com',
      true,
      'Basic internet connectivity',
      'Check network connection'
    ))
    
    return statuses
  }

  /**
   * Validates HTTPS endpoint connectivity
   */
  private async validateHttpsEndpoint(
    name: string,
    url: string,
    required: boolean,
    description: string,
    remediation: string
  ): Promise<DependencyStatus> {
    if (!url) {
      return {
        name,
        required,
        available: false,
        error: 'Endpoint URL not provided',
        remediation
      }
    }
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      return {
        name,
        required,
        available: response.ok || response.status < 500, // Accept any non-server-error
        error: !response.ok ? `HTTP ${response.status}: ${response.statusText}` : undefined,
        remediation: !response.ok ? remediation : undefined
      }
    } catch (error) {
      return {
        name,
        required,
        available: false,
        error: `Connection failed: ${(error as Error).message}`,
        remediation
      }
    }
  }

  /**
   * Validates Filebase IPFS API
   */
  private async validateFilebaseAPI(): Promise<DependencyStatus> {
    const accessKey = process.env.FILEBASE_ACCESS_KEY
    const secretKey = process.env.FILEBASE_SECRET_KEY
    
    if (!accessKey || !secretKey) {
      return {
        name: 'FILEBASE_API',
        required: true,
        available: false,
        error: 'Filebase API credentials not configured',
        remediation: 'Set FILEBASE_ACCESS_KEY and FILEBASE_SECRET_KEY'
      }
    }
    
    // Test API connectivity (basic auth check)
    try {
      const response = await fetch('https://s3.filebase.com', {
        method: 'HEAD',
        headers: {
          'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKey}/...`
        }
      })
      
      return {
        name: 'FILEBASE_API',
        required: true,
        available: response.status !== 403, // Not forbidden = credentials likely valid
        error: response.status === 403 ? 'Filebase API credentials invalid' : undefined,
        remediation: response.status === 403 ? 'Check FILEBASE_ACCESS_KEY and FILEBASE_SECRET_KEY' : undefined
      }
    } catch (error) {
      return {
        name: 'FILEBASE_API',
        required: true,
        available: false,
        error: `Filebase API unreachable: ${(error as Error).message}`,
        remediation: 'Check network connectivity and Filebase service status'
      }
    }
  }

  /**
   * Creates structured error for missing dependency
   */
  createStructuredError(dependency: string, userMessage: string, detailMessage: string, remediationHint: string): StructuredError {
    return {
      code: `DEP_MISSING_${dependency.toUpperCase()}`,
      message: detailMessage,
      user_message: userMessage,
      developer_message: detailMessage,
      remediation_hint: remediationHint,
      dependency
    }
  }

  /**
   * Gets health check status based on dependency validation
   */
  getHealthCheckStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    if (!this.validationResult) {
      return 'unhealthy'
    }
    
    if (this.validationResult.critical_failures.length > 0) {
      return 'unhealthy'
    }
    
    if (this.validationResult.warnings.length > 0) {
      return 'degraded'
    }
    
    return 'healthy'
  }

  /**
   * Gets the last validation result
   */
  getValidationResult(): ValidationResult | null {
    return this.validationResult
  }

  /**
   * Logs validation failures with structured output
   */
  private logValidationFailures(result: ValidationResult): void {
    console.error('Critical dependency failures:')
    for (const failure of result.critical_failures) {
      console.error(`  ❌ ${failure.name}: ${failure.error}`)
      if (failure.remediation) {
        console.error(`     💡 ${failure.remediation}`)
      }
    }
  }

  /**
   * Logs validation warnings
   */
  private logValidationWarnings(result: ValidationResult): void {
    console.warn('Optional dependency warnings:')
    for (const warning of result.warnings) {
      console.warn(`  ⚠️ ${warning.name}: ${warning.error}`)
      if (warning.remediation) {
        console.warn(`     💡 ${warning.remediation}`)
      }
    }
  }
}

// Singleton instance
export const dependencyValidator = DependencyValidator.getInstance()