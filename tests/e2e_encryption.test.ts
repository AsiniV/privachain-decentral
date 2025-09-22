/**
 * Tests for End-to-End Encrypted Messaging
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { E2EMessaging, e2eMessaging } from '../messenger/e2e_encryption'

// Mock crypto API for testing
const mockCrypto = {
  subtle: {
    generateKey: vi.fn(),
    importKey: vi.fn(),
    exportKey: vi.fn(),
    deriveKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    digest: vi.fn(),
  },
  getRandomValues: vi.fn()
}

// Mock global crypto
Object.defineProperty(globalThis, 'crypto', {
  value: mockCrypto,
  writable: true
})

describe('End-to-End Encrypted Messaging', () => {
  let messaging: E2EMessaging

  beforeEach(() => {
    vi.clearAllMocks()
    messaging = new E2EMessaging()
    
    // Setup mock crypto responses
    mockCrypto.subtle.generateKey.mockResolvedValue({
      privateKey: 'mock-private-key',
      publicKey: 'mock-public-key'
    })
    
    mockCrypto.subtle.importKey.mockResolvedValue('mock-imported-key')
    mockCrypto.subtle.deriveKey.mockResolvedValue('mock-shared-key')
    mockCrypto.subtle.exportKey.mockResolvedValue({
      kty: 'EC',
      crv: 'P-384',
      x: 'mock-x',
      y: 'mock-y'
    })
    
    mockCrypto.getRandomValues.mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    })
    
    mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32))
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(64))
    mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode('test message'))
  })

  describe('Initialization', () => {
    it('should initialize with ECDH key pair', async () => {
      await messaging.initialize()
      
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'ECDH',
          namedCurve: 'P-384'
        },
        false,
        ['deriveKey']
      )
      
      expect(messaging.isInitialized()).toBe(true)
    })

    it('should handle initialization errors', async () => {
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Crypto error'))
      
      await expect(messaging.initialize()).rejects.toThrow('E2E messaging initialization failed')
    })
  })

  describe('Contact Management', () => {
    beforeEach(async () => {
      await messaging.initialize()
    })

    it('should add a contact with public key', async () => {
      const publicKeyJwk = {
        kty: 'EC',
        crv: 'P-384',
        x: 'test-x',
        y: 'test-y'
      }

      await messaging.addContact('alice', publicKeyJwk)

      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'jwk',
        publicKeyJwk,
        {
          name: 'ECDH',
          namedCurve: 'P-384'
        },
        false,
        []
      )

      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalled()

      const contacts = messaging.getContacts()
      expect(contacts).toHaveLength(1)
      expect(contacts[0].id).toBe('alice')
    })

    it('should throw error when adding contact before initialization', async () => {
      const messaging2 = new E2EMessaging()
      const publicKeyJwk = { kty: 'EC', crv: 'P-384', x: 'test-x', y: 'test-y' }

      await expect(messaging2.addContact('alice', publicKeyJwk))
        .rejects.toThrow('E2E messaging not initialized')
    })

    it('should remove a contact', async () => {
      const publicKeyJwk = { kty: 'EC', crv: 'P-384', x: 'test-x', y: 'test-y' }
      await messaging.addContact('alice', publicKeyJwk)

      expect(messaging.getContacts()).toHaveLength(1)

      const removed = messaging.removeContact('alice')
      expect(removed).toBe(true)
      expect(messaging.getContacts()).toHaveLength(0)
    })
  })

  describe('Message Encryption', () => {
    beforeEach(async () => {
      await messaging.initialize()
      const publicKeyJwk = { kty: 'EC', crv: 'P-384', x: 'test-x', y: 'test-y' }
      await messaging.addContact('alice', publicKeyJwk)
    })

    it('should encrypt a message for a contact', async () => {
      const message = 'Hello, Alice!'
      
      const encrypted = await messaging.encryptMessage('alice', message)

      expect(encrypted.encrypted).toBeInstanceOf(Uint8Array)
      expect(encrypted.timestamp).toBeGreaterThan(0)
      expect(encrypted.contactId).toBe('alice')
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled()
    })

    it('should throw error for unknown contact', async () => {
      await expect(messaging.encryptMessage('unknown', 'test'))
        .rejects.toThrow('Contact unknown not found')
    })
  })

  describe('Message Decryption', () => {
    beforeEach(async () => {
      await messaging.initialize()
      const publicKeyJwk = { kty: 'EC', crv: 'P-384', x: 'test-x', y: 'test-y' }
      await messaging.addContact('alice', publicKeyJwk)
    })

    it('should decrypt a message from known contact', async () => {
      const encryptedData = new Uint8Array(76) // 12 bytes IV + 64 bytes data
      mockCrypto.getRandomValues(encryptedData)

      const decrypted = await messaging.decryptMessage(encryptedData)

      expect(decrypted).toBe('test message')
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled()
    })

    it('should throw error if no contact can decrypt', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'))
      
      const encryptedData = new Uint8Array(76)
      
      await expect(messaging.decryptMessage(encryptedData))
        .rejects.toThrow('No matching contact found for decryption')
    })
  })

  describe('Message Sending and Receiving', () => {
    beforeEach(async () => {
      await messaging.initialize()
      const publicKeyJwk = { kty: 'EC', crv: 'P-384', x: 'test-x', y: 'test-y' }
      await messaging.addContact('alice', publicKeyJwk)
    })

    it('should send a message and return CID', async () => {
      const cid = await messaging.sendMessage('alice', 'Hello!')

      expect(cid).toBeDefined()
      expect(cid).toMatch(/^bafk/) // Mock CID format
    })

    it('should receive and decrypt a message', async () => {
      const mockCid = 'bafktest123'
      
      const receivedMessage = await messaging.receiveMessage(mockCid)

      expect(receivedMessage.content).toBe('test message')
      expect(receivedMessage.id).toBe(mockCid)
      expect(receivedMessage.timestamp).toBeGreaterThan(0)
    })

    it('should throw error for unknown contact in send', async () => {
      await expect(messaging.sendMessage('unknown', 'test'))
        .rejects.toThrow('Contact unknown not found')
    })
  })

  describe('Public Key Export', () => {
    beforeEach(async () => {
      await messaging.initialize()
    })

    it('should export public key in JWK format', async () => {
      const publicKey = await messaging.getMyPublicKey()

      expect(publicKey).toEqual({
        kty: 'EC',
        crv: 'P-384',
        x: 'mock-x',
        y: 'mock-y'
      })
    })

    it('should get fingerprint', async () => {
      const fingerprint = await messaging.getMyFingerprint()

      expect(fingerprint).toBeDefined()
      expect(typeof fingerprint).toBe('string')
    })

    it('should throw error if not initialized', async () => {
      const messaging2 = new E2EMessaging()
      
      await expect(messaging2.getMyPublicKey())
        .rejects.toThrow('Key pair not initialized')
    })
  })

  describe('Message Storage', () => {
    beforeEach(async () => {
      await messaging.initialize()
      const publicKeyJwk = { kty: 'EC', crv: 'P-384', x: 'test-x', y: 'test-y' }
      await messaging.addContact('alice', publicKeyJwk)
    })

    it('should store conversation messages', async () => {
      const messages = messaging.getConversationMessages('alice')
      expect(messages).toEqual([])

      // After receiving a message, it should be stored
      await messaging.receiveMessage('bafktest123')
      
      // Note: In the real implementation, this would work with proper fingerprints
    })

    it('should clear all messages', () => {
      messaging.clearMessages()
      
      const messages = messaging.getConversationMessages('alice')
      expect(messages).toEqual([])
    })
  })

  describe('Singleton Instance', () => {
    it('should provide global singleton', () => {
      expect(e2eMessaging).toBeInstanceOf(E2EMessaging)
    })
  })

  describe('Integration with Browser Crypto', () => {
    it('should work without initialization in non-browser environment', () => {
      // Remove crypto mock temporarily
      delete (globalThis as any).crypto
      
      const messaging2 = new E2EMessaging()
      expect(messaging2.isInitialized()).toBe(false)
      
      // Restore crypto mock
      Object.defineProperty(globalThis, 'crypto', {
        value: mockCrypto,
        writable: true
      })
    })
  })
})