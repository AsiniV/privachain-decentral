#!/usr/bin/env node

/**
 * PrivaChain Smart Contract Deployment CLI
 * 
 * Usage:
 *   npm run deploy:testnet    - Deploy to testnet
 *   npm run deploy:mainnet    - Deploy to mainnet  
 *   npm run deploy:local      - Deploy to local chain
 *   npm run deploy:verify     - Verify existing deployment
 */

import { PrivaChainDeployer, quickDeploy } from '../deployment/deployer'
import { validateDeploymentEnvironment, generateDeploymentSummary } from '../deployment/utils'

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'help'
  const network = (args[1] as 'testnet' | 'mainnet' | 'local') || 'testnet'

  console.log('🔗 PrivaChain Smart Contract Deployment CLI')
  console.log('============================================')

  try {
    switch (command) {
      case 'deploy':
        await deployCommand(network)
        break
        
      case 'verify':
        await verifyCommand(network)
        break
        
      case 'status':
        await statusCommand(network)
        break
        
      case 'estimate':
        await estimateCommand(network)
        break
        
      case 'quick':
        await quickDeployCommand(network)
        break
        
      default:
        showHelp()
    }
  } catch (error) {
    console.error('❌ Command failed:', error)
    process.exit(1)
  }
}

async function deployCommand(network: 'testnet' | 'mainnet' | 'local') {
  console.log(`🚀 Starting deployment to ${network}...`)
  
  // Validate environment
  const validation = validateDeploymentEnvironment()
  if (!validation.valid) {
    console.error('❌ Environment validation failed:')
    validation.errors.forEach(error => console.error(`  - ${error}`))
    process.exit(1)
  }

  const deployer = new PrivaChainDeployer(network)
  await deployer.initialize()
  
  console.log('📦 Deploying all contracts...')
  const state = await deployer.deployAllContracts()
  
  console.log('🔍 Verifying deployment...')
  const verified = await deployer.verifyDeployment()
  
  if (verified) {
    console.log('✅ Deployment completed successfully!')
    console.log('\n📋 Deployment Summary:')
    console.log(generateDeploymentSummary(state))
  } else {
    throw new Error('Deployment verification failed')
  }
}

async function verifyCommand(network: 'testnet' | 'mainnet' | 'local') {
  console.log(`🔍 Verifying deployment on ${network}...`)
  
  const deployer = new PrivaChainDeployer(network)
  await deployer.initialize()
  await deployer.loadExistingDeployment()
  
  const verified = await deployer.verifyDeployment()
  
  if (verified) {
    console.log('✅ All contracts verified successfully!')
  } else {
    console.error('❌ Verification failed')
    process.exit(1)
  }
}

async function statusCommand(network: 'testnet' | 'mainnet' | 'local') {
  console.log(`📊 Checking deployment status on ${network}...`)
  
  const deployer = new PrivaChainDeployer(network)
  await deployer.loadExistingDeployment()
  
  const state = deployer.getDeploymentState()
  console.log(generateDeploymentSummary(state))
}

async function estimateCommand(network: 'testnet' | 'mainnet' | 'local') {
  console.log(`💰 Estimating deployment costs for ${network}...`)
  
  const { estimateDeploymentCosts, getConfig } = await import('../deployment/utils')
  const config = getConfig(network)
  const costs = estimateDeploymentCosts(config.gasPrice)
  
  console.log('📊 Cost Estimation:')
  console.log(`  Upload costs: ${costs.uploadCost}`)
  console.log(`  Instantiate costs: ${costs.instantiateCost}`)
  console.log(`  Total costs: ${costs.totalCost}`)
  console.log(`\n💡 Note: These are rough estimates. Actual costs may vary.`)
}

async function quickDeployCommand(network: 'testnet' | 'mainnet' | 'local') {
  console.log(`⚡ Quick deploying to ${network}...`)
  await quickDeploy(network)
}

function showHelp() {
  console.log(`
📖 PrivaChain Deployment CLI Help

COMMANDS:
  deploy [network]    Deploy all contracts to specified network
  verify [network]    Verify existing deployment
  status [network]    Show deployment status
  estimate [network]  Estimate deployment costs
  quick [network]     Quick deployment (all-in-one)
  help               Show this help message

NETWORKS:
  testnet (default)   PrivaChain testnet
  mainnet            PrivaChain mainnet
  local              Local development chain

EXAMPLES:
  npm run deploy:script deploy testnet
  npm run deploy:script verify mainnet
  npm run deploy:script status local
  npm run deploy:script quick testnet

ENVIRONMENT VARIABLES:
  DEPLOYER_MNEMONIC   Mnemonic phrase for deployment wallet (required)

For more information, visit: https://docs.privachain.com/deployment
`)
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { main as deploymentCLI }