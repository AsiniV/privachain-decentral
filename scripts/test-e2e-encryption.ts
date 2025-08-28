#!/usr/bin/env ts-node

/**
 * Test the new E2E Encryption Service
 * 
 * Tests the Double Ratchet implementation and session management
 */

import { getE2EService } from '../src/services/e2eEncryption'

console.log('🔒 Testing E2E Encryption Service...\n')

async function testE2EEncryption() {
  try {
    console.log('1. 🔧 Initializing E2E services...')
    
    // Initialize services for two users
    const aliceService = getE2EService('alice@privachain.test')
    const bobService = getE2EService('bob@privachain.test')
    
    await aliceService.initialize()
    await bobService.initialize()
    
    console.log('✅ E2E services initialized')

    console.log('\n2. 🔑 Testing key bundle generation...')
    
    // Generate key bundles
    const aliceKeyBundle = await aliceService.generateKeyBundle()
    const bobKeyBundle = await bobService.generateKeyBundle()
    
    console.log('✅ Key bundles generated')
    console.log(`   Alice identity key: ${aliceKeyBundle.identityKey.length} bytes`)
    console.log(`   Bob identity key: ${bobKeyBundle.identityKey.length} bytes`)

    console.log('\n3. 🤝 Testing session establishment...')
    
    // Establish sessions (simulate key exchange)
    const aliceSessionId = await aliceService.establishSession('bob@privachain.test', bobKeyBundle)
    const bobSessionId = await bobService.establishSession('alice@privachain.test', aliceKeyBundle)
    
    console.log('✅ Sessions established')
    console.log(`   Alice session: ${aliceSessionId}`)
    console.log(`   Bob session: ${bobSessionId}`)

    console.log('\n4. 🔐 Testing message encryption/decryption...')
    
    // Test messages
    const testMessages = [
      'Hello Bob! This is a secure message from Alice.',
      'Hey Alice! This E2E encryption is working great!',
      'Testing forward secrecy with multiple messages...',
      'Each message should have a different derived key.'
    ]

    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i]
      const sender = i % 2 === 0 ? 'Alice' : 'Bob'
      const senderService = i % 2 === 0 ? aliceService : bobService
      const receiverService = i % 2 === 0 ? bobService : aliceService
      const sessionId = i % 2 === 0 ? aliceSessionId : bobSessionId
      
      console.log(`\n   Testing message ${i + 1} from ${sender}:`)
      console.log(`   Original: "${message}"`)
      
      // Encrypt message
      const encryptedMessage = await senderService.encryptMessage(sessionId, message)
      console.log(`   Encrypted: ${encryptedMessage.ciphertext.length} bytes`)
      
      // Decrypt message  
      const decryptedBytes = await receiverService.decryptMessage(sessionId, encryptedMessage)
      const decryptedText = new TextDecoder().decode(decryptedBytes)
      console.log(`   Decrypted: "${decryptedText}"`)
      
      if (decryptedText === message) {
        console.log('   ✅ Message encryption/decryption successful')
      } else {
        console.log('   ❌ Message encryption/decryption failed')
        return false
      }
    }

    console.log('\n5. 📊 Testing session management...')
    
    // Check active sessions
    const aliceSessions = aliceService.getActiveSessions()
    const bobSessions = bobService.getActiveSessions()
    
    console.log(`✅ Alice has ${aliceSessions.length} active session(s)`)
    console.log(`✅ Bob has ${bobSessions.length} active session(s)`)
    
    // Test session lookup
    const aliceSessionForBob = aliceService.getSessionByContact('bob@privachain.test')
    const bobSessionForAlice = bobService.getSessionByContact('alice@privachain.test')
    
    if (aliceSessionForBob && bobSessionForAlice) {
      console.log('✅ Session lookup working correctly')
    } else {
      console.log('❌ Session lookup failed')
      return false
    }

    console.log('\n6. 🔄 Testing session closure...')
    
    // Close sessions
    await aliceService.closeSession(aliceSessionId)
    await bobService.closeSession(bobSessionId)
    
    const aliceActiveAfterClose = aliceService.getActiveSessions()
    const bobActiveAfterClose = bobService.getActiveSessions()
    
    console.log(`✅ Alice active sessions after close: ${aliceActiveAfterClose.length}`)
    console.log(`✅ Bob active sessions after close: ${bobActiveAfterClose.length}`)

    console.log('\n🎉 All E2E encryption tests passed!')
    return true
    
  } catch (error) {
    console.error('❌ E2E encryption test failed:', error)
    return false
  }
}

// Run the test
testE2EEncryption().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('Fatal error running E2E tests:', error)
  process.exit(1)
})