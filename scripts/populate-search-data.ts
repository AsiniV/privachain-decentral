/**
 * PrivaChain Search Data Population Script
 * 
 * Creates comprehensive mock data for the OrbitDB search engine as specified
 * in the technical specification. Generates 1000+ mock entries including:
 * - 500 encrypted emails
 * - 300 .prv domains
 * - 200 video call logs
 * - Plus files, identities, and messages
 * 
 * Usage:
 * npm run populate-search -- --num=1000 --chain-id=privachain-testnet
 * ts-node scripts/populate-search-data.ts --num=1000
 */

import { orbitDBIndexing, SearchDocument } from '../src/services/orbitdb'
import crypto from 'crypto'

interface PopulationOptions {
  numEntries: number
  chainId?: string
  verbose?: boolean
}

// Mock data generators
const EMAIL_SUBJECTS = [
  'Privacy Tip: Protecting Your Digital Identity',
  'Anonymous Communication Best Practices',
  'Quantum Encryption Implementation Details',
  'Zero-Knowledge Proof Workshop Invitation',
  'Whistleblower Protection Guidelines',
  'Secure Email Protocol Update',
  'PrivaChain Network Status Report',
  'Decentralized Identity Verification',
  'Anti-Surveillance Techniques',
  'Cryptographic Key Management',
  'Blockchain Privacy Solutions',
  'Anonymous Domain Registration',
  'Secure Video Calling Setup',
  'IPFS Storage Best Practices',
  'Onion Routing Configuration',
  'Mixnet Integration Guide',
  'Hardware Security Module Setup',
  'Post-Quantum Cryptography Update',
  'Tor Network Optimization',
  'Signal Protocol Implementation'
]

const DOMAIN_NAMES = [
  'whistleblower.prv', 'journalist.prv', 'activist.prv', 'secure.prv',
  'anonymous.prv', 'private.prv', 'encrypted.prv', 'freedom.prv',
  'liberty.prv', 'truth.prv', 'democracy.prv', 'human-rights.prv',
  'transparency.prv', 'accountability.prv', 'justice.prv', 'equality.prv',
  'privacy.prv', 'security.prv', 'crypto.prv', 'quantum.prv',
  'blockchain.prv', 'decentral.prv', 'p2p.prv', 'mesh.prv',
  'onion.prv', 'tor.prv', 'mixnet.prv', 'i2p.prv',
  'zk-proof.prv', 'zero-knowledge.prv', 'snark.prv', 'stark.prv',
  'research.prv', 'academia.prv', 'science.prv', 'tech.prv',
  'innovation.prv', 'future.prv', 'society.prv', 'community.prv'
]

const VIDEO_DESCRIPTIONS = [
  'Anonymous interview with corporate whistleblower',
  'Encrypted discussion on surveillance practices',
  'Privacy workshop: Digital rights overview',
  'Anonymous testimony about government overreach',
  'Cybersecurity expert panel discussion',
  'Digital privacy education session',
  'Anonymous source protection meeting',
  'Quantum cryptography demonstration',
  'Blockchain privacy technology review',
  'Anonymous journalist safety briefing'
]

const KEYWORDS_POOL = [
  'privacy', 'security', 'encryption', 'anonymous', 'quantum', 'blockchain',
  'zero-knowledge', 'zk-proof', 'onion-routing', 'tor', 'vpn', 'mixnet',
  'cryptography', 'surveillance', 'digital-rights', 'freedom', 'liberty',
  'democracy', 'transparency', 'accountability', 'whistleblower', 'journalism',
  'activism', 'human-rights', 'civil-liberties', 'censorship', 'resistance',
  'p2p', 'decentralized', 'mesh-network', 'ipfs', 'libp2p', 'orbitdb',
  'cosmos', 'tendermint', 'cosmwasm', 'smart-contracts', 'dao', 'governance',
  'token', 'staking', 'validator', 'consensus', 'byzantine-fault-tolerance',
  'post-quantum', 'crystals-kyber', 'dilithium', 'lattice-cryptography',
  'homomorphic-encryption', 'secure-multiparty-computation', 'threshold-cryptography'
]

