// Deployment configuration for public Cosmos networks
// Note: PrivaChain connects to existing Cosmos testnet/mainnet - we do NOT operate validators
// Removed unused imports: CosmWasmClient, SigningCosmWasmClient, DirectSecp256k1HdWallet, GasPrice

export interface DeploymentConfig {
  rpcEndpoint: string
  chainId: string
  mnemonic: string
  gasPrice: string
  codeUploadFee: string
  deployerAddress: string
}

export const testnetConfig: DeploymentConfig = {
  rpcEndpoint: 'https://rpc.theta-testnet.polypore.xyz',  // Public Cosmos Hub testnet
  chainId: 'theta-testnet-001',  // Official Cosmos Hub testnet
  mnemonic: process.env.DEPLOYER_MNEMONIC || 'your mnemonic here',
  gasPrice: '0.025uatom',  // Cosmos Hub testnet gas token
  codeUploadFee: '0.1uatom',
  deployerAddress: 'cosmos1...'
}

export const mainnetConfig: DeploymentConfig = {
  rpcEndpoint: 'https://rpc.cosmos.network',  // Public Cosmos Hub mainnet
  chainId: 'cosmoshub-4',  // Official Cosmos Hub mainnet
  mnemonic: process.env.DEPLOYER_MNEMONIC || '',
  gasPrice: '0.025uatom',  // Cosmos Hub mainnet gas token
  codeUploadFee: '1uatom',
  deployerAddress: 'cosmos1...'
}

export const localConfig: DeploymentConfig = {
  rpcEndpoint: 'http://localhost:26657',
  chainId: 'privachain-local',
  mnemonic: process.env.DEPLOYER_MNEMONIC || process.env.DEVELOPER_MNEMONIC || '',
  gasPrice: '0.025upriv',
  codeUploadFee: '0.01upriv',
  deployerAddress: 'cosmos1njr8d9xrsqz5dr3xavj3mdzd8p8dvsql0q8cyx'
}

export function getConfig(network: 'testnet' | 'mainnet' | 'local' = 'testnet'): DeploymentConfig {
  switch (network) {
    case 'mainnet':
      return mainnetConfig
    case 'local':
      return localConfig
    default:
      return testnetConfig
  }
}

export interface ContractAddress {
  codeId: number
  contractAddress: string
  txHash: string
}

export interface DeploymentState {
  timestamp: number
  network: string
  deployer: string
  contracts: {
    mail: ContractAddress | null
    domain: ContractAddress | null
    videoSignaling: ContractAddress | null
    rewards: ContractAddress | null
    consensus: ContractAddress | null
    zkRollup: ContractAddress | null
    prvToken: ContractAddress | null
    nft: ContractAddress | null
  }
}