/**
 * Privacy Keeper - TypeScript implementation of Cosmos SDK keeper
 * Equivalent to blockchain/x/privachain/keeper/privacy.go from the problem statement
 */

import { sha256 } from '@noble/hashes/sha256'
import { kvStorage } from '../../../../lib/kvStorage'
import {
  PrivacyRecord,
  PrivacyMetadata,
  QueryPrivacyRecordsRequest,
  QueryPrivacyRecordsResponse,
  KeyPrefix,
  PrivacyCommitmentKey,
  VerifyingKey,
  EventTypePrivacyCommitment,
  AttributeKeyCommitment,
  AttributeKeyTimestamp,
  ErrCommitmentExists,
  ErrCommitmentNotFound,
  ErrInvalidProof
} from '../types'

// Mock SDK context interface
interface SdkContext {
  blockTime(): Date
  eventManager(): EventManager
}

interface EventManager {
  emitEvent(event: SdkEvent): void
}

interface SdkEvent {
  type: string
  attributes: Array<{ key: string; value: string }>
}

// Mock codec interface for serialization
interface Codec {
  marshal(obj: any): Uint8Array
  unmarshal(data: Uint8Array, obj: any): any
}

export class PrivacyKeeper {
  private storeKey: string
  private cdc: Codec

  constructor(storeKey = 'privachain', codec?: Codec) {
    this.storeKey = storeKey
    this.cdc = codec || new DefaultCodec()
  }

  /**
   * Store a zero-knowledge commitment
   * Equivalent to StorePrivacyCommitment in Go
   */
  async storePrivacyCommitment(
    ctx: SdkContext,
    commitment: Uint8Array,
    metadata: PrivacyMetadata
  ): Promise<void> {
    const store = new PrefixStore(this.storeKey, KeyPrefix(PrivacyCommitmentKey))
    
    // Check if commitment already exists
    const exists = await store.has(commitment)
    if (exists) {
      throw new ErrCommitmentExists()
    }
    
    // Create privacy record
    const record: PrivacyRecord = {
      commitment,
      metadata,
      timestamp: Math.floor(ctx.blockTime().getTime() / 1000)
    }
    
    // Serialize and store
    const serialized = this.cdc.marshal(record)
    await store.set(commitment, serialized)
    
    // Emit event for indexing
    ctx.eventManager().emitEvent({
      type: EventTypePrivacyCommitment,
      attributes: [
        { key: AttributeKeyCommitment, value: this.bytesToHex(commitment) },
        { key: AttributeKeyTimestamp, value: record.timestamp.toString() }
      ]
    })
  }

  /**
   * Verify a zero-knowledge proof
   * Equivalent to VerifyPrivacyProof in Go
   */
  async verifyPrivacyProof(
    ctx: SdkContext,
    proof: Uint8Array,
    commitment: Uint8Array,
    publicInputs: Uint8Array[]
  ): Promise<boolean> {
    try {
      // Get verifying key from store
      const vk = await this.getVerifyingKey(ctx)
      if (!vk) {
        throw new ErrInvalidProof()
      }
      
      // Verify proof (simplified - in production use bellman or similar)
      const proofHash = sha256(new Uint8Array([...proof, ...commitment]))
      const expectedHash = sha256(new Uint8Array([...vk, ...publicInputs[0]]))
      
      return this.bytesToHex(proofHash) === this.bytesToHex(expectedHash)
    } catch (error) {
      console.error('Privacy proof verification failed:', error)
      return false
    }
  }

  /**
   * Get privacy record by commitment
   * Equivalent to GetPrivacyRecord in Go
   */
  async getPrivacyRecord(ctx: SdkContext, commitment: Uint8Array): Promise<PrivacyRecord> {
    const store = new PrefixStore(this.storeKey, KeyPrefix(PrivacyCommitmentKey))
    
    const data = await store.get(commitment)
    if (!data) {
      throw new ErrCommitmentNotFound()
    }
    
    return this.cdc.unmarshal(data, {} as PrivacyRecord)
  }

