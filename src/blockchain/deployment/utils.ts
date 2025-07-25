import { DeploymentState } from './config'
import { ContractType } from './contracts'

/**
 * Utility functions for PrivaChain contract deployment
 */

// Generate mock contract code for testing
// In production, this would load compiled WASM files
export function generateContractCode(contractType: ContractType): Uint8Array {
  // Mock WASM bytecode - in reality this would be compiled Rust code
  const mockWasm = `
    ;; Mock WASM for ${contractType} contract
    (module
      (func $init (export "init"))
      (func $execute (export "execute"))
      (func $query (export "query"))
      (memory 1)
    )
  `
  
  // Convert to bytes (simplified for demo)
  return new TextEncoder().encode(mockWasm)
}

// Save deployment state to storage
export async function saveDeploymentState(state: DeploymentState, filePath?: string): Promise<void> {
  const fileName = filePath || `deployment-${state.network}-${Date.now()}.json`
  
  try {
    // In a real implementation, this would save to filesystem or database
    // For browser environment, we'll use localStorage
    const stateJson = JSON.stringify(state, null, 2)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(`privachain-deployment-${state.network}`, stateJson)
      console.log(`💾 Deployment state saved to localStorage`)
    } else {
      // Node.js environment
      const fs = await import('fs')
      fs.writeFileSync(fileName, stateJson)
      console.log(`💾 Deployment state saved to ${fileName}`)
    }
    
  } catch (error) {
    console.error('❌ Failed to save deployment state:', error)
    throw error
  }
}

// Load deployment state from storage
export async function loadDeploymentState(filePath?: string): Promise<DeploymentState | null> {
  try {
    let stateJson: string
    
    if (typeof window !== 'undefined') {
      // Browser environment
      const network = filePath || 'testnet'
      stateJson = localStorage.getItem(`privachain-deployment-${network}`) || ''
      
      if (!stateJson) {
        console.log('📂 No existing deployment state found in localStorage')
        return null
      }
      
    } else {
      // Node.js environment
      if (!filePath) {
        console.log('📂 No file path provided for loading state')
        return null
      }
      
      const fs = await import('fs')
      if (!fs.existsSync(filePath)) {
        console.log(`📂 Deployment file not found: ${filePath}`)
        return null
      }
      
      stateJson = fs.readFileSync(filePath, 'utf8')
    }
    
    const state = JSON.parse(stateJson) as DeploymentState
    console.log(`📂 Loaded deployment state from ${filePath || 'localStorage'}`)
    
    return state
    
  } catch (error) {
    console.error('❌ Failed to load deployment state:', error)
    return null
  }
}

// Validate contract addresses
export function validateContractAddress(address: string): boolean {
  // Cosmos contract addresses follow specific patterns
  const cosmosContractRegex = /^cosmos1[a-z0-9]{38,}$/
  return cosmosContractRegex.test(address)
}

// Generate deployment summary
export function generateDeploymentSummary(state: DeploymentState): string {
  const summary = `
# PrivaChain Deployment Summary

**Network:** ${state.network}
**Deployer:** ${state.deployer}
**Timestamp:** ${new Date(state.timestamp).toISOString()}

## Deployed Contracts

${Object.entries(state.contracts)
  .filter(([, contract]) => contract !== null)
  .map(([name, contract]) => `
### ${name.charAt(0).toUpperCase() + name.slice(1)} Contract
- **Address:** \`${contract!.contractAddress}\`
- **Code ID:** ${contract!.codeId}
- **Transaction:** \`${contract!.txHash}\`
`).join('')}

## Verification Commands

To verify these contracts, run:

\`\`\`bash
# Query contract info
cosmovisor query wasm contract [contract-address]

# Query contract state
cosmovisor query wasm contract-state-all [contract-address]
\`\`\`

## Integration

Add these addresses to your frontend configuration:

\`\`\`typescript
export const PRIVACHAIN_CONTRACTS = {
${Object.entries(state.contracts)
  .filter(([, contract]) => contract !== null)
  .map(([name, contract]) => `  ${name}: '${contract!.contractAddress}'`)
  .join(',\n')}
}
\`\`\`
`
  
  return summary.trim()
}

