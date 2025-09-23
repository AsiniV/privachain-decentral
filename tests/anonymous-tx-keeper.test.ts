/**
 * Tests for Anonymous Transaction Keeper - Phase 5: Cosmos SDK Integration
 */

import './setup' // Setup mocks for localStorage
import { describe, it, expect, beforeEach } from 'vitest'
import { randomBytes } from '@noble/hashes/utils'
import { AnonymousTransactionKeeper } from '../blockchain/x/privachain/keeper/anonymous_tx'
import {
  MsgAnonymousTransfer,
  ErrInvalidRingMember,
  ErrInvalidRingSignature
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

describe('Anonymous Transaction Keeper - Phase 5', () => {
  let keeper: AnonymousTransactionKeeper
  let ctx: MockContext

  beforeEach(() => {
    keeper = new AnonymousTransactionKeeper()
    ctx = new MockContext()
  })

  describe('Stealth Address Generation', () => {
    it('should generate stealth address successfully', async () => {
      const spender = 'cosmos1test123456789'
      
      const stealthAddress = await keeper.generateStealthAddress(ctx, spender)
      
      expect(stealthAddress).toBeDefined()
      expect(typeof stealthAddress).toBe('string')
      expect(stealthAddress).toMatch(/^0x[a-f0-9]{40}$/) // Hex address format
      console.log('🥷 Generated stealth address:', stealthAddress)
    })

    it('should generate unique stealth addresses', async () => {
      const spender = 'cosmos1test123456789'
      
      const address1 = await keeper.generateStealthAddress(ctx, spender)
      const address2 = await keeper.generateStealthAddress(ctx, spender)
      
      expect(address1).not.toBe(address2)
      console.log('🥷 Stealth address 1:', address1)
      console.log('🥷 Stealth address 2:', address2)
    })
  })

  describe('Anonymous Transfer Processing', () => {
    it('should process valid anonymous transfer', async () => {
      const msg: MsgAnonymousTransfer = {
        commitment: randomBytes(32),
        nullifier: randomBytes(32),
        amount: '1000000', // 1 token with 6 decimals
        denom: 'upriv',
        ringMembers: [
          'cosmos1member1',
          'cosmos1member2',
          'cosmos1member3'
        ],
        ringSignature: randomBytes(3 * 64) // 64 bytes per ring member
      }

      await expect(
        keeper.anonymousTransfer(ctx, msg)
      ).resolves.not.toThrow()

      console.log('✅ Anonymous transfer processed successfully')
      console.log('💰 Amount:', msg.amount, msg.denom)
      console.log('🔒 Commitment:', msg.commitment.slice(0, 8), '...')
      console.log('🚫 Nullifier:', msg.nullifier.slice(0, 8), '...')
    })

    it('should reject transfer with invalid ring signature size', async () => {
      const msg: MsgAnonymousTransfer = {
        commitment: randomBytes(32),
        nullifier: randomBytes(32),
        amount: '500000',
        denom: 'upriv',
        ringMembers: [
          'cosmos1member1',
          'cosmos1member2'
        ],
        ringSignature: randomBytes(64) // Wrong size: should be 2 * 64 = 128 bytes
      }

      await expect(
        keeper.anonymousTransfer(ctx, msg)
      ).rejects.toThrow(ErrInvalidRingSignature)
    })

    it('should handle multiple anonymous transfers', async () => {
      const transfers: MsgAnonymousTransfer[] = []
      
      for (let i = 0; i < 5; i++) {
        const msg: MsgAnonymousTransfer = {
          commitment: randomBytes(32),
          nullifier: randomBytes(32),
          amount: `${(i + 1) * 100000}`, // Different amounts
          denom: 'upriv',
          ringMembers: [
            `cosmos1member${i}_1`,
            `cosmos1member${i}_2`,
            `cosmos1member${i}_3`
          ],
          ringSignature: randomBytes(3 * 64)
        }
        transfers.push(msg)
      }

      // Process all transfers
      for (const transfer of transfers) {
        await expect(
          keeper.anonymousTransfer(ctx, transfer)
        ).resolves.not.toThrow()
      }

      console.log('✅ Processed', transfers.length, 'anonymous transfers')
    })
  })

  describe('Anonymity Set Management', () => {
    it('should get anonymity set of specified size', async () => {
      const size = 10
      
      // First, populate with some mock data
      const mockMembers = []
      for (let i = 0; i < size; i++) {
        mockMembers.push(`cosmos1member${i}_test`)
      }
      
      // Update anonymity set with mock data
      await (keeper as any).updateAnonymitySet(ctx, mockMembers)
      
      const anonymitySet = await keeper.getAnonymitySet(ctx, size)
      
      expect(anonymitySet).toBeDefined()
      expect(Array.isArray(anonymitySet)).toBe(true)
      expect(anonymitySet.length).toBe(size)
      
      // Check format of addresses (allow test patterns)
      for (const member of anonymitySet) {
        expect(typeof member).toBe('string')
        expect(member).toMatch(/^cosmos1[a-z0-9_]+$/) // Allow underscores for test data
      }
      
      console.log('👥 Anonymity set size:', anonymitySet.length)
      console.log('👥 Sample members:', anonymitySet.slice(0, 3))
    })

    it('should update anonymity set with new members', async () => {
      // Test the anonymity set functionality directly
      const newMembers = [
        'cosmos1newmember1',
        'cosmos1newmember2',
        'cosmos1newmember3'
      ]

      // Use reflection to call updateAnonymitySet directly for testing
      await (keeper as any).updateAnonymitySet(ctx, newMembers)
      
      // Get updated anonymity set
      const anonymitySet = await keeper.getAnonymitySet(ctx, 20)
      
      // Verify that anonymity set now contains the new members
      expect(anonymitySet.length).toBeGreaterThanOrEqual(newMembers.length)
      
      // Check that all new members are included
      for (const member of newMembers) {
        expect(anonymitySet.includes(member)).toBe(true)
      }
      
      console.log('👥 Updated anonymity set includes new members')
    })
  })

  describe('Ring Signature Verification', () => {
    it('should verify valid ring signature structure', async () => {
      const ringMembers = [
        'cosmos1valid1',
        'cosmos1valid2',
        'cosmos1valid3'
      ]
      
      const msg: MsgAnonymousTransfer = {
        commitment: randomBytes(32),
        nullifier: randomBytes(32),
        amount: '1000000',
        denom: 'upriv',
        ringMembers,
        ringSignature: randomBytes(ringMembers.length * 64) // Correct size
      }

      // First, add members to anonymity set
      await keeper.anonymousTransfer(ctx, msg)

      // Should not throw for valid structure
      console.log('🔏 Ring signature verified successfully')
    })
  })

  describe('Commitment Verification', () => {
    it('should verify commitment format', async () => {
      const validCommitment = randomBytes(32) // 32 bytes
      const msg: MsgAnonymousTransfer = {
        commitment: validCommitment,
        nullifier: randomBytes(32),
        amount: '1000000',
        denom: 'upriv',
        ringMembers: ['cosmos1test1', 'cosmos1test2'],
        ringSignature: randomBytes(2 * 64)
      }

      await expect(
        keeper.anonymousTransfer(ctx, msg)
      ).resolves.not.toThrow()
    })

    it('should reject invalid commitment length', async () => {
      const invalidCommitment = randomBytes(16) // Wrong length
      const msg: MsgAnonymousTransfer = {
        commitment: invalidCommitment,
        nullifier: randomBytes(32),
        amount: '1000000',
        denom: 'upriv',
        ringMembers: ['cosmos1test1', 'cosmos1test2'],
        ringSignature: randomBytes(2 * 64)
      }

      await expect(
        keeper.anonymousTransfer(ctx, msg)
      ).rejects.toThrow('Invalid commitment length')
    })
  })

  describe('Key Pair Generation', () => {
    it('should generate valid key pairs for stealth addresses', async () => {
      // Generate multiple stealth addresses to test key generation
      const addresses = []
      for (let i = 0; i < 5; i++) {
        const spender = `cosmos1spender${i}`
        const address = await keeper.generateStealthAddress(ctx, spender)
        addresses.push(address)
      }
      
      // All addresses should be unique
      const uniqueAddresses = new Set(addresses)
      expect(uniqueAddresses.size).toBe(addresses.length)
      
      console.log('🔑 Generated', addresses.length, 'unique stealth addresses')
    })
  })
})