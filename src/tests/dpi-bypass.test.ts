/**
 * Comprehensive DPI Bypass Tests
 * Tests traffic obfuscation, protocol masquerading, and bypass effectiveness
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import proxyVPN from '../src/services/proxyVPN'
import { PrivaChainIPFSService } from '../src/services/ipfs'

describe('DPI Bypass Functionality', () => {
  let service: typeof proxyVPN

  beforeEach(async () => {
    service = proxyVPN
    await service.initialize()
  })

  describe('Traffic Obfuscation', () => {
    it('should obfuscate traffic with XChaCha20 and padding', async () => {
      // Test data that would trigger DPI detection
      const ipfsPattern = new Uint8Array([0x13, 0x2f, 0x69, 0x70, 0x66, 0x73]) // "/ipfs" signature
      const libp2pPattern = new Uint8Array([0x6c, 0x69, 0x62, 0x70, 0x32, 0x70]) // "libp2p"
      
      // Mock the private obfuscateTraffic method
      const obfuscateTraffic = (service as any).obfuscateTraffic.bind(service)
      const obfuscatedIpfs = obfuscateTraffic(ipfsPattern)
      const obfuscatedLibp2p = obfuscateTraffic(libp2pPattern)
      
      // Verify obfuscation changes the data
      expect(obfuscatedIpfs).not.toEqual(ipfsPattern)
      expect(obfuscatedLibp2p).not.toEqual(libp2pPattern)
      
      // Verify DPI patterns are not detectable
      const ipfsString = new TextDecoder().decode(obfuscatedIpfs)
      const libp2pString = new TextDecoder().decode(obfuscatedLibp2p)
      
      expect(ipfsString).not.toMatch(/ipfs|libp2p/i)
      expect(libp2pString).not.toMatch(/ipfs|libp2p/i)
      
      // Verify padding was added (size should be larger)
      expect(obfuscatedIpfs.length).toBeGreaterThan(ipfsPattern.length)
      expect(obfuscatedLibp2p.length).toBeGreaterThan(libp2pPattern.length)
      
      console.log('✅ Traffic obfuscation test passed')
    })

    it('should simulate DPI bypass with regex filters', async () => {
      // Common DPI patterns that block P2P traffic
      const dpiFilters = [
        /ipfs|libp2p/i,
        /bittorrent|torrent/i,
        /dht|peer/i,
        /kad|kademlia/i
      ]
      
      // Test various P2P-related payloads
      const testPayloads = [
        'GET /ipfs/QmHash HTTP/1.1',
        'libp2p-identify-protocol',
        'dht-peer-discovery',
        'kad-dht-query'
      ]
      
      const obfuscateTraffic = (service as any).obfuscateTraffic.bind(service)
      
      for (const payload of testPayloads) {
        const originalBytes = new TextEncoder().encode(payload)
        const obfuscated = obfuscateTraffic(originalBytes)
        const obfuscatedText = new TextDecoder().decode(obfuscated)
        
        // Verify no DPI filter matches obfuscated traffic
        for (const filter of dpiFilters) {
          expect(filter.test(obfuscatedText)).toBe(false)
        }
      }
      
      console.log('✅ DPI regex bypass test passed')
    })
  })

  describe('Multi-hop Proxy Chain', () => {
    it('should create diverse geographic chain', async () => {
      // Mock nodes with different countries
      const mockNodes = [
        { id: 'nl-1', country: 'NL', active: true, uptime: 95, dpiScore: 80 },
        { id: 'ch-1', country: 'CH', active: true, uptime: 98, dpiScore: 85 },
        { id: 'is-1', country: 'IS', active: true, uptime: 96, dpiScore: 90 },
        { id: 'no-1', country: 'NO', active: true, uptime: 94, dpiScore: 75 },
        { id: 'fi-1', country: 'FI', active: true, uptime: 97, dpiScore: 82 }
      ]
      
      // Mock the nodes array
      ;(service as any).nodes = mockNodes
      
      const selectOptimalChainNodes = (service as any).selectOptimalChainNodes.bind(service)
      const selectedNodes = selectOptimalChainNodes()
      
      expect(selectedNodes.length).toBeGreaterThanOrEqual(3)
      expect(selectedNodes.length).toBeLessThanOrEqual(5)
      
      // Verify geographic diversity
      const countries = selectedNodes.map((id: string) => 
        mockNodes.find(n => n.id === id)?.country
      )
      const uniqueCountries = new Set(countries)
      expect(uniqueCountries.size).toBeGreaterThanOrEqual(3)
      
      console.log('✅ Multi-hop chain diversity test passed')
    })

    it('should handle V2Ray fallback', async () => {
      const mockNode = {
        id: 'test-node',
        location: 'Test Location',
        ip: '192.168.1.100',
        port: 1080,
        active: true,
        uptime: 95
      }
      
      const createV2RayFallback = (service as any).createV2RayFallback.bind(service)
      const tunnel = await createV2RayFallback(mockNode)
      
      expect(tunnel).toBeDefined()
      expect(typeof tunnel.send).toBe('function')
      expect(typeof tunnel.close).toBe('function')
      
      console.log('✅ V2Ray fallback test passed')
    })
  })

  describe('Killswitch Protection', () => {
    it('should block requests when killswitch enabled and no connection', async () => {
      // Enable killswitch
      service.enableKillSwitch()
      
      // Ensure no active connection
      ;(service as any).activeConnection = null
      
      // Should throw error for blocked request
      await expect(service.routeRequest('https://example.com')).rejects.toThrow('Killswitch blocked request')
      
      console.log('✅ Killswitch protection test passed')
    })

    it('should allow requests when secure connection active', async () => {
      // Enable killswitch
      service.enableKillSwitch()
      
      // Mock active connection
      ;(service as any).activeConnection = {
        connected: true,
        nodeId: 'test-node',
        publicIP: '203.0.113.1',
        privateIP: '10.0.0.1',
        dnsSuffix: '.privachain.local',
        bytesUp: 0,
        bytesDown: 0,
        connectionTime: Date.now(),
        lastPing: Date.now()
      }
      
      // Mock successful response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ success: true })
      })
      
      // Should not throw error
      const response = await service.routeRequest('https://example.com')
      expect(response.ok).toBe(true)
      
      console.log('✅ Killswitch bypass test passed')
    })
  })

  describe('DNS over HTTPS', () => {
    it('should resolve domains via DoH providers', async () => {
      // Mock successful DoH response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Answer: [
            { data: '93.184.216.34' },
            { data: '2606:2800:220:1:248:1893:25c8:1946' }
          ]
        })
      })
      
      const ips = await service.resolveDNS('example.com')
      expect(ips).toHaveLength(2)
      expect(ips[0]).toBe('93.184.216.34')
      
      console.log('✅ DNS over HTTPS test passed')
    })
  })

  describe('Integration Test', () => {
    it('should establish end-to-end DPI-resistant connection', async () => {
      console.log('🧪 Starting comprehensive DPI bypass test...')
      
      // 1. Initialize service with DPI bypass
      await service.initialize()
      
      // 2. Enable killswitch for maximum security
      service.enableKillSwitch()
      
      // 3. Create auto-selected proxy chain
      await service.createProxyChain()
      
      // 4. Test traffic obfuscation
      const testData = new TextEncoder().encode('libp2p-peer-discovery-message')
      const obfuscateTraffic = (service as any).obfuscateTraffic.bind(service)
      const obfuscated = obfuscateTraffic(testData)
      
      // 5. Verify DPI evasion
      const obfuscatedText = new TextDecoder().decode(obfuscated)
      expect(obfuscatedText).not.toMatch(/libp2p|peer|discovery/i)
      
      // 6. Mock successful proxied request
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({'x-proxied': 'true'})
      })
      
      // 7. Test routing through obfuscated chain
      const proxyChain = service.getProxyChain()
      expect(proxyChain).toBeDefined()
      expect(proxyChain?.obfuscation).toBe(true)
      
      console.log('🎉 End-to-end DPI bypass test completed successfully!')
    })
  })
})

// Export test function for manual execution
export async function testDPIBypass(): Promise<boolean> {
  try {
    console.log('🔒 Testing DPI Bypass Functionality...')
    
    // Initialize service
    await proxyVPN.initialize()
    
    // Test traffic obfuscation
    const testPattern = new Uint8Array([/* IPFS packet signature */])
    const obfuscateTraffic = (proxyVPN as any).obfuscateTraffic.bind(proxyVPN)
    const obfuscated = obfuscateTraffic(testPattern)
    
    // Verify obfuscation
    const isObfuscated = !testPattern.every((byte, i) => byte === obfuscated[i])
    if (!isObfuscated) {
      throw new Error('Traffic obfuscation failed')
    }
    
    console.log('✅ DPI bypass test passed!')
    return true
    
  } catch (error) {
    console.error('❌ DPI bypass test failed:', error)
    return false
  }
}