const FILE_TYPES = [
  'technical-specification', 'security-audit', 'privacy-policy', 'user-guide',
  'api-documentation', 'research-paper', 'whitepaper', 'threat-model',
  'implementation-guide', 'security-analysis', 'cryptographic-proof',
  'academic-publication', 'conference-presentation', 'workshop-materials'
]

/**
 * Generate a random IPFS-like Content ID
 */
function generateCID(): string {
  const randomBytes = crypto.randomBytes(32)
  return 'Qm' + randomBytes.toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 44)
}

/**
 * Generate random keywords from the pool
 */
function generateKeywords(count: number = 5): string[] {
  const shuffled = KEYWORDS_POOL.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

/**
 * Generate a random .prv email address
 */
function generatePrivEmail(): string {
  const randomId = crypto.randomBytes(8).toString('hex')
  const domain = DOMAIN_NAMES[Math.floor(Math.random() * DOMAIN_NAMES.length)]
  return `user${randomId}@${domain}`
}

/**
 * Generate mock encrypted email documents
 */
function generateEmailDocuments(count: number): Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>[] {
  const emails: Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>[] = []
  
  for (let i = 0; i < count; i++) {
    const subject = EMAIL_SUBJECTS[Math.floor(Math.random() * EMAIL_SUBJECTS.length)]
    const keywords = generateKeywords(Math.floor(Math.random() * 3) + 3)
    const isHighPrivacy = Math.random() > 0.3 // 70% high privacy
    
    emails.push({
      type: 'email',
      title: subject,
      description: `Encrypted email: ${subject}`,
      content: `This is an encrypted email discussing ${keywords.join(', ')}. The content is fully encrypted using the Signal Protocol and stored on IPFS for maximum privacy and security.`,
      keywords,
      cid: generateCID(),
      source: generatePrivEmail(),
      encrypted: true,
      privacy: {
        anonymous: isHighPrivacy,
        zkProof: isHighPrivacy ? `zk_proof_${crypto.randomBytes(4).toString('hex')}` : undefined,
        onionRouted: isHighPrivacy
      },
      metadata: {
        category: 'email',
        priority: Math.random() > 0.7 ? 'high' : 'normal',
        attachments: Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0
      }
    })
  }
  
  return emails
}

/**
 * Generate mock .prv domain documents
 */
function generateDomainDocuments(count: number): Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>[] {
  const domains: Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>[] = []
  
  for (let i = 0; i < count; i++) {
    const domainName = DOMAIN_NAMES[Math.floor(Math.random() * DOMAIN_NAMES.length)]
    const keywords = generateKeywords(Math.floor(Math.random() * 4) + 2)
    const isVerified = Math.random() > 0.4 // 60% verified
    
    domains.push({
      type: 'domain',
      title: domainName,
      description: `Anonymous .prv domain for ${keywords.slice(0, 2).join(' and ')} communications`,
      content: `This .prv domain provides secure, anonymous communication services with zero-knowledge proof verification. Domain specializes in ${keywords.join(', ')}.`,
      keywords,
      cid: generateCID(),
      source: domainName,
      encrypted: true,
      privacy: {
        anonymous: true,
        zkProof: `zk_proof_${crypto.randomBytes(4).toString('hex')}`,
        onionRouted: Math.random() > 0.2 // 80% onion routed
      },
      metadata: {
        category: 'domain',
        verified: isVerified,
        registrationDate: Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000), // Up to 1 year ago
        renewalDate: Date.now() + Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000) // Up to 1 year ahead
      }
    })
  }
  
  return domains
}

/**
 * Generate mock video call documents
 */
