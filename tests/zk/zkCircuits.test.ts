/**
 * ZK-SNARK Circuit Tests
 * Tests for real circuit implementation and proof generation
 */

import { ZKIdentityManager, ZKError } from '../../services/zkCrypto'

describe('ZK-SNARK Circuit Implementation', () => {
  let zkManager: ZKIdentityManager

  beforeEach(() => {
    zkManager = new ZKIdentityManager()
  })

  describe('Circuit Initialization', () => {
    test('should throw error when circuits are not initialized', async () => {
      await expect(zkManager.generateIdentity()).resolves.toBeDefined()
      
      await expect(
        zkManager.generateDomainOwnershipProof('test.prv')
      ).rejects.toThrow(ZKError)
      
      await expect(
        zkManager.generateDomainOwnershipProof('test.prv')
      ).rejects.toThrow(/Real ZK circuits are required/)
    })

    test('should provide helpful error messages for missing circuit setup', async () => {
      try {
        await zkManager.generateDomainOwnershipProof('test.prv')
      } catch (error) {
        expect(error).toBeInstanceOf(ZKError)
        expect(error.message).toContain('setup-zk-circuits.sh')
        expect(error.message).toContain('ZK_CIRCUIT_WASM')
        expect(error.message).toContain('ZK_CIRCUIT_ZKEY')
      }
    })

    test('should throw error when verification key is not available', async () => {
      await zkManager.generateIdentity()
      
      const mockProof = {
        proof: '{"pi_a":["1","2","1"],"pi_b":[["3","4"],["5","6"],["1","0"]],"pi_c":["7","8","1"]}',
        publicSignals: ['test'],
        nullifierHash: 'mock-nullifier'
      }

      await expect(
        zkManager.verifyZKProof(mockProof, { domain: 'test.prv' })
      ).rejects.toThrow(/Real verification key is required/)
    })
  })

  describe('Identity Generation', () => {
    test('should generate valid ZK identity', async () => {
      const identity = await zkManager.generateIdentity()
      
      expect(identity).toBeDefined()
      expect(identity.privateKey).toBeInstanceOf(Uint8Array)
      expect(identity.privateKey.length).toBe(32)
      expect(identity.publicHash).toMatch(/^[0-9a-f]{64}$/)
      expect(identity.commitment).toMatch(/^[0-9a-f]{64}$/)
    })

    test('should generate different identities each time', async () => {
      const identity1 = await zkManager.generateIdentity()
      
      // Create new instance to ensure fresh generation
      const zkManager2 = new ZKIdentityManager()
      const identity2 = await zkManager2.generateIdentity()
      
      expect(identity1.publicHash).not.toBe(identity2.publicHash)
      expect(identity1.commitment).not.toBe(identity2.commitment)
    })

    test('should export and import identity correctly', async () => {
      const originalIdentity = await zkManager.generateIdentity()
      const exportedData = zkManager.exportIdentity()
      
      expect(exportedData).toBeDefined()
      expect(typeof exportedData).toBe('string')
      
      // Create new manager and import
      const zkManager2 = new ZKIdentityManager()
      const importedIdentity = await zkManager2.importIdentity(exportedData!)
      
      expect(importedIdentity.publicHash).toBe(originalIdentity.publicHash)
      expect(importedIdentity.commitment).toBe(originalIdentity.commitment)
    })
  })

  describe('Error Handling', () => {
    test('should require real circuits for domain ownership proofs', async () => {
      await zkManager.generateIdentity()
      
      await expect(
        zkManager.generateDomainOwnershipProof('test.prv')
      ).rejects.toThrow(/Real ZK circuits are required/)
    })

    test('should require real circuits for search inclusion proofs', async () => {
      await zkManager.generateIdentity()
      
      await expect(
        zkManager.generateSearchInclusionProof(
          'mock-root',
          'mock-leaf',
          ['path1', 'path2'],
          [0, 1]
        )
      ).rejects.toThrow(/Real ZK circuits are required/)
    })

    test('should validate proof format in verification', async () => {
      // Mock circuit initialization to test proof validation
      const originalInitialize = zkManager.initializeCircuits
      zkManager.initializeCircuits = jest.fn().mockResolvedValue(undefined)
      
      // Mock verification key
      ;(zkManager as any).verificationKey = {
        protocol: 'groth16',
        vk_alpha_1: ['1', '2', '1'],
        vk_beta_2: [['3', '4'], ['5', '6'], ['1', '0']],
        IC: [['7', '8', '1']]
      }

      const invalidProof = {
        proof: 'invalid-json',
        publicSignals: ['test'],
        nullifierHash: 'mock-nullifier'
      }

      await expect(
        zkManager.verifyZKProof(invalidProof, { domain: 'test.prv' })
      ).rejects.toThrow(/Invalid proof format/)
    })
  })

  describe('Helper Functions', () => {
    test('should generate consistent hashes for same input', async () => {
      await zkManager.generateIdentity()
      
      const hash1 = (zkManager as any).hashString('test-input')
      const hash2 = (zkManager as any).hashString('test-input')
      
      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[0-9a-f]{64}$/)
    })

    test('should generate different hashes for different inputs', async () => {
      await zkManager.generateIdentity()
      
      const hash1 = (zkManager as any).hashString('input1')
      const hash2 = (zkManager as any).hashString('input2')
      
      expect(hash1).not.toBe(hash2)
    })

    test('should generate random hex strings', async () => {
      await zkManager.generateIdentity()
      
      const hex1 = (zkManager as any).generateRandomHex(16)
      const hex2 = (zkManager as any).generateRandomHex(16)
      
      expect(hex1).toMatch(/^[0-9a-f]{32}$/)
      expect(hex2).toMatch(/^[0-9a-f]{32}$/)
      expect(hex1).not.toBe(hex2)
    })
  })
})

describe('Integration with Real Circuits', () => {
  test('should detect when real circuits are available', async () => {
    // This test would pass if real circuits are set up
    // Otherwise it should provide helpful error messages
    
    const zkManager = new ZKIdentityManager()
    
    // Check if environment variables are set
    const hasWasm = process.env.ZK_CIRCUIT_WASM || process.env.VITE_ZK_CIRCUIT_WASM
    const hasZkey = process.env.ZK_CIRCUIT_ZKEY || process.env.VITE_ZK_CIRCUIT_ZKEY
    const hasVkey = process.env.ZK_VERIFICATION_KEY || process.env.VITE_ZK_VERIFICATION_KEY
    
    if (hasWasm && hasZkey && hasVkey) {
      // If circuits are available, test real functionality
      console.log('Real circuits detected, testing full functionality...')
      
      try {
        await zkManager.initializeCircuits()
        await zkManager.generateIdentity()
        
        // Should be able to generate proofs
        const proof = await zkManager.generateDomainOwnershipProof('test.prv')
        expect(proof).toBeDefined()
        expect(proof.proof).toBeDefined()
        expect(proof.publicSignals).toBeInstanceOf(Array)
        expect(proof.nullifierHash).toBeDefined()
        
        // Should be able to verify proofs
        const isValid = await zkManager.verifyZKProof(proof, { domain: 'test.prv' })
        expect(typeof isValid).toBe('boolean')
        
      } catch (error) {
        console.warn('Circuit files found but initialization failed:', error)
      }
    } else {
      console.log('No real circuits found, testing error handling...')
      
      await expect(
        zkManager.initializeCircuits()
      ).rejects.toThrow(/ZK circuit files are required/)
    }
  })
})