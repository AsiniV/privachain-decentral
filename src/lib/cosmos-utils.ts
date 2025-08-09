// Cosmos SDK integration utilities
export interface CosmosConfig {
  chainId: string
  rpc: string
  rest: string
  gasPrice: string
  addressPrefix: string
}

export interface TurnServer {
  url: string
  username?: string
  credential?: string
  credentialType?: 'password' | 'oauth'
}

export interface VideoQualitySettings {
  minBitrate: number
  maxBitrate: number
  width: number
  height: number
  frameRate: number
}

export const VIDEO_QUALITY_PRESETS: Record<string, VideoQualitySettings> = {
  '144p': { minBitrate: 80, maxBitrate: 120, width: 256, height: 144, frameRate: 15 },
  '240p': { minBitrate: 120, maxBitrate: 200, width: 426, height: 240, frameRate: 20 },
  '360p': { minBitrate: 200, maxBitrate: 400, width: 640, height: 360, frameRate: 25 },
  '480p': { minBitrate: 400, maxBitrate: 800, width: 854, height: 480, frameRate: 30 },
  '720p': { minBitrate: 800, maxBitrate: 1500, width: 1280, height: 720, frameRate: 30 },
  '1080p': { minBitrate: 1500, maxBitrate: 3000, width: 1920, height: 1080, frameRate: 30 }
}

export const COSMOS_TESTNET_CONFIGS: Record<string, CosmosConfig> = {
  'privachain-testnet': {
    chainId: 'privachain-testnet-1',
    rpc: 'https://rpc-testnet.privachain.network',
    rest: 'https://api-testnet.privachain.network',
    gasPrice: '0.025uatom',
    addressPrefix: 'cosmos'
  },
  'cosmos-testnet': {
    chainId: 'theta-testnet-001',
    rpc: 'https://rpc.theta-testnet.polypore.xyz',
    rest: 'https://rest.theta-testnet.polypore.xyz:1317',
    gasPrice: '0.025uatom',
    addressPrefix: 'cosmos'
  }
}

export const DEFAULT_TURN_SERVERS: TurnServer[] = [
  {
    url: 'stun:stun.relay.metered.ca:80'
  },
  {
    url: 'turn:global.relay.metered.ca:80',
    username: 'cb4e537c8daa78b39585ef06',
    credential: 'OTzH3vBKW7iEnYxb'
  },
  {
    url: 'turn:global.relay.metered.ca:80?transport=tcp',
    username: 'cb4e537c8daa78b39585ef06',
    credential: 'OTzH3vBKW7iEnYxb'
  },
  {
    url: 'turn:global.relay.metered.ca:443',
    username: 'cb4e537c8daa78b39585ef06',
    credential: 'OTzH3vBKW7iEnYxb'
  },
  {
    url: 'turns:global.relay.metered.ca:443?transport=tcp',
    username: 'cb4e537c8daa78b39585ef06',
    credential: 'OTzH3vBKW7iEnYxb'
  }
]

// Gas fee calculations for different transaction types
export function calculateGasForTransaction(txType: string): number {
  const gasMap: Record<string, number> = {
    'send': 21000,
    'delegate': 50000,
    'undelegate': 50000,
    'vote': 30000,
    'mail_send': 75000,
    'domain_register': 100000,
    'video_signal': 60000,
    'turn_payment': 25000
  }
  
  return gasMap[txType] || 21000
}

// Convert between different token denominations
export function convertTokenDenom(amount: string, fromDenom: string, toDenom: string): string {
  const denomMap: Record<string, number> = {
    'atom': 1e6,    // 1 ATOM = 1,000,000 uatom
    'uatom': 1      // Base denomination
  }
  
  const fromMultiplier = denomMap[fromDenom] || 1
  const toMultiplier = denomMap[toDenom] || 1
  
  const baseAmount = parseFloat(amount) * fromMultiplier
  const convertedAmount = baseAmount / toMultiplier
  
  return convertedAmount.toString()
}

