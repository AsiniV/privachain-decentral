/**
 * Types for PrivaChain Cosmos SDK module
 * Equivalent to Go types from the problem statement
 */

export interface PrivacyMetadata {
  sender: string
  timestamp: number
  proofType: string
  publicInputs?: string[]
}

export interface PrivacyRecord {
  commitment: Uint8Array
  metadata: PrivacyMetadata
  timestamp: number
}

export interface StealthMetadata {
  ephemeralPub: Uint8Array
  spender: string
  stealthAddr: string
  timestamp?: number
}

export interface AnonymousTransfer {
  commitment: Uint8Array
  nullifier: Uint8Array
  amount: string
  denom: string
  timestamp: number
  ringSignature: Uint8Array
}

export interface MsgAnonymousTransfer {
  commitment: Uint8Array
  nullifier: Uint8Array
  amount: string
  denom: string
  ringMembers: string[]
  ringSignature: Uint8Array
}

export interface QueryPrivacyRecordsRequest {
  pagination?: {
    key?: Uint8Array
    offset?: number
    limit?: number
    countTotal?: boolean
    reverse?: boolean
  }
  timestampFrom?: number
  timestampTo?: number
}

export interface QueryPrivacyRecordsResponse {
  records: PrivacyRecord[]
  pagination?: {
    nextKey?: Uint8Array
    total?: number
  }
}

// Key prefixes for storage
export const KeyPrefix = (prefix: string): Uint8Array => {
  return new TextEncoder().encode(prefix)
}

export const PrivacyCommitmentKey = "privacy_commitment"
export const AnonymousTransferKey = "anonymous_transfer"
export const StealthMetadataKey = "stealth_metadata"
export const AnonymitySetKey = "anonymity_set"
export const VerifyingKey = "verifying_key"

// Event types
export const EventTypePrivacyCommitment = "privacy_commitment"
export const EventTypeAnonymousTransfer = "anonymous_transfer"

// Attribute keys
export const AttributeKeyCommitment = "commitment"
export const AttributeKeyTimestamp = "timestamp"
export const AttributeKeyNullifier = "nullifier"
export const AttributeKeyAmount = "amount"
export const AttributeKeyDenom = "denom"

// Error types
export class ErrCommitmentExists extends Error {
  constructor() {
    super("Commitment already exists")
    this.name = "ErrCommitmentExists"
  }
}

export class ErrCommitmentNotFound extends Error {
  constructor() {
    super("Commitment not found")
    this.name = "ErrCommitmentNotFound"
  }
}

export class ErrInvalidRingMember extends Error {
  constructor() {
    super("Invalid ring member")
    this.name = "ErrInvalidRingMember"
  }
}

export class ErrInvalidRingSignature extends Error {
  constructor() {
    super("Invalid ring signature")
    this.name = "ErrInvalidRingSignature"
  }
}

export class ErrInvalidProof extends Error {
  constructor() {
    super("Invalid zero-knowledge proof")
    this.name = "ErrInvalidProof"
  }
}