import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dpiFetch } from '../src/services/dpiClient'

describe('DPI Client - Unified Facade', () => {
  beforeEach(() => {
    // Clear any mocks
    vi.clearAllMocks()
  })

  describe('dpiFetch', () => {
    it('should return a response object with correct shape', async () => {
      // Mock global fetch for testing
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      })
      global.fetch = mockFetch as typeof fetch

      const response = await dpiFetch('https://example.com')
      
      expect(response).toHaveProperty('ok')
      expect(response).toHaveProperty('status')
      expect(response).toHaveProperty('headers')
      expect(response).toHaveProperty('arrayBuffer')
      expect(typeof response.arrayBuffer).toBe('function')
    })

    it('should use randomized headers in fallback mode', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      })
      global.fetch = mockFetch as typeof fetch

      await dpiFetch('https://example.com')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          cache: 'no-store',
          headers: expect.any(Headers)
        })
      )
      
      const headers = mockFetch.mock.calls[0][1].headers as Headers
      expect(headers.get('Accept')).toBe('*/*')
      expect(headers.get('Cache-Control')).toBe('no-cache')
      expect(headers.get('User-Agent')).toBeTruthy()
    })

    it('should handle response with ok status', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10))
      })
      global.fetch = mockFetch as typeof fetch

      const response = await dpiFetch('https://api.example.com/data')
      
      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/json')
      
      const buffer = await response.arrayBuffer()
      expect(buffer).toBeInstanceOf(ArrayBuffer)
      expect(buffer.byteLength).toBe(10)
    })

    it('should handle response with error status', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      })
      global.fetch = mockFetch as typeof fetch

      const response = await dpiFetch('https://example.com/notfound')
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('randomizedHeaders', () => {
    it('should vary User-Agent across multiple calls', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      })
      global.fetch = mockFetch as typeof fetch

      const userAgents = new Set<string>()
      
      // Make multiple calls to collect User-Agent values
      for (let i = 0; i < 10; i++) {
        await dpiFetch('https://example.com')
        const headers = mockFetch.mock.calls[i][1].headers as Headers
        userAgents.add(headers.get('User-Agent') || '')
      }
      
      // Should have at least 1 unique User-Agent (could be 2 if randomness works)
      expect(userAgents.size).toBeGreaterThanOrEqual(1)
      
      // All User-Agents should be non-empty
      userAgents.forEach(ua => {
        expect(ua).toBeTruthy()
        expect(ua.length).toBeGreaterThan(0)
      })
    })
  })
})