// Validate Cosmos addresses
export function isValidCosmosAddress(address: string, prefix: string = 'cosmos'): boolean {
  const regex = new RegExp(`^${prefix}1[a-z0-9]{38}$`)
  return regex.test(address)
}

// Generate mock Cosmos transaction hash
export function generateCosmosTransactionHash(): string {
  const chars = '0123456789ABCDEF'
  let result = ''
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Format large numbers for display
export function formatTokenAmount(amount: string | number, decimals: number = 6): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B'
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M'
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K'
  }
  
  return num.toFixed(decimals)
}

// WebRTC utilities for video calling
export function createPeerConnection(turnServers: TurnServer[]): RTCPeerConnection {
  const configuration: RTCConfiguration = {
    iceServers: turnServers.map(server => ({
      urls: server.url,
      username: server.username,
      credential: server.credential,
      credentialType: server.credentialType
    }))
  }
  
  return new RTCPeerConnection(configuration)
}

// Fetch dynamic TURN credentials from metered.ca API
export async function fetchMeteredTurnServers(): Promise<TurnServer[]> {
  try {
    const apiKey = process.env.METERED_API_KEY || process.env.VITE_METERED_API_KEY || 'b15ef1e4a92aa5421bffbd4d41822942362d'
    const domain = process.env.METERED_DOMAIN || process.env.VITE_METERED_DOMAIN || 'privachain.metered.live'
    
    const response = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch TURN credentials: ${response.status}`)
    }
    
    const iceServers = await response.json()
    
    // Convert the response to our TurnServer format
    return iceServers.map((server: any) => ({
      url: server.urls || server.url,
      username: server.username,
      credential: server.credential,
      credentialType: server.credentialType || 'password'
    }))
  } catch (error) {
    console.warn('Failed to fetch dynamic TURN credentials, falling back to static servers:', error)
    // Return default static servers as fallback
    return DEFAULT_TURN_SERVERS
  }
}

// Adaptive bitrate calculation based on network conditions
export function calculateOptimalBitrate(rtt: number, packetLoss: number): number {
  const baseRtt = 100 // baseline RTT in ms
  const baseLoss = 0.01 // baseline packet loss (1%)
  
  let multiplier = 1.0
  
  // Adjust for RTT
  if (rtt > baseRtt) {
    multiplier *= Math.max(0.3, 1 - (rtt - baseRtt) / 1000)
  }
  
  // Adjust for packet loss
  if (packetLoss > baseLoss) {
    multiplier *= Math.max(0.2, 1 - (packetLoss - baseLoss) * 10)
  }
  
  // Base bitrate for good conditions (1.5 Mbps)
  const baseBitrate = 1500000
  
  return Math.floor(baseBitrate * multiplier)
}

// Network quality assessment
export interface NetworkQuality {
  score: number // 0-100
  quality: 'poor' | 'fair' | 'good' | 'excellent'
  recommendedQuality: string
}

export function assessNetworkQuality(rtt: number, packetLoss: number, bandwidth: number): NetworkQuality {
  let score = 100
  
  // RTT penalty
  if (rtt > 300) score -= 40
  else if (rtt > 200) score -= 25
  else if (rtt > 100) score -= 10
  
  // Packet loss penalty
  if (packetLoss > 0.05) score -= 30
  else if (packetLoss > 0.02) score -= 15
  else if (packetLoss > 0.01) score -= 5
  
  // Bandwidth assessment
  if (bandwidth < 500000) score -= 25 // < 500 kbps
  else if (bandwidth < 1000000) score -= 10 // < 1 Mbps
  
  let quality: NetworkQuality['quality']
  let recommendedQuality: string
  
  if (score >= 80) {
    quality = 'excellent'
    recommendedQuality = '1080p'
  } else if (score >= 60) {
    quality = 'good'
    recommendedQuality = '720p'
  } else if (score >= 40) {
    quality = 'fair'
    recommendedQuality = '480p'
  } else {
    quality = 'poor'
    recommendedQuality = '240p'
  }
  
  return { score, quality, recommendedQuality }
}