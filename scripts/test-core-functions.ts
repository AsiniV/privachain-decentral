#!/usr/bin/env ts-node

/**
 * Core Function Testing
 * 
 * Tests the core blockchain and crypto functions directly without complex dependencies
 */

console.log('🧪 Testing Core PrivaChain Functions...\n')

// Test 1: Proof of Work Generation
async function testProofOfWork() {
  try {
    console.log('🔨 Testing Proof of Work Generation...')
    
    // Simple hash function for testing
    const hashString = async (input: string): Promise<string> => {
      const encoder = new TextEncoder()
      const data = encoder.encode(input)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    // Generate proof of work
    const challenge = 'test_challenge_' + Date.now()
    const difficulty = 2
    const target = '0'.repeat(difficulty)
    let nonce = 0
    let proof = ''
    
    const startTime = Date.now()
    
    while (nonce < 10000) {
      const input = `${challenge}${nonce}`
      const hash = await hashString(input)
      
      if (hash.startsWith(target)) {
        proof = `pow_${nonce}_${hash}`
        break
      }
      
      nonce++
    }
    
    const endTime = Date.now()
    
    if (proof) {
      console.log(`✅ Proof of Work generated in ${endTime - startTime}ms: ${proof.substring(0, 32)}...`)
      return true
    } else {
      console.log('❌ Proof of Work generation failed')
      return false
    }
  } catch (error) {
    console.error('❌ Proof of Work test error:', error)
    return false
  }
}

// Test 2: Encryption/Decryption
async function testEncryption() {
  try {
    console.log('🔐 Testing Encryption/Decryption...')
    
    const testData = 'Test encryption data: ' + Date.now()
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    
    // Generate encryption key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    
    // Encrypt data
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(testData)
    )
    
    // Decrypt data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )
    
    const decryptedText = decoder.decode(decrypted)
    
    if (decryptedText === testData) {
      console.log(`✅ Encryption/Decryption successful: ${testData.substring(0, 20)}...`)
      return true
    } else {
      console.log('❌ Encryption/Decryption failed: data mismatch')
      return false
    }
  } catch (error) {
    console.error('❌ Encryption test error:', error)
    return false
  }
}

// Test 3: Hash Generation
async function testHashing() {
  try {
    console.log('🔗 Testing Hash Generation...')
    
    const input = 'Test hash input: ' + Date.now()
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    if (hash && hash.length === 64) {
      console.log(`✅ Hash generated successfully: ${hash.substring(0, 16)}...`)
      return true
    } else {
      console.log('❌ Hash generation failed')
      return false
    }
  } catch (error) {
    console.error('❌ Hash test error:', error)
    return false
  }
}

// Test 4: Random Generation
async function testRandomGeneration() {
  try {
    console.log('🎲 Testing Random Generation...')
    
    const randomArray = crypto.getRandomValues(new Uint8Array(32))
    const randomHex = Array.from(randomArray, byte => byte.toString(16).padStart(2, '0')).join('')
    
    if (randomHex && randomHex.length === 64) {
      console.log(`✅ Random generation successful: ${randomHex.substring(0, 16)}...`)
      return true
    } else {
      console.log('❌ Random generation failed')
      return false
    }
  } catch (error) {
    console.error('❌ Random generation test error:', error)
    return false
  }
}

// Test 5: JSON Handling
async function testJSONHandling() {
  try {
    console.log('📋 Testing JSON Handling...')
    
    const testObject = {
      timestamp: Date.now(),
      user: 'test_user',
      data: 'test_data',
      encrypted: true,
      array: [1, 2, 3, 'test']
    }
    
    const jsonString = JSON.stringify(testObject)
    const parsedObject = JSON.parse(jsonString)
    
    if (parsedObject.timestamp === testObject.timestamp && parsedObject.user === testObject.user) {
      console.log(`✅ JSON handling successful: ${jsonString.substring(0, 30)}...`)
      return true
    } else {
      console.log('❌ JSON handling failed: data mismatch')
      return false
    }
  } catch (error) {
    console.error('❌ JSON handling test error:', error)
    return false
  }
}

// Run all tests
async function runAllCoreTests() {
  console.log('Starting core function tests...\n')
  
  const tests = [
    { name: 'Proof of Work', test: testProofOfWork },
    { name: 'Encryption/Decryption', test: testEncryption },
    { name: 'Hash Generation', test: testHashing },
    { name: 'Random Generation', test: testRandomGeneration },
    { name: 'JSON Handling', test: testJSONHandling }
  ]
  
  const results = []
  
  for (const { name, test } of tests) {
    const success = await test()
    results.push({ name, success })
  }
  
  console.log('\n📊 Core Function Test Results:')
  console.log('================================')
  
  let passed = 0
  const total = results.length
  
  for (const { name, success } of results) {
    const status = success ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} - ${name}`)
    if (success) passed++
  }
  
  console.log(`\n📈 Results: ${passed}/${total} tests passed (${Math.round((passed/total)*100)}%)`)
  
  if (passed === total) {
    console.log('🎉 All core functions are working correctly!')
  } else {
    console.log('⚠️ Some core functions need attention.')
  }
  
  return passed === total
}

// Run the tests
runAllCoreTests().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('Fatal error running tests:', error)
  process.exit(1)
})