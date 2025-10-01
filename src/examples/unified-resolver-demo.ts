// Demo/Example usage of Unified Resolver
// This shows how to use the new unified content resolver with IPFS, .prv domains, and HTTP(S)

import { initResolver, resolveUrl } from '../services/unifiedResolver'
import { resolvePrvDomain } from '../cosmos/src/prv'
import { dpiFetch } from '../services/dpiClient'

/**
 * Example: Initialize and use the unified resolver
 */
export async function demonstrateUnifiedResolver() {
  console.log('🚀 Starting Unified Resolver Demonstration')
  
  try {
    // Initialize the resolver (only needed once)
    await initResolver()
    console.log('✅ Unified resolver initialized')
    
    // Example 1: Resolve IPFS content
    console.log('\n📦 Example 1: IPFS Resolution')
    try {
      const ipfsResult = await resolveUrl('ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')
      console.log(`✅ Resolved IPFS content:`)
      console.log(`   - Size: ${ipfsResult.bytes.length} bytes`)
      console.log(`   - Content Type: ${ipfsResult.contentType}`)
      console.log(`   - Source: ${ipfsResult.source}`)
    } catch (error) {
      console.log(`⚠️ IPFS resolution may fail without network: ${error.message}`)
    }
    
    // Example 2: Resolve .prv domain
    console.log('\n🌐 Example 2: .prv Domain Resolution')
    try {
      const prvResult = await resolveUrl('https://example.prv/content')
      console.log(`✅ Resolved .prv domain content:`)
      console.log(`   - Size: ${prvResult.bytes.length} bytes`)
      console.log(`   - Content Type: ${prvResult.contentType}`)
      console.log(`   - Source: ${prvResult.source}`)
    } catch (error) {
      console.log(`⚠️ .prv domain resolution may fail without network: ${error.message}`)
    }
    
    // Example 3: Traditional HTTP(S) with DPI bypass
    console.log('\n🔒 Example 3: HTTP(S) with DPI Bypass')
    try {
      const httpResult = await resolveUrl('https://httpbin.org/json')
      console.log(`✅ Resolved HTTP content:`)
      console.log(`   - Size: ${httpResult.bytes.length} bytes`)
      console.log(`   - Content Type: ${httpResult.contentType}`)
      console.log(`   - Source: ${httpResult.source}`)
    } catch (error) {
      console.log(`⚠️ HTTP resolution may fail without network: ${error.message}`)
    }
    
  } catch (error) {
    console.error('❌ Unified Resolver demo failed:', error)
  }
}

/**
 * Example: Direct .prv domain resolution
 */
export async function demonstratePrvDomainResolution() {
  console.log('\n🔍 .prv Domain Resolution Examples')
  
  // Example domains (using mock data)
  const domains = ['example.prv', 'test.prv', 'unknown.prv']
  
  for (const domain of domains) {
    const record = await resolvePrvDomain(domain)
    if (record) {
      console.log(`✅ ${domain}:`)
      console.log(`   - CID: ${record.cid}`)
      console.log(`   - Owner: ${record.owner}`)
      console.log(`   - Active: ${record.active}`)
      console.log(`   - Expires: ${new Date(record.expires).toISOString()}`)
    } else {
      console.log(`❌ ${domain}: Not found`)
    }
  }
}

/**
 * Example: DPI bypass for HTTP requests
 */
export async function demonstrateDpiBypass() {
  console.log('\n🔐 DPI Bypass Examples')
  
  try {
    // Try to fetch with DPI bypass
    try {
      const response = await dpiFetch('https://httpbin.org/user-agent')
      const buffer = await response.arrayBuffer()
      const decoder = new TextDecoder()
      const data = decoder.decode(buffer)
      console.log('✅ DPI bypass fetch successful')
      console.log(`   Response status: ${response.status}`)
      console.log(`   Response: ${data.substring(0, 100)}...`)
    } catch (error) {
      console.log(`⚠️ DPI bypass fetch may fail without network: ${error.message}`)
    }
    
  } catch (error) {
    console.error('❌ DPI bypass demo failed:', error)
  }
}

/**
 * Example: Content type detection
 */
export async function demonstrateContentTypeDetection() {
  console.log('\n📋 Content Type Detection Examples')
  
  const testData = [
    { name: 'PNG', bytes: new Uint8Array([0x89, 0x50, 0x4E, 0x47]), expected: 'image/png' },
    { name: 'JPEG', bytes: new Uint8Array([0xFF, 0xD8, 0xFF]), expected: 'image/jpeg' },
    { name: 'PDF', bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]), expected: 'application/pdf' },
    { name: 'HTML', bytes: new Uint8Array([0x3C, 0x68, 0x74, 0x6D, 0x6C]), expected: 'text/html' },
    { name: 'Plain Text', bytes: new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]), expected: 'text/plain' },
  ]
  
  console.log('Content type detection is handled automatically by resolveUrl()')
  testData.forEach(test => {
    console.log(`   ${test.name}: Expected ${test.expected}`)
  })
}

/**
 * Run all demonstrations
 */
export async function runAllDemonstrations() {
  console.log('🎬 Starting Complete Unified Resolver Demonstration')
  console.log('=' .repeat(80))
  
  await demonstrateUnifiedResolver()
  console.log()
  
  await demonstratePrvDomainResolution()
  console.log()
  
  await demonstrateDpiBypass()
  console.log()
  
  await demonstrateContentTypeDetection()
  console.log()
  
  console.log('✅ All demonstrations completed!')
}

// Export for use in other parts of the application
export { initResolver, resolveUrl, resolvePrvDomain, dpiFetch }

// For running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDemonstrations().catch(console.error)
}