// Estimate deployment costs
export function estimateDeploymentCosts(gasPrice: string): {
  uploadCost: string
  instantiateCost: string
  totalCost: string
} {
  const gasPriceNumber = parseFloat(gasPrice.replace(/[a-z]/g, ''))
  
  // Rough estimates based on typical contract sizes
  const uploadGas = 2000000 // 2M gas per contract upload
  const instantiateGas = 200000 // 200K gas per instantiation
  const contractCount = 8 // Number of contracts to deploy
  
  const totalUploadGas = uploadGas * contractCount
  const totalInstantiateGas = instantiateGas * contractCount
  const totalGas = totalUploadGas + totalInstantiateGas
  
  const uploadCost = (totalUploadGas * gasPriceNumber).toFixed(0)
  const instantiateCost = (totalInstantiateGas * gasPriceNumber).toFixed(0)
  const totalCost = (totalGas * gasPriceNumber).toFixed(0)
  
  return {
    uploadCost: uploadCost + gasPrice.replace(/[0-9.]/g, ''),
    instantiateCost: instantiateCost + gasPrice.replace(/[0-9.]/g, ''),
    totalCost: totalCost + gasPrice.replace(/[0-9.]/g, '')
  }
}

// Contract interaction helpers
export function buildExecuteMsg(contractType: ContractType, action: string, params: any): any {
  const msg: any = {}
  msg[action] = params
  return msg
}

export function buildQueryMsg(contractType: ContractType, query: string, params: any = {}): any {
  const msg: any = {}
  msg[query] = params
  return msg
}

// Network utilities
export function getExplorerUrl(network: string, txHash: string): string {
  const explorers = {
    'privachain-testnet-1': 'https://explorer.testnet.priv',
    'privachain-1': 'https://explorer.priv',
    'privachain-local': 'http://localhost:3000'
  }
  
  const baseUrl = explorers[network as keyof typeof explorers] || explorers['privachain-testnet-1']
  return `${baseUrl}/tx/${txHash}`
}

export function getContractExplorerUrl(network: string, contractAddress: string): string {
  const explorers = {
    'privachain-testnet-1': 'https://explorer.testnet.priv',
    'privachain-1': 'https://explorer.priv',
    'privachain-local': 'http://localhost:3000'
  }
  
  const baseUrl = explorers[network as keyof typeof explorers] || explorers['privachain-testnet-1']
  return `${baseUrl}/contract/${contractAddress}`
}

// Environment validation
export function validateDeploymentEnvironment(): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Check for required environment variables
  if (!process.env.DEPLOYER_MNEMONIC && typeof window === 'undefined') {
    errors.push('DEPLOYER_MNEMONIC environment variable is required for Node.js deployments')
  }
  
  // Validate mnemonic format (basic check)
  const mnemonic = process.env.DEPLOYER_MNEMONIC
  if (mnemonic && mnemonic.split(' ').length !== 12 && mnemonic.split(' ').length !== 24) {
    errors.push('DEPLOYER_MNEMONIC must be a valid 12 or 24 word mnemonic')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Deployment retry logic
export async function retryDeployment<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.warn(`⚠️  Deployment attempt ${attempt}/${maxRetries} failed:`, error)
      
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2 // Exponential backoff
      }
    }
  }
  
  throw new Error(`Deployment failed after ${maxRetries} attempts: ${lastError!.message}`)
}

// Contract upgrade utilities
export interface UpgradeParams {
  contractAddress: string
  newCodeId: number
  migrateMsg: any
}

export function buildMigrateMsg(contractType: ContractType, fromVersion: string, toVersion: string): any {
  // Contract-specific migration logic
  const migrations: Record<ContractType, any> = {
    mail: { upgrade_version: toVersion },
    domain: { upgrade_version: toVersion },
    videoSignaling: { upgrade_version: toVersion },
    rewards: { upgrade_version: toVersion },
    consensus: { upgrade_version: toVersion },
    zkRollup: { upgrade_version: toVersion },
    prvToken: { upgrade_version: toVersion },
    nft: { upgrade_version: toVersion }
  }
  
  return migrations[contractType] || { upgrade_version: toVersion }
}