  /**
   * Query privacy records with pagination
   * Equivalent to QueryPrivacyRecords in Go
   */
  async queryPrivacyRecords(
    ctx: SdkContext,
    req: QueryPrivacyRecordsRequest
  ): Promise<QueryPrivacyRecordsResponse> {
    const records: PrivacyRecord[] = []
    const store = new PrefixStore(this.storeKey, KeyPrefix(PrivacyCommitmentKey))

    // Get all keys for pagination
    const allKeys = await store.keys()
    const limit = req.pagination?.limit || 50
    const offset = req.pagination?.offset || 0
    
    let count = 0
    let added = 0
    
    for (const key of allKeys) {
      if (count < offset) {
        count++
        continue
      }
      
      if (added >= limit) {
        break
      }
      
      try {
        const data = await store.get(key)
        if (!data) continue
        
        const record = this.cdc.unmarshal(data, {} as PrivacyRecord)
        
        // Apply filters
        if (req.timestampFrom && record.timestamp < req.timestampFrom) {
          continue
        }
        if (req.timestampTo && record.timestamp > req.timestampTo) {
          continue
        }
        
        records.push(record)
        added++
      } catch (error) {
        console.error('Error unmarshaling record:', error)
        continue
      }
      
      count++
    }

    return {
      records,
      pagination: {
        total: allKeys.length,
        nextKey: added < limit ? undefined : new TextEncoder().encode(`${offset + limit}`)
      }
    }
  }

  /**
   * Get verifying key from store
   */
  private async getVerifyingKey(ctx: SdkContext): Promise<Uint8Array | null> {
    const store = new PrefixStore(this.storeKey, KeyPrefix(VerifyingKey))
    const key = new TextEncoder().encode('default')
    
    const data = await store.get(key)
    return data || null
  }

  /**
   * Set verifying key in store
   */
  async setVerifyingKey(ctx: SdkContext, vk: Uint8Array): Promise<void> {
    const store = new PrefixStore(this.storeKey, KeyPrefix(VerifyingKey))
    const key = new TextEncoder().encode('default')
    
    await store.set(key, vk)
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
}

/**
 * Default codec implementation with proper Uint8Array handling
 */
class DefaultCodec implements Codec {
  marshal(obj: any): Uint8Array {
    // Convert Uint8Arrays to hex strings for JSON serialization
    const serializable = this.convertUint8ArraysToHex(obj)
    return new TextEncoder().encode(JSON.stringify(serializable))
  }

  unmarshal(data: Uint8Array, _obj: any): any {
    const str = new TextDecoder().decode(data)
    const parsed = JSON.parse(str)
    // Convert hex strings back to Uint8Arrays
    return this.convertHexToUint8Arrays(parsed)
  }

  private convertUint8ArraysToHex(obj: any): any {
    if (obj instanceof Uint8Array) {
      return { __type: 'Uint8Array', data: this.bytesToHex(obj) }
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertUint8ArraysToHex(item))
    }
    if (obj && typeof obj === 'object') {
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.convertUint8ArraysToHex(value)
      }
      return result
    }
    return obj
  }

  private convertHexToUint8Arrays(obj: any): any {
    if (obj && typeof obj === 'object' && obj.__type === 'Uint8Array') {
      return this.hexToBytes(obj.data)
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertHexToUint8Arrays(item))
    }
    if (obj && typeof obj === 'object') {
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.convertHexToUint8Arrays(value)
      }
      return result
    }
    return obj
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
    }
    return bytes
  }
}

/**
 * Prefix store implementation using kvStorage
 */
class PrefixStore {
  private storeKey: string
  private prefix: Uint8Array

  constructor(storeKey: string, prefix: Uint8Array) {
    this.storeKey = storeKey
    this.prefix = prefix
  }

  private getFullKey(key: Uint8Array): string {
    const prefixStr = new TextDecoder().decode(this.prefix)
    const keyStr = this.bytesToHex(key)
    return `${this.storeKey}_${prefixStr}_${keyStr}`
  }

  async has(key: Uint8Array): Promise<boolean> {
    const fullKey = this.getFullKey(key)
    const value = await kvStorage.get(fullKey)
    return value !== null
  }

  async get(key: Uint8Array): Promise<Uint8Array | null> {
    const fullKey = this.getFullKey(key)
    const value = await kvStorage.get<string>(fullKey)
    return value ? this.hexToBytes(value) : null
  }

  async set(key: Uint8Array, value: Uint8Array): Promise<void> {
    const fullKey = this.getFullKey(key)
    const hexValue = this.bytesToHex(value)
    await kvStorage.set(fullKey, hexValue)
  }

  async keys(): Promise<Uint8Array[]> {
    const allKeys = await kvStorage.keys()
    const prefixStr = new TextDecoder().decode(this.prefix)
    const storePrefix = `${this.storeKey}_${prefixStr}_`
    
    return allKeys
      .filter(key => key.startsWith(storePrefix))
      .map(key => {
        const hexKey = key.substring(storePrefix.length)
        return this.hexToBytes(hexKey)
      })
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
    }
    return bytes
  }
}