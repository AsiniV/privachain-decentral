/**
 * Unit tests for TurnProvider service
 * Tests caching, fallback, and TTL management
 */

import { TurnProvider } from '../../server/services/turnProvider'
import type { TurnProviderOptions } from '../../shared/types/webrtc'

// Mock fetch globally
global.fetch = jest.fn()

describe('TurnProvider', () => {
  let provider: TurnProvider
  let mockFetch: jest.MockedFunction<typeof fetch>

  const mockOptions: TurnProviderOptions = {
    domain: 'test.metered.live',
    secret: 'test_secret',
    cacheTtlOffsetSeconds: 5,
    staticServers: [
      { urls: 'stun:stun.example.com:80' },
      { urls: 'turn:turn.example.com:80', username: 'test', credential: 'test' }
    ]
  }

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockClear()
    provider = new TurnProvider(mockOptions)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getIceServers', () => {
    test('should fetch from Metered API successfully', async () => {
      const mockResponse = {
        iceServers: [
          { urls: 'stun:stun.metered.ca:80' },
          { urls: 'turn:turn.metered.ca:80', username: 'dynamic_user', credential: 'dynamic_pass' }
        ],
        ttl: 300
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      const result = await provider.getIceServers()

      expect(result.source).toBe('dynamic')
      expect(result.iceServers).toHaveLength(2)
      expect(result.iceServers[0].urls).toBe('stun:stun.metered.ca:80')
      expect(result.expiresAt).toBeDefined()
    })

    test('should use cache when not expired', async () => {
      // First call to populate cache
      const mockResponse = {
        iceServers: [{ urls: 'stun:cached.example.com:80' }],
        ttl: 300
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      await provider.getIceServers()

      // Second call should use cache
      const result = await provider.getIceServers()

      expect(result.source).toBe('cache')
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only called once
    })

    test('should fallback to static servers on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await provider.getIceServers()

      expect(result.source).toBe('fallback')
      expect(result.iceServers).toEqual(mockOptions.staticServers)
    })

    test('should handle force refresh', async () => {
      // First call to populate cache
      const mockResponse1 = {
        iceServers: [{ urls: 'stun:first.example.com:80' }],
        ttl: 300
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse1)
      } as Response)

      await provider.getIceServers()

      // Force refresh should bypass cache
      const mockResponse2 = {
        iceServers: [{ urls: 'stun:second.example.com:80' }],
        ttl: 300
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse2)
      } as Response)

      const result = await provider.getIceServers(true)

      expect(result.source).toBe('dynamic')
      expect(result.iceServers[0].urls).toBe('stun:second.example.com:80')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('should handle API error with valid cache', async () => {
      // First call to populate cache
      const mockResponse = {
        iceServers: [{ urls: 'stun:cached.example.com:80' }],
        ttl: 300
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      await provider.getIceServers()

      // Force cache expiry by invalidating and then failing API call
      provider.invalidateCache()
      mockFetch.mockRejectedValueOnce(new Error('API down'))

      const result = await provider.getIceServers()

      expect(result.source).toBe('fallback')
      expect(result.iceServers).toEqual(mockOptions.staticServers)
    })

    test('should handle invalid API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      } as Response)

      const result = await provider.getIceServers()

      expect(result.source).toBe('fallback')
      expect(result.iceServers).toEqual(mockOptions.staticServers)
    })

    test('should handle HTTP error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      } as Response)

      const result = await provider.getIceServers()

      expect(result.source).toBe('fallback')
      expect(result.iceServers).toEqual(mockOptions.staticServers)
    })
  })

  describe('getCacheStatus', () => {
    test('should return no cache initially', () => {
      const status = provider.getCacheStatus()
      expect(status.hasCache).toBe(false)
    })

    test('should return cache status after successful fetch', async () => {
      const mockResponse = {
        iceServers: [{ urls: 'stun:test.example.com:80' }],
        ttl: 300
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      await provider.getIceServers()

      const status = provider.getCacheStatus()
      expect(status.hasCache).toBe(true)
      expect(status.ttl).toBe(300)
      expect(status.remainingMs).toBeGreaterThan(0)
    })
  })

  describe('invalidateCache', () => {
    test('should clear cache', async () => {
      // Populate cache first
      const mockResponse = {
        iceServers: [{ urls: 'stun:test.example.com:80' }],
        ttl: 300
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      await provider.getIceServers()

      expect(provider.getCacheStatus().hasCache).toBe(true)

      provider.invalidateCache()

      expect(provider.getCacheStatus().hasCache).toBe(false)
    })
  })
})

// Helper to run tests if this file is executed directly
if (require.main === module) {
  console.log('TurnProvider tests defined. Use a test runner like Jest to execute them.')
}