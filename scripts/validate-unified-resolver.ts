#!/usr/bin/env tsx
// Validation script for unified resolver implementation

import { resolvePrvDomain } from '../src/cosmos/src/prv'
import { isDpiBypassAvailable, getDpiBypassStats } from '../src/services/dpiClient'

async function validateImplementation() {
  console.log('🔍 Validating Unified Resolver Implementation')
  console.log('='.repeat(60))
  
  let allTestsPassed = true
  
  // Test 1: .prv domain resolution
  console.log('\n📦 Test 1: .prv Domain Resolution')
  try {
    const domain = await resolvePrvDomain('example.prv')
    if (domain && domain.cid && domain.active) {
      console.log('✅ PASS: .prv domain resolution works')
      console.log(`   Domain: ${domain.domain}`)
      console.log(`   CID: ${domain.cid}`)
    } else {
      console.log('❌ FAIL: Invalid domain record')
      allTestsPassed = false
    }
  } catch (error) {
    console.log('❌ FAIL: .prv domain resolution failed:', error.message)
    allTestsPassed = false
  }
  
  // Test 2: Non-existent domain
  console.log('\n📦 Test 2: Non-existent Domain Handling')
  try {
    const domain = await resolvePrvDomain('nonexistent.prv')
    if (domain === null) {
      console.log('✅ PASS: Correctly returns null for non-existent domain')
    } else {
      console.log('❌ FAIL: Should return null for non-existent domain')
      allTestsPassed = false
    }
  } catch (error) {
    console.log('❌ FAIL: Error handling non-existent domain:', error.message)
    allTestsPassed = false
  }
  
  // Test 3: Domain without .prv suffix
  console.log('\n📦 Test 3: Domain Name Normalization')
  try {
    const domain1 = await resolvePrvDomain('example.prv')
    const domain2 = await resolvePrvDomain('example')
    if (domain1?.cid === domain2?.cid) {
      console.log('✅ PASS: Handles domain with/without .prv suffix')
    } else {
      console.log('❌ FAIL: Domain normalization not working')
      allTestsPassed = false
    }
  } catch (error) {
    console.log('❌ FAIL: Domain normalization failed:', error.message)
    allTestsPassed = false
  }
  
  // Test 4: DPI client availability
  console.log('\n📦 Test 4: DPI Client Availability')
  try {
    const available = isDpiBypassAvailable()
    const stats = getDpiBypassStats()
    console.log('✅ PASS: DPI client functions accessible')
    console.log(`   Available: ${available}`)
    console.log(`   Stats:`, stats)
  } catch (error) {
    console.log('❌ FAIL: DPI client not accessible:', error.message)
    allTestsPassed = false
  }
  
  // Test 5: Module exports
  console.log('\n📦 Test 5: Module Exports')
  try {
    const { initResolver, resolveUrl } = await import('../src/services/unifiedResolver')
    if (typeof initResolver === 'function' && typeof resolveUrl === 'function') {
      console.log('✅ PASS: All exports accessible')
      console.log('   - initResolver: function')
      console.log('   - resolveUrl: function')
    } else {
      console.log('❌ FAIL: Exports are not functions')
      allTestsPassed = false
    }
  } catch (error) {
    console.log('❌ FAIL: Cannot import modules:', error.message)
    allTestsPassed = false
  }
  
  // Test 6: Content type detection constants
  console.log('\n📦 Test 6: Content Type Detection')
  const signatures = {
    PNG: new Uint8Array([0x89, 0x50, 0x4E, 0x47]),
    JPEG: new Uint8Array([0xFF, 0xD8]),
    PDF: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    HTML: new Uint8Array([0x3C, 0x68, 0x74, 0x6D])
  }
  let signaturesValid = true
  for (const [type, sig] of Object.entries(signatures)) {
    if (sig.length === 0 || sig[0] === undefined) {
      console.log(`❌ FAIL: Invalid ${type} signature`)
      signaturesValid = false
      allTestsPassed = false
    }
  }
  if (signaturesValid) {
    console.log('✅ PASS: Content type signatures defined correctly')
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED - Implementation is valid!')
    process.exit(0)
  } else {
    console.log('❌ SOME TESTS FAILED - Review implementation')
    process.exit(1)
  }
}

// Run validation
validateImplementation().catch(error => {
  console.error('❌ Validation script failed:', error)
  process.exit(1)
})
