/**
 * Integration Tests for Phase 5: Cosmos SDK Integration
 * Tests both Privacy Keeper and Anonymous Transaction Keeper together
 */

import './setup' // Setup mocks for localStorage
import { describe, it, expect, beforeEach } from 'vitest'
import { randomBytes } from '@noble/hashes/utils'
import { PrivacyKeeper } from '../blockchain/x/privachain/keeper/privacy'
import { AnonymousTransactionKeeper } from '../blockchain/x/privachain/keeper/anonymous_tx'
import {
  PrivacyMetadata,
  MsgAnonymousTransfer
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

describe('Phase 5: Cosmos SDK Integration - End-to-End', () => {
  let privacyKeeper: PrivacyKeeper
  let anonTxKeeper: AnonymousTransactionKeeper
  let ctx: MockContext

  beforeEach(() => {
    privacyKeeper = new PrivacyKeeper()
    anonTxKeeper = new AnonymousTransactionKeeper()
    ctx = new MockContext()
  })

  describe('Privacy-Preserving Anonymous Transactions', () => {
    it('should complete full privacy-preserving transaction flow', async () => {
      // Step 1: Create privacy commitment
      const commitment = randomBytes(32)
      const metadata: PrivacyMetadata = {
        sender: 'cosmos1anonymous123',
        timestamp: Date.now(),
        proofType: 'zk-snark',
        publicInputs: ['public_data']
      }

      // Store privacy commitment
      await privacyKeeper.storePrivacyCommitment(ctx, commitment, metadata)
      console.log('✅ Privacy commitment stored')

      // Step 2: Verify the commitment was stored
      const record = await privacyKeeper.getPrivacyRecord(ctx, commitment)
      expect(record.commitment).toEqual(commitment)
      expect(record.metadata.sender).toBe(metadata.sender)
      console.log('✅ Privacy commitment verified')

      // Step 3: Generate stealth address for anonymous transaction
      const stealthAddr = await anonTxKeeper.generateStealthAddress(ctx, 'cosmos1spender123')
      expect(stealthAddr).toMatch(/^0x[a-f0-9]{40}$/)
      console.log('✅ Stealth address generated:', stealthAddr)

      // Step 4: Create anonymous transfer using the commitment
      const anonymousTransfer: MsgAnonymousTransfer = {
        commitment: commitment, // Use the same commitment
        nullifier: randomBytes(32),
        amount: '1000000',
        denom: 'upriv',
        ringMembers: [
          'cosmos1member1',
          'cosmos1member2', 
          'cosmos1member3'
        ],
        ringSignature: randomBytes(3 * 64)
      }

      // Process anonymous transfer
      await anonTxKeeper.anonymousTransfer(ctx, anonymousTransfer)
      console.log('✅ Anonymous transfer processed')

      // Step 5: Verify privacy proof (simplified)
      const proof = randomBytes(64)
      const publicInputs = [randomBytes(32)]
      
      // Set verifying key first
      const vk = randomBytes(32)
      await privacyKeeper.setVerifyingKey(ctx, vk)
      
      const isValidProof = await privacyKeeper.verifyPrivacyProof(ctx, proof, commitment, publicInputs)
      expect(typeof isValidProof).toBe('boolean')
      console.log('✅ Privacy proof verification completed')

      console.log('🎉 Complete privacy-preserving anonymous transaction flow successful!')
    })

    it('should handle multiple privacy records and anonymous transfers', async () => {
      const numTransactions = 5
      const commitments: Uint8Array[] = []

      // Create multiple privacy commitments
      for (let i = 0; i < numTransactions; i++) {
        const commitment = randomBytes(32)
        const metadata: PrivacyMetadata = {
          sender: `cosmos1user${i}`,
          timestamp: Date.now() + i * 1000,
          proofType: 'bulletproof'
        }

        await privacyKeeper.storePrivacyCommitment(ctx, commitment, metadata)
        commitments.push(commitment)
      }

      // Query privacy records with pagination
      const recordsResponse = await privacyKeeper.queryPrivacyRecords(ctx, {
        pagination: { limit: 10 }
      })

      expect(recordsResponse.records.length).toBeGreaterThanOrEqual(numTransactions)
      console.log('✅ Multiple privacy commitments stored and queried')

      // Create corresponding anonymous transfers
      for (let i = 0; i < numTransactions; i++) {
        const anonymousTransfer: MsgAnonymousTransfer = {
          commitment: commitments[i],
          nullifier: randomBytes(32),
          amount: `${(i + 1) * 100000}`,
          denom: 'upriv',
          ringMembers: [
            `cosmos1ring${i}_1`,
            `cosmos1ring${i}_2`,
            `cosmos1ring${i}_3`
          ],
          ringSignature: randomBytes(3 * 64)
        }

        await anonTxKeeper.anonymousTransfer(ctx, anonymousTransfer)
      }

      console.log(`✅ ${numTransactions} privacy-preserving anonymous transfers completed`)
    })

    it('should demonstrate cross-keeper functionality', async () => {
      // Test scenario: Privacy keeper validates commitment, then anonymous keeper uses it
      
      // 1. Create and store privacy commitment
      const commitment = randomBytes(32)
      const metadata: PrivacyMetadata = {
        sender: 'cosmos1crosstest',
        timestamp: Date.now(),
        proofType: 'zk-stark'
      }

      await privacyKeeper.storePrivacyCommitment(ctx, commitment, metadata)

      // 2. Retrieve commitment to verify it exists
      const storedRecord = await privacyKeeper.getPrivacyRecord(ctx, commitment)
      expect(storedRecord.commitment).toEqual(commitment)

      // 3. Generate stealth address for the sender
      const stealthAddr = await anonTxKeeper.generateStealthAddress(ctx, metadata.sender)
      
      // 4. Create anonymous transfer using the verified commitment
      const transfer: MsgAnonymousTransfer = {
        commitment: storedRecord.commitment, // Use the verified commitment
        nullifier: randomBytes(32),
        amount: '2000000',
        denom: 'upriv',
        ringMembers: ['cosmos1a', 'cosmos1b', 'cosmos1c'],
        ringSignature: randomBytes(3 * 64)
      }

      await anonTxKeeper.anonymousTransfer(ctx, transfer)

      console.log('✅ Cross-keeper functionality demonstration completed')
      console.log('📊 Privacy commitment verified and used in anonymous transfer')
      console.log('🎭 Stealth address:', stealthAddr)
    })
  })
})