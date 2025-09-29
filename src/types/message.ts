// message.ts - Message type definitions for messenger functionality
//
// Defines the Message interface and related types

export interface Message {
  id: string
  sender: string
  content: string
  timestamp: number
  encrypted: boolean
  sessionSecure: boolean
  type: 'text' | 'system' | 'file'
  cid?: string  // IPFS CID for on-chain storage
  txHash?: string  // Blockchain transaction hash
  isSent?: boolean  // Distinguish between sent and received messages
}

export interface Contact {
  id: string
  name: string
  address: string
  avatar?: string
  lastSeen: number
  online: boolean
}

export interface MessageSession {
  sessionId: string
  contactAddress: string
  isActive: boolean
  createdAt: number
}