function generateVideoDocuments(count: number): Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>[] {
  const videos: Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>[] = []
  
  for (let i = 0; i < count; i++) {
    const description = VIDEO_DESCRIPTIONS[Math.floor(Math.random() * VIDEO_DESCRIPTIONS.length)]
    const keywords = generateKeywords(Math.floor(Math.random() * 4) + 3)
    const duration = `${Math.floor(Math.random() * 120) + 5}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
    
    videos.push({
      type: 'video',
      title: `Anonymous Video Call: ${description}`,
      description,
      content: `Encrypted video call recording discussing ${keywords.join(', ')}. All participants maintained anonymity through ZK-proof identity verification.`,
      keywords,
      cid: generateCID(),
      source: 'video.secure.prv',
      encrypted: true,
      privacy: {
        anonymous: true,
        zkProof: `zk_proof_${crypto.randomBytes(4).toString('hex')}`,
        onionRouted: Math.random() > 0.1 // 90% onion routed
      },
      metadata: {
        category: 'media',
        duration,
        quality: ['720p', '1080p', '4K'][Math.floor(Math.random() * 3)],
        participants: Math.floor(Math.random() * 8) + 2,
        recordingConsent: true
      }
    })
  }
  
  return videos
}

/**
 * Generate mock file documents
 */
function generateFileDocuments(count: number): Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>[] {
  const files: Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>[] = []
  
  for (let i = 0; i < count; i++) {
    const fileType = FILE_TYPES[Math.floor(Math.random() * FILE_TYPES.length)]
    const keywords = generateKeywords(Math.floor(Math.random() * 5) + 3)
    const isPublic = Math.random() > 0.6 // 40% public files
    
    files.push({
      type: 'file',
      title: `${fileType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}: ${keywords.slice(0, 2).join(' & ')}`,
      description: `Technical document covering ${keywords.slice(0, 3).join(', ')} in the context of privacy-preserving systems`,
      content: `This document provides comprehensive coverage of ${keywords.join(', ')}. It includes technical specifications, implementation details, and security considerations for privacy-preserving communication systems.`,
      keywords,
      cid: generateCID(),
      source: isPublic ? `ipfs://${generateCID()}` : generatePrivEmail(),
      encrypted: !isPublic,
      privacy: {
        anonymous: !isPublic,
        zkProof: !isPublic ? `zk_proof_${crypto.randomBytes(4).toString('hex')}` : undefined,
        onionRouted: !isPublic && Math.random() > 0.3
      },
      metadata: {
        category: 'documentation',
        public: isPublic,
        fileType: fileType,
        size: `${Math.floor(Math.random() * 10000) + 100}KB`,
        version: `v${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}`
      }
    })
  }
  
  return files
}

/**
 * Generate mock identity documents
 */
function generateIdentityDocuments(count: number): Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>[] {
  const identities: Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>[] = []
  
  for (let i = 0; i < count; i++) {
    const keywords = ['identity', 'zk-proof', 'anonymous', 'verified', ...generateKeywords(2)]
    const credentialType = ['journalist', 'researcher', 'activist', 'whistleblower', 'expert'][Math.floor(Math.random() * 5)]
    
    identities.push({
      type: 'identity',
      title: `Anonymous Verified ${credentialType.charAt(0).toUpperCase() + credentialType.slice(1)} Identity`,
      description: `Zero-knowledge proof verified anonymous identity certificate for ${credentialType}`,
      content: `This identity certificate uses ZK-SNARKs to verify authenticity and credentials without revealing personal information. Verified for ${credentialType} activities in privacy-preserving communications.`,
      keywords,
      cid: generateCID(),
      source: 'identity.ceramic.network',
      encrypted: true,
      privacy: {
        anonymous: true,
        zkProof: `zk_proof_${crypto.randomBytes(4).toString('hex')}`,
        onionRouted: Math.random() > 0.5
      },
      metadata: {
        category: 'identity',
        verified: true,
        credentialType,
        issuer: 'PrivaChain ZK Identity System',
        validUntil: Date.now() + (Math.floor(Math.random() * 365) + 30) * 24 * 60 * 60 * 1000 // 30 days to 1 year
      }
    })
  }
  
  return identities
}

/**
 * Generate mock message documents
 */
