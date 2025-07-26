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
  rpcEndpoint: 'https://rpc.cosmos-testnet.priv',
  chainId: 'privachain-testnet-1',
  mnemonic: process.env.DEPLOYER_MNEMONIC || 'your mnemonic here',
  gasPrice: '0.025upriv',
  codeUploadFee: '0.1upriv',
  deployerAddress: 'cosmos1...'
}

export const mainnetConfig: DeploymentConfig = {
  rpcEndpoint: 'https://rpc.cosmos.priv',
  chainId: 'privachain-1',
  mnemonic: process.env.DEPLOYER_MNEMONIC || '',
  gasPrice: '0.001upriv',
  codeUploadFee: '1upriv',
  deployerAddress: 'cosmos1...'
}

export const localConfig: DeploymentConfig = {
  rpcEndpoint: 'http://localhost:26657',
  chainId: 'privachain-local',
  mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
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