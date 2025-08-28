#!/usr/bin/env ts-node

/**
 * Simplified E2E Encryption Test
 * 
 * Tests basic encryption/decryption within a single service
 */

import { getE2EService } from '../src/services/e2eEncryption'

console.log('🔒 Testing E2E Encryption Service (Simplified)...\n')

async function testSimpleE2E() {
  try {
    console.log('1. 🔧 Initializing E2E service...')
    
    const service = getE2EService('test-user')
    await service.initialize()
    
    console.log('✅ E2E service initialized')

    console.log('\n2. 🔑 Testing key bundle generation...')
    
    const keyBundle = await service.generateKeyBundle()
    
    console.log('✅ Key bundle generated')
    console.log(`   Identity key: ${keyBundle.identityKey.length} bytes`)
    console.log(`   Ephemeral key: ${keyBundle.ephemeralKey.length} bytes`)
    console.log(`   Signature: ${keyBundle.signature.length} bytes`)

    console.log('\n3. 🤝 Testing session establishment...')
    
    // Create a self-session for testing
    const sessionId = await service.establishSession('test-contact', keyBundle)
    
    console.log('✅ Session established')
    console.log(`   Session ID: ${sessionId}`)

    console.log('\n4. 🔐 Testing message encryption/decryption...')
    
    const testMessage = 'Hello! This is a test message.'
    console.log(`   Original: "${testMessage}"`)
    
    // Encrypt message
    const encryptedMessage = await service.encryptMessage(sessionId, testMessage)
    console.log(`   Encrypted: ${encryptedMessage.ciphertext.length} bytes`)
    
    // Decrypt message  
    const decryptedBytes = await service.decryptMessage(sessionId, encryptedMessage)
    const decryptedText = new TextDecoder().decode(decryptedBytes)
    console.log(`   Decrypted: "${decryptedText}"`)
    
    if (decryptedText === testMessage) {
      console.log('   ✅ Message encryption/decryption successful')
    } else {
      console.log('   ❌ Message encryption/decryption failed')
      return false
    }

    console.log('\n5. 📊 Testing session management...')
    
    const activeSessions = service.getActiveSessions()
    console.log(`✅ Active sessions: ${activeSessions.length}`)
    
    const contactSession = service.getSessionByContact('test-contact')
    if (contactSession) {
      console.log('✅ Session lookup working correctly')
    } else {
      console.log('❌ Session lookup failed')
      return false
    }

    console.log('\n🎉 Simple E2E encryption test passed!')
    return true
    
  } catch (error) {
    console.error('❌ E2E encryption test failed:', error)
    return false
  }
}

// Run the test
testSimpleE2E().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('Fatal error running E2E tests:', error)
  process.exit(1)
})