function generateMessageDocuments(count: number): Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>[] {
  const messages: Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>[] = []
  
  for (let i = 0; i < count; i++) {
    const keywords = generateKeywords(Math.floor(Math.random() * 4) + 2)
    const isGroupMessage = Math.random() > 0.7 // 30% group messages
    
    messages.push({
      type: 'message',
      title: `${isGroupMessage ? 'Group' : 'Direct'} Message: ${keywords.slice(0, 2).join(' & ')}`,
      description: `Encrypted ${isGroupMessage ? 'group' : 'direct'} message about ${keywords.slice(0, 2).join(' and ')}`,
      content: `Secure messaging conversation covering topics related to ${keywords.join(', ')}. All messages are end-to-end encrypted using the Signal Protocol.`,
      keywords,
      cid: generateCID(),
      source: generatePrivEmail(),
      encrypted: true,
      privacy: {
        anonymous: Math.random() > 0.2, // 80% anonymous
        zkProof: Math.random() > 0.3 ? `zk_proof_${crypto.randomBytes(4).toString('hex')}` : undefined,
        onionRouted: Math.random() > 0.4 // 60% onion routed
      },
      metadata: {
        category: 'messaging',
        messageType: isGroupMessage ? 'group' : 'direct',
        participants: isGroupMessage ? Math.floor(Math.random() * 15) + 3 : 2,
        ephemeral: Math.random() > 0.5,
        forwardingDisabled: Math.random() > 0.3
      }
    })
  }
  
  return messages
}

/**
 * Main population function
 */
async function populateSearchData(options: PopulationOptions): Promise<void> {
  console.log('🚀 Starting PrivaChain search data population...')
  console.log(`📊 Target: ${options.numEntries} total entries`)
  
  if (options.chainId) {
    console.log(`🔗 Chain ID: ${options.chainId}`)
  }
  
  try {
    // Initialize OrbitDB if not already done
    const initialized = await orbitDBIndexing.initialize()
    if (!initialized) {
      throw new Error('Failed to initialize OrbitDB')
    }
    
    // Calculate distribution (as specified in requirements)
    const emailCount = Math.floor(options.numEntries * 0.5) // 50% emails
    const domainCount = Math.floor(options.numEntries * 0.3) // 30% domains
    const videoCount = Math.floor(options.numEntries * 0.2) // 20% videos
    const remaining = options.numEntries - emailCount - domainCount - videoCount
    const fileCount = Math.floor(remaining * 0.6) // 60% of remaining as files
    const identityCount = Math.floor(remaining * 0.25) // 25% of remaining as identities
    const messageCount = remaining - fileCount - identityCount // Rest as messages
    
    console.log('📋 Data distribution:')
    console.log(`  📧 Emails: ${emailCount}`)
    console.log(`  🌐 Domains: ${domainCount}`)
    console.log(`  🎥 Videos: ${videoCount}`)
    console.log(`  📄 Files: ${fileCount}`)
    console.log(`  🆔 Identities: ${identityCount}`)
    console.log(`  💬 Messages: ${messageCount}`)
    
    let totalIndexed = 0
    
    // Generate and index emails
    console.log('📧 Generating encrypted emails...')
    const emails = generateEmailDocuments(emailCount)
    for (const email of emails) {
      await orbitDBIndexing.indexContent(email)
      totalIndexed++
      if (options.verbose && totalIndexed % 50 === 0) {
        console.log(`  📊 Indexed ${totalIndexed}/${options.numEntries} documents`)
      }
    }
    
    // Generate and index domains
    console.log('🌐 Generating .prv domains...')
    const domains = generateDomainDocuments(domainCount)
    for (const domain of domains) {
      await orbitDBIndexing.indexContent(domain)
      totalIndexed++
      if (options.verbose && totalIndexed % 50 === 0) {
        console.log(`  📊 Indexed ${totalIndexed}/${options.numEntries} documents`)
      }
    }
    
    // Generate and index videos
    console.log('🎥 Generating video call logs...')
    const videos = generateVideoDocuments(videoCount)
    for (const video of videos) {
      await orbitDBIndexing.indexContent(video)
      totalIndexed++
      if (options.verbose && totalIndexed % 50 === 0) {
        console.log(`  📊 Indexed ${totalIndexed}/${options.numEntries} documents`)
      }
    }
    
    // Generate and index files
    console.log('📄 Generating file documents...')
    const files = generateFileDocuments(fileCount)
    for (const file of files) {
      await orbitDBIndexing.indexContent(file)
      totalIndexed++
      if (options.verbose && totalIndexed % 50 === 0) {
        console.log(`  📊 Indexed ${totalIndexed}/${options.numEntries} documents`)
      }
    }
    
    // Generate and index identities
    console.log('🆔 Generating identity certificates...')
    const identities = generateIdentityDocuments(identityCount)
    for (const identity of identities) {
      await orbitDBIndexing.indexContent(identity)
      totalIndexed++
      if (options.verbose && totalIndexed % 50 === 0) {
        console.log(`  📊 Indexed ${totalIndexed}/${options.numEntries} documents`)
      }
    }
    
    // Generate and index messages
    console.log('💬 Generating encrypted messages...')
    const messages = generateMessageDocuments(messageCount)
    for (const message of messages) {
      await orbitDBIndexing.indexContent(message)
      totalIndexed++
      if (options.verbose && totalIndexed % 50 === 0) {
        console.log(`  📊 Indexed ${totalIndexed}/${options.numEntries} documents`)
      }
    }
    
    // Final statistics
    const stats = orbitDBIndexing.getStats()
    console.log('✅ Data population completed!')
    console.log('📊 Final statistics:')
    console.log(`  📚 Total indexed: ${stats.totalIndexed}`)
    console.log(`  🔒 Encrypted entries: ${stats.encryptedEntries}`)
    console.log(`  🌐 Peer connections: ${stats.peerConnections}`)
    console.log(`  🔄 Tor enabled: ${stats.torEnabled}`)
    
    // Test search functionality
    console.log('🔍 Testing search functionality...')
    const testQueries = ['privacy', 'anonymous mail', 'quantum encryption', '!prv whistleblower', '!mail secure']
    
    for (const query of testQueries) {
      const result = await orbitDBIndexing.search({
        term: query,
        filters: {},
        zkEncrypted: false
      })
      console.log(`  🔍 "${query}": ${result.documents.length} results (${result.searchTime}ms)`)
    }
    
  } catch (error) {
    console.error('❌ Population failed:', error)
    process.exit(1)
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): PopulationOptions {
  const args = process.argv.slice(2)
  const options: PopulationOptions = {
    numEntries: 1000 // Default as specified in requirements
  }
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg.startsWith('--num=')) {
      options.numEntries = parseInt(arg.split('=')[1])
    } else if (arg.startsWith('--chain-id=')) {
      options.chainId = arg.split('=')[1]
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--help' || arg === '-h') {
      console.log('PrivaChain Search Data Population Script')
      console.log('')
      console.log('Usage: ts-node scripts/populate-search-data.ts [options]')
      console.log('')
      console.log('Options:')
      console.log('  --num=<number>        Number of entries to generate (default: 1000)')
      console.log('  --chain-id=<string>   Chain ID for testnet deployment')
      console.log('  --verbose, -v         Verbose output')
      console.log('  --help, -h            Show this help message')
      console.log('')
      console.log('Examples:')
      console.log('  ts-node scripts/populate-search-data.ts --num=1000')
      console.log('  ts-node scripts/populate-search-data.ts --num=500 --chain-id=privachain-testnet --verbose')
      process.exit(0)
    }
  }
  
  return options
}

/**
 * Main execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs()
  
  console.log('🏗️  PrivaChain Search Data Population Script')
  console.log('📋 Technical Specification Requirement: Populate search engine with 1000+ entries')
  console.log('')
  
  populateSearchData(options).then(() => {
    console.log('🎉 Population script completed successfully!')
    process.exit(0)
  }).catch(error => {
    console.error('💥 Population script failed:', error)
    process.exit(1)
  })
}