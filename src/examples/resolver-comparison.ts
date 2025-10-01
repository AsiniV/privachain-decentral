// Comparison example showing both legacy and unified resolvers
// This demonstrates how to migrate from content-resolution.ts to unifiedResolver.ts

import { contentResolver } from '../services/content-resolution'
import { initResolver, resolveUrl } from '../services/unifiedResolver'

/**
 * Example: Using legacy content resolver
 */
export async function demonstrateLegacyResolver() {
  console.log('📦 Legacy Content Resolver Example')
  console.log('─'.repeat(50))
  
  try {
    // Initialize with blockchain connection (optional)
    await contentResolver.initialize()
    
    // Resolve IPFS content
    const ipfsContent = await contentResolver.resolveContent('ipfs://QmExample')
    console.log('Legacy IPFS result:', {
      size: ipfsContent.content.byteLength,
      type: ipfsContent.contentType,
      source: ipfsContent.source
    })
    
    // Resolve .priva domain (legacy format)
    // Note: Legacy uses .priva, new uses .prv
    // const privaContent = await contentResolver.resolveContent('https://example.priva/path')
    
  } catch (error) {
    console.log('Legacy resolver example (expected to fail without network):', error.message)
  }
}

/**
 * Example: Using new unified resolver
 */
export async function demonstrateUnifiedResolver() {
  console.log('\n🚀 Unified Resolver Example')
  console.log('─'.repeat(50))
  
  try {
    // Initialize (no blockchain connection needed)
    await initResolver()
    
    // Resolve IPFS content
    const ipfsResult = await resolveUrl('ipfs://QmExample')
    console.log('Unified IPFS result:', {
      size: ipfsResult.bytes.length,
      type: ipfsResult.contentType,
      source: ipfsResult.source
    })
    
    // Resolve .prv domain (new format)
    const prvResult = await resolveUrl('https://example.prv/path')
    console.log('Unified .prv result:', {
      size: prvResult.bytes.length,
      type: prvResult.contentType,
      source: prvResult.source
    })
    
  } catch (error) {
    console.log('Unified resolver example (expected to fail without network):', error.message)
  }
}

/**
 * Migration Guide
 */
export function showMigrationGuide() {
  console.log('\n📚 Migration Guide: Legacy → Unified Resolver')
  console.log('═'.repeat(50))
  
  const examples = [
    {
      title: 'Initialization',
      legacy: `
// Legacy: Requires blockchain connection
await contentResolver.initialize(blockchain)`,
      unified: `
// Unified: Auto-detects environment
await initResolver()`
    },
    {
      title: 'Resolve IPFS',
      legacy: `
// Legacy: Returns complex object
const result = await contentResolver.resolveContent('ipfs://CID')
const data = result.content // ArrayBuffer
const type = result.contentType`,
      unified: `
// Unified: Returns simple object
const result = await resolveUrl('ipfs://CID')
const data = result.bytes // Uint8Array
const type = result.contentType`
    },
    {
      title: 'Resolve Domain',
      legacy: `
// Legacy: Uses .priva domains
const result = await contentResolver.resolveContent('https://example.priva/')`,
      unified: `
// Unified: Uses .prv domains
const result = await resolveUrl('https://example.prv/')`
    },
    {
      title: 'Resolve HTTP',
      legacy: `
// Legacy: Via DPI bypass service
const result = await contentResolver.resolveContent('https://example.com/')`,
      unified: `
// Unified: Via DPI bypass service
const result = await resolveUrl('https://example.com/')`
    }
  ]
  
  examples.forEach(({ title, legacy, unified }) => {
    console.log(`\n${title}:`)
    console.log('  Legacy:', legacy.trim())
    console.log('  Unified:', unified.trim())
  })
}

/**
 * Feature Comparison
 */
export function showFeatureComparison() {
  console.log('\n🔍 Feature Comparison')
  console.log('═'.repeat(50))
  
  const features = [
    ['Feature', 'Legacy', 'Unified'],
    ['─'.repeat(20), '─'.repeat(15), '─'.repeat(15)],
    ['IPFS Integration', 'ipfsStorage', 'Helia direct'],
    ['Domain Format', '.priva', '.prv'],
    ['Desktop Support', 'No', 'Yes (Tauri)'],
    ['Caching', 'Built-in', 'None (simpler)'],
    ['Init Required', 'Yes', 'Optional'],
    ['Blockchain Dep', 'Required', 'Optional'],
    ['Content Type', 'Detected', 'Detected'],
    ['DPI Bypass', 'Yes', 'Yes'],
    ['Return Type', 'ArrayBuffer', 'Uint8Array'],
  ]
  
  features.forEach(row => {
    console.log(row.map(cell => cell.padEnd(20)).join(' | '))
  })
}

/**
 * When to use which resolver
 */
export function showUsageRecommendations() {
  console.log('\n💡 Usage Recommendations')
  console.log('═'.repeat(50))
  
  console.log('\nUse LEGACY resolver when:')
  console.log('  ✓ Working with existing .priva domains')
  console.log('  ✓ Need built-in caching')
  console.log('  ✓ Require blockchain integration')
  console.log('  ✓ Using encrypted content with keys')
  
  console.log('\nUse UNIFIED resolver when:')
  console.log('  ✓ Building new features')
  console.log('  ✓ Working with .prv domains')
  console.log('  ✓ Need desktop (Tauri) support')
  console.log('  ✓ Want simpler, lighter implementation')
  console.log('  ✓ Direct Helia integration preferred')
}

/**
 * Run all comparisons
 */
export async function runAllComparisons() {
  console.log('🎬 Content Resolver Comparison & Migration Guide')
  console.log('═'.repeat(80))
  
  await demonstrateLegacyResolver()
  await demonstrateUnifiedResolver()
  showMigrationGuide()
  showFeatureComparison()
  showUsageRecommendations()
  
  console.log('\n✅ Comparison complete!')
}

// For running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllComparisons().catch(console.error)
}
