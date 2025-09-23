/**
 * Tests for Zero-Knowledge Identity System
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { 
  ZkIdentityManager, 
  PrivacyCircuit, 
  zkIdentityManager 
} from '../privacy/zk_identity'

describe('Zero-Knowledge Identity System', () => {
  let zkManager: ZkIdentityManager

  beforeEach(() => {
    zkManager = new ZkIdentityManager()
  })

  describe('Identity Creation', () => {
    it('should create a new ZK identity with proper structure', () => {
      const identity = zkManager.createIdentity()
      
      expect(identity.secret).toBeInstanceOf(Uint8Array)
      expect(identity.nullifier).toBeInstanceOf(Uint8Array)
      expect(identity.commitment).toBeInstanceOf(Uint8Array)
      
      expect(identity.secret.length).toBe(32)
      expect(identity.nullifier.length).toBe(32)
      expect(identity.commitment.length).toBe(32)
    })

    it('should create unique identities', () => {
      const identity1 = zkManager.createIdentity()
      const identity2 = zkManager.createIdentity()
      
      expect(identity1.secret).not.toEqual(identity2.secret)
      expect(identity1.nullifier).not.toEqual(identity2.nullifier)
      expect(identity1.commitment).not.toEqual(identity2.commitment)
    })

    it('should create deterministic commitment from secret and nullifier', () => {
      const identity = zkManager.createIdentity()
      const expectedCommitment = zkManager.getCommitment(identity)
      
      expect(identity.commitment).toEqual(expectedCommitment)
    })
  })

  describe('ZK Proof Generation', () => {
    it('should generate a valid ZK proof', async () => {
      const identity = zkManager.createIdentity()
      const publicInputs = ['test-domain']
      
      const proof = await zkManager.generateProof(identity, publicInputs)
      
      expect(proof.proof).toBeDefined()
      expect(proof.publicSignals).toContain(
        Array.from(identity.commitment).map(b => b.toString(16).padStart(2, '0')).join('')
      )
      expect(proof.publicSignals).toContain('test-domain')
      expect(proof.verificationKey).toBe('dev-verification-key')
    })

    it('should generate different proofs for different identities', async () => {
      const identity1 = zkManager.createIdentity()
      const identity2 = zkManager.createIdentity()
      
      const proof1 = await zkManager.generateProof(identity1)
      const proof2 = await zkManager.generateProof(identity2)
      
      expect(proof1.proof).not.toBe(proof2.proof)
      expect(proof1.publicSignals[0]).not.toBe(proof2.publicSignals[0])
    })
  })

  describe('ZK Proof Verification', () => {
    it('should verify a valid proof', async () => {
      const identity = zkManager.createIdentity()
      const publicInputs = ['test-domain']
      
      const proof = await zkManager.generateProof(identity, publicInputs)
      const isValid = await zkManager.verifyProof(proof, identity.commitment, publicInputs)
      
      expect(isValid).toBe(true)
    })

    it('should reject invalid proof with wrong commitment', async () => {
      const identity1 = zkManager.createIdentity()
      const identity2 = zkManager.createIdentity()
      
      const proof = await zkManager.generateProof(identity1)
      const isValid = await zkManager.verifyProof(proof, identity2.commitment)
      
      expect(isValid).toBe(false)
    })

    it('should reject proof with wrong public inputs', async () => {
      const identity = zkManager.createIdentity()
      const publicInputs = ['test-domain']
      const wrongInputs = ['wrong-domain']
      
      const proof = await zkManager.generateProof(identity, publicInputs)
      const isValid = await zkManager.verifyProof(proof, identity.commitment, wrongInputs)
      
      expect(isValid).toBe(false)
    })
  })

  describe('Nullifier Validation', () => {
    it('should validate unique nullifiers', () => {
      const identity = zkManager.createIdentity()
      const usedNullifiers: Uint8Array[] = []
      
      const isValid = zkManager.validateNullifier(identity.nullifier, usedNullifiers)
      expect(isValid).toBe(true)
    })

    it('should reject reused nullifiers', () => {
      const identity = zkManager.createIdentity()
      const usedNullifiers = [identity.nullifier]
      
      const isValid = zkManager.validateNullifier(identity.nullifier, usedNullifiers)
      expect(isValid).toBe(false)
    })
  })

  describe('Privacy Circuit', () => {
    it('should synthesize circuit with valid inputs', () => {
      const identity = zkManager.createIdentity()
      const circuit = new PrivacyCircuit({
        secret: identity.secret,
        nullifier: identity.nullifier,
        commitment: identity.commitment
      })
      
      const result = circuit.synthesize()
      expect(result).toBe(true)
    })

    it('should fail synthesis with invalid commitment', () => {
      const identity = zkManager.createIdentity()
      const wrongCommitment = new Uint8Array(32)
      
      const circuit = new PrivacyCircuit({
        secret: identity.secret,
        nullifier: identity.nullifier,
        commitment: wrongCommitment
      })
      
      const result = circuit.synthesize()
      expect(result).toBe(false)
    })

    it('should throw error with missing inputs', () => {
      const circuit = new PrivacyCircuit({
        secret: null,
        nullifier: null,
        commitment: null
      })
      
      expect(() => circuit.synthesize()).toThrow('Missing required circuit inputs')
    })

    it('should return correct public outputs', () => {
      const identity = zkManager.createIdentity()
      const circuit = new PrivacyCircuit({
        secret: identity.secret,
        nullifier: identity.nullifier,
        commitment: identity.commitment
      })
      
      const outputs = circuit.getPublicOutputs()
      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toEqual(identity.commitment)
    })
  })

  describe('Singleton Instance', () => {
    it('should return the same instance', () => {
      const instance1 = ZkIdentityManager.getInstance()
      const instance2 = ZkIdentityManager.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(zkIdentityManager)
    })
  })
})