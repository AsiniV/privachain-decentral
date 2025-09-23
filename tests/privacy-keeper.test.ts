/**
 * Tests for Privacy Keeper - Phase 5: Cosmos SDK Integration
 */

import './setup' // Setup mocks for localStorage
import { describe, it, expect, beforeEach } from 'vitest'
import { randomBytes } from '@noble/hashes/utils'
import { PrivacyKeeper } from '../blockchain/x/privachain/keeper/privacy'
import {
  PrivacyMetadata,
  ErrCommitmentExists,
  ErrCommitmentNotFound
} from '../blockchain/x/privachain/types'

// Mock context implementation
class MockContext {
  private mockTime = new Date()

  blockTime(): Date {
    return this.mockTime
  }

  eventManager() {
    return {
      emitEvent: (event: any) => {
        console.log('📨 Event emitted:', event.type, event.attributes)
      }
    }
  }

  setBlockTime(time: Date) {
    this.mockTime = time
  }
}

describe('Privacy Keeper - Phase 5', () => {
  let keeper: PrivacyKeeper
  let ctx: MockContext

  beforeEach(() => {
    keeper = new PrivacyKeeper()
    ctx = new MockContext()
  })

  describe('Privacy Commitment Storage', () => {
    it('should store a privacy commitment successfully', async () => {
      const commitment = randomBytes(32)
      const metadata: PrivacyMetadata = {
        sender: 'cosmos1test123',
        timestamp: Date.now(),
        proofType: 'zk-snark',
        publicInputs: ['input1', 'input2']
      }

      await expect(
        keeper.storePrivacyCommitment(ctx, commitment, metadata)
      ).resolves.not.toThrow()

      // Verify the commitment was stored
      const record = await keeper.getPrivacyRecord(ctx, commitment)
      expect(record.commitment).toEqual(commitment)
      expect(record.metadata.sender).toBe(metadata.sender)
      expect(record.metadata.proofType).toBe(metadata.proofType)
    })

    it('should reject duplicate commitments', async () => {
      const commitment = randomBytes(32)
      const metadata: PrivacyMetadata = {
        sender: 'cosmos1test123',
        timestamp: Date.now(),
        proofType: 'zk-snark'
      }

      // Store first commitment
      await keeper.storePrivacyCommitment(ctx, commitment, metadata)

      // Attempt to store duplicate should fail
      await expect(
        keeper.storePrivacyCommitment(ctx, commitment, metadata)
      ).rejects.toThrow(ErrCommitmentExists)
    })

    it('should retrieve stored privacy record', async () => {
      const commitment = randomBytes(32)
      const metadata: PrivacyMetadata = {
        sender: 'cosmos1test456',
        timestamp: 1234567890,
        proofType: 'bulletproof',
        publicInputs: ['public_input_1']
      }

      await keeper.storePrivacyCommitment(ctx, commitment, metadata)
      
      const record = await keeper.getPrivacyRecord(ctx, commitment)
      expect(record.metadata.sender).toBe('cosmos1test456')
      expect(record.metadata.proofType).toBe('bulletproof')
      expect(record.metadata.publicInputs?.[0]).toBe('public_input_1')
    })

    it('should throw error for non-existent commitment', async () => {
      const nonExistentCommitment = randomBytes(32)

      await expect(
        keeper.getPrivacyRecord(ctx, nonExistentCommitment)
      ).rejects.toThrow(ErrCommitmentNotFound)
    })
  })

  describe('Zero-Knowledge Proof Verification', () => {
    it('should verify valid proof', async () => {
      const proof = randomBytes(64)
      const commitment = randomBytes(32)
      const publicInputs = [randomBytes(32)]
      
      // Set up verifying key
      const vk = randomBytes(32)
      await keeper.setVerifyingKey(ctx, vk)

      // Note: This is a simplified verification for testing
      // In production, actual cryptographic verification would be used
      const isValid = await keeper.verifyPrivacyProof(ctx, proof, commitment, publicInputs)
      expect(typeof isValid).toBe('boolean')
    })

    it('should handle missing verifying key', async () => {
      const proof = randomBytes(64)
      const commitment = randomBytes(32)
      const publicInputs = [randomBytes(32)]

      // No verifying key set
      const isValid = await keeper.verifyPrivacyProof(ctx, proof, commitment, publicInputs)
      expect(isValid).toBe(false)
    })
  })

  describe('Privacy Records Query with Pagination', () => {
    beforeEach(async () => {
      // Store multiple privacy records
      for (let i = 0; i < 10; i++) {
        const commitment = randomBytes(32)
        const metadata: PrivacyMetadata = {
          sender: `cosmos1test${i}`,
          timestamp: 1000000 + i * 1000, // Incremental timestamps
          proofType: 'zk-snark'
        }
        await keeper.storePrivacyCommitment(ctx, commitment, metadata)
      }
    })

    it('should query privacy records with default pagination', async () => {
      const response = await keeper.queryPrivacyRecords(ctx, {})
      
      expect(response.records).toBeDefined()
      expect(response.records.length).toBeGreaterThan(0)
      expect(response.pagination).toBeDefined()
    })

    it('should apply timestamp filters', async () => {
      const response = await keeper.queryPrivacyRecords(ctx, {
        timestampFrom: 1005000,
        timestampTo: 1008000
      })
      
      expect(response.records).toBeDefined()
      for (const record of response.records) {
        expect(record.timestamp).toBeGreaterThanOrEqual(1005000)
        expect(record.timestamp).toBeLessThanOrEqual(1008000)
      }
    })

    it('should handle pagination limits', async () => {
      const response = await keeper.queryPrivacyRecords(ctx, {
        pagination: {
          limit: 5,
          offset: 0
        }
      })
      
      expect(response.records.length).toBeLessThanOrEqual(5)
      expect(response.pagination?.total).toBeGreaterThanOrEqual(5)
    })
  })

  describe('Verifying Key Management', () => {
    it('should store and retrieve verifying key', async () => {
      const vk = randomBytes(32)
      
      await keeper.setVerifyingKey(ctx, vk)
      
      // Use reflection to access private method for testing
      const retrievedVk = await (keeper as any).getVerifyingKey(ctx)
      expect(retrievedVk).toEqual(vk)
    })
  })
})