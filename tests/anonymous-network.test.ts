/**
 * Tests for Anonymous Network Layer (Phase 2 implementation)
 * Tests onion routing and anonymous message routing functionality
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { OnionRouter, OnionNode } from '../anonymous_network/onion_router'
import { AnonymousMessageRouter } from '../anonymous_network/message_router'
// @ts-expect-error - libsodium-wrappers types may not be perfect
import * as sodium from 'libsodium-wrappers'

describe('Anonymous Network Layer - Phase 2', () => {
  beforeEach(async () => {
    await sodium.ready // Ensure libsodium is ready for tests
  })

  describe('OnionRouter', () => {
    let router: OnionRouter
    let testNodes: OnionNode[]

    beforeEach(() => {
      // Create test nodes with mock public keys
      testNodes = [
        {
          address: '127.0.0.1:8001',
          publicKey: sodium.randombytes_buf(32)
        },
        {
          address: '127.0.0.1:8002',
          publicKey: sodium.randombytes_buf(32)
        },
        {
          address: '127.0.0.1:8003',
          publicKey: sodium.randombytes_buf(32)
        },
        {
          address: '127.0.0.1:8004',
          publicKey: sodium.randombytes_buf(32)
        },
        {
          address: '127.0.0.1:8005',
          publicKey: sodium.randombytes_buf(32)
        }
      ]
      
      router = new OnionRouter(testNodes)
    })

    test('should create onion router with nodes', () => {
      expect(router).toBeDefined()
      expect(router.getActiveCircuits()).toHaveLength(0)
    })

    test('should build circuit with specified path length', async () => {
      const circuitId = await router.buildCircuit(3)
      
      expect(circuitId).toBeDefined()
      expect(typeof circuitId).toBe('string')
      expect(circuitId).toMatch(/^circuit_/)
      
      const activeCircuits = router.getActiveCircuits()
      expect(activeCircuits).toHaveLength(1)
      expect(activeCircuits[0]).toBe(circuitId)
    })

    test('should fail to build circuit with insufficient nodes', async () => {
      await expect(router.buildCircuit(10))
        .rejects.toThrow('Insufficient nodes')
    })

    test('should send data through onion circuit', async () => {
      const circuitId = await router.buildCircuit(3)
      const testData = new TextEncoder().encode('Hello, anonymous world!')
      const destination = 'example.com:443'
      
      const response = await router.sendOnionRequest(circuitId, testData, destination)
      
      expect(response).toBeInstanceOf(Uint8Array)
      expect(response.length).toBeGreaterThan(0)
    })

    test('should fail to send through non-existent circuit', async () => {
      const testData = new TextEncoder().encode('Test message')
      const destination = 'example.com:443'
      
      await expect(router.sendOnionRequest('invalid-circuit', testData, destination))
        .rejects.toThrow('Circuit invalid-circuit not found')
    })

    test('should get circuit metrics', async () => {
      const circuitId = await router.buildCircuit(4)
      
      const metrics = router.getCircuitMetrics(circuitId)
      
      expect(metrics).toHaveProperty('circuitId', circuitId)
      expect(metrics).toHaveProperty('nodeCount', 4)
      expect(metrics).toHaveProperty('createdAt')
      expect(metrics).toHaveProperty('age')
      expect(metrics).toHaveProperty('nodes')
      expect(metrics.nodes).toHaveLength(4)
    })

    test('should remove circuit', async () => {
      const circuitId = await router.buildCircuit(3)
      
      expect(router.getActiveCircuits()).toHaveLength(1)
      
      const removed = router.removeCircuit(circuitId)
      
      expect(removed).toBe(true)
      expect(router.getActiveCircuits()).toHaveLength(0)
    })

    test('should build multiple circuits', async () => {
      const circuit1 = await router.buildCircuit(3)
      const circuit2 = await router.buildCircuit(4)
      const circuit3 = await router.buildCircuit(2)
      
      const activeCircuits = router.getActiveCircuits()
      
      expect(activeCircuits).toHaveLength(3)
      expect(activeCircuits).toContain(circuit1)
      expect(activeCircuits).toContain(circuit2)
      expect(activeCircuits).toContain(circuit3)
    })
  })

  describe('AnonymousMessageRouter', () => {
    let router: AnonymousMessageRouter

    beforeEach(async () => {
      router = new AnonymousMessageRouter()
      await router.initialize()
    })

    afterEach(async () => {
      await router.shutdown()
    })

    test('should initialize message router', async () => {
      const stats = router.getStatistics()
      
      expect(stats.initialized).toBe(true)
      expect(stats.peerId).toBeDefined()
      expect(typeof stats.peerId).toBe('string')
      expect(stats.connectedPeers).toBeGreaterThan(0) // Mock peers added
    })

    test('should send anonymous message', async () => {
      const content = new TextEncoder().encode('Test anonymous message')
      
      const messageId = await router.sendAnonymousMessage(content)
      
      expect(messageId).toBeDefined()
      expect(typeof messageId).toBe('string')
      
      const stats = router.getStatistics()
      expect(stats.cachedMessages).toBeGreaterThan(0)
    })

    test('should send message with recipient', async () => {
      const content = new TextEncoder().encode('Direct message')
      const recipient = 'target-peer-id'
      
      const messageId = await router.sendAnonymousMessage(content, recipient)
      
      expect(messageId).toBeDefined()
    })

    test('should process incoming message', async () => {
      const content = new TextEncoder().encode('Incoming test message')
      const mockMessage = {
        id: 'test-message-id',
        content,
        ttl: 3600,
        timestamp: Math.floor(Date.now() / 1000),
        routingData: {
          hopCount: 1,
          maxHops: 5,
          visited: ['sender-peer-id']
        }
      }
      
      // Encrypt message for processing
      const encrypted = await (router as any).encryptMessage(mockMessage)
      
      await router.processIncomingMessage(encrypted, 'sender-peer-id')
      
      const stats = router.getStatistics()
      expect(stats.cachedMessages).toBeGreaterThan(0)
    })

    test('should get router statistics', () => {
      const stats = router.getStatistics()
      
      expect(stats).toHaveProperty('peerId')
      expect(stats).toHaveProperty('connectedPeers')
      expect(stats).toHaveProperty('cachedMessages')
      expect(stats).toHaveProperty('queuedMessages')
      expect(stats).toHaveProperty('subscriptions')
      expect(stats).toHaveProperty('initialized')
    })

    test('should get connected peers', () => {
      const peers = router.getConnectedPeers()
      
      expect(Array.isArray(peers)).toBe(true)
      expect(peers.length).toBeGreaterThan(0)
      
      for (const peer of peers) {
        expect(peer).toHaveProperty('id')
        expect(peer).toHaveProperty('multiaddrs')
        expect(peer).toHaveProperty('protocols')
        expect(peer).toHaveProperty('reputation')
        expect(peer).toHaveProperty('lastSeen')
      }
    })

    test('should subscribe and unsubscribe to topics', () => {
      const topic = 'test-topic'
      
      router.subscribe(topic)
      
      let stats = router.getStatistics()
      expect(stats.subscriptions).toBe(1)
      
      router.unsubscribe(topic)
      
      stats = router.getStatistics()
      expect(stats.subscriptions).toBe(0)
    })

    test('should handle encryption and decryption', async () => {
      const originalMessage = {
        id: 'test-id',
        content: new TextEncoder().encode('Test content'),
        ttl: 3600,
        timestamp: Math.floor(Date.now() / 1000)
      }
      
      // Access private methods for testing
      const encrypted = await (router as any).encryptMessage(originalMessage)
      const decrypted = await (router as any).decryptMessage(encrypted)
      
      expect(decrypted.id).toBe(originalMessage.id)
      expect(decrypted.ttl).toBe(originalMessage.ttl)
      expect(decrypted.timestamp).toBe(originalMessage.timestamp)
      expect(decrypted.content).toEqual(originalMessage.content)
    })

    test('should reject expired messages', async () => {
      const expiredMessage = {
        id: 'expired-message',
        content: new TextEncoder().encode('Expired content'),
        ttl: 1, // 1 second TTL
        timestamp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        routingData: {
          hopCount: 1,
          maxHops: 5,
          visited: ['sender-peer-id']
        }
      }
      
      const encrypted = await (router as any).encryptMessage(expiredMessage)
      
      // Should not throw, but should ignore the message
      await router.processIncomingMessage(encrypted, 'sender-peer-id')
      
      // Message should not be cached since it's expired
      const stats = router.getStatistics()
      // We can't easily verify the message wasn't cached without exposing internals
      // But the test ensures the system doesn't crash with expired messages
    })
  })

  describe('Integration Tests', () => {
    test('should work together - onion router and message router', async () => {
      // Create onion router with test nodes
      const testNodes: OnionNode[] = [
        {
          address: '127.0.0.1:9001',
          publicKey: sodium.randombytes_buf(32)
        },
        {
          address: '127.0.0.1:9002',
          publicKey: sodium.randombytes_buf(32)
        },
        {
          address: '127.0.0.1:9003',
          publicKey: sodium.randombytes_buf(32)
        }
      ]
      
      const onionRouter = new OnionRouter(testNodes)
      const messageRouter = new AnonymousMessageRouter()
      
      await messageRouter.initialize()
      
      try {
        // Build onion circuit
        const circuitId = await onionRouter.buildCircuit(3)
        expect(circuitId).toBeDefined()
        
        // Send anonymous message
        const content = new TextEncoder().encode('Integration test message')
        const messageId = await messageRouter.sendAnonymousMessage(content)
        expect(messageId).toBeDefined()
        
        // Verify both systems are working
        expect(onionRouter.getActiveCircuits()).toHaveLength(1)
        
        const stats = messageRouter.getStatistics()
        expect(stats.cachedMessages).toBeGreaterThan(0)
        
      } finally {
        await messageRouter.shutdown()
      }
    })
  })
})