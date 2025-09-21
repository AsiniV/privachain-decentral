/**
 * Anonymous Network Layer Module
 * Exports onion routing and anonymous messaging functionality
 */

export { OnionRouter, type OnionNode, type OnionCircuit } from './onion_router'
export { 
  AnonymousMessageRouter, 
  type AnonymousMessage, 
  type MessageCacheEntry,
  type PeerInfo,
  type AnonymousBehaviour
} from './message_router'

// Re-export types for compatibility
export interface AnonymousNetworkConfig {
  onionRouting: {
    minHops: number
    maxHops: number
    circuitTimeout: number
    rebuildAfterMessages: number
  }
  messageRouting: {
    ttlDefault: number
    maxHops: number
    cacheSize: number
    gossipInterval: number
  }
}

export const DEFAULT_ANONYMOUS_CONFIG: AnonymousNetworkConfig = {
  onionRouting: {
    minHops: 3,
    maxHops: 5,
    circuitTimeout: 300000, // 5 minutes
    rebuildAfterMessages: 50
  },
  messageRouting: {
    ttlDefault: 3600, // 1 hour
    maxHops: 8,
    cacheSize: 1000,
    gossipInterval: 5000 // 5 seconds
  }
}