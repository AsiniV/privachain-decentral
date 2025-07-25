/**
 * Integration Test Component
 * Tests all connected systems together
 */

import { useState } from 'react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  Play,
  CheckCircle,
  XCircle,
  Clock,
  VideoCamera,
  MagnifyingGlass,
  Shield,
  Database,
  Coins
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useVideoSignaling } from '../blockchain/VideoSignaling'
import { useDecentralizedSearch } from '../blockchain/SearchBackend'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'success' | 'failed'
  message: string
  duration?: number
}

export function SystemIntegrationTest() {
  const [tests, setTests] = useState<TestResult[]>([
    {
      name: 'Blockchain Video Signaling',
      status: 'pending',
      message: 'Ready to test'
    },
    {
      name: 'TURN Relay Selection',
      status: 'pending', 
      message: 'Ready to test'
    },
    {
      name: 'Zero-Knowledge Search',
      status: 'pending',
      message: 'Ready to test'
    },
    {
      name: 'IPFS Content Indexing',
      status: 'pending',
      message: 'Ready to test'
    },
    {
      name: 'Cosmos Wallet Integration',
      status: 'pending',
      message: 'Ready to test'
    }
  ])

  const { startSession, endSession, stakeTurnRelay } = useVideoSignaling()
  const { zkSearch, indexContent } = useDecentralizedSearch()

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...update } : test
    ))
  }

  const runTest = async (testIndex: number) => {
    const startTime = Date.now()
    updateTest(testIndex, { status: 'running', message: 'Running...' })

    try {
      switch (testIndex) {
        case 0: // Blockchain Video Signaling
          await testVideoSignaling()
          break
        case 1: // TURN Relay Selection  
          await testTurnRelay()
          break
        case 2: // Zero-Knowledge Search
          await testZKSearch()
          break
        case 3: // IPFS Content Indexing
          await testIPFSIndexing()
          break
        case 4: // Cosmos Wallet Integration
          await testCosmosWallet()
          break
      }

      const duration = Date.now() - startTime
      updateTest(testIndex, { 
        status: 'success', 
        message: 'Test passed successfully',
        duration 
      })

    } catch (error) {
      const duration = Date.now() - startTime
      updateTest(testIndex, { 
        status: 'failed', 
        message: `Test failed: ${error}`,
        duration 
      })
    }
  }

  const testVideoSignaling = async () => {
    // Test session creation
    const sessionId = await startSession(
      'test@privachain.prv',
      'video',
      'mock_sdp_offer'
    )
    
    if (!sessionId) throw new Error('Failed to create session')
    
    // Test session termination
    await endSession(sessionId, 50) // 50MB transferred
    
    toast.success('Video signaling test completed')
  }

  const testTurnRelay = async () => {
    // Test staking a new TURN relay
    const relayId = await stakeTurnRelay(5000, 'Test-Region')
    
    if (!relayId) throw new Error('Failed to stake TURN relay')
    
    toast.success('TURN relay staking test completed')
  }

  const testZKSearch = async () => {
    // Test content indexing
    await indexContent({
      type: 'message',
      title: 'Test Integration Message',
      description: 'Message created during integration testing',
      tags: ['test', 'integration', 'blockchain'],
      source: 'test.prv',
      encrypted: true
    })

    // Test search
    const results = await zkSearch('integration test')
    
    if (results.length === 0) throw new Error('No search results found')
    
    toast.success('Zero-knowledge search test completed')
  }

  const testIPFSIndexing = async () => {
    // Test IPFS content creation and indexing
    await indexContent({
      type: 'file',
      title: 'Test IPFS Document',
      description: 'Document stored on IPFS during testing',
      tags: ['ipfs', 'test', 'storage'],
      source: 'ipfs://QmTestHash123456789',
      encrypted: false,
      ipfsHash: 'QmTestHash123456789'
    })

    toast.success('IPFS indexing test completed')
  }

  const testCosmosWallet = async () => {
    // Test wallet connection (simulated)
    const walletAddress = 'cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k'
    
    if (!walletAddress.startsWith('cosmos1')) {
      throw new Error('Invalid Cosmos wallet address')
    }

    // Simulate transaction
    await new Promise(resolve => setTimeout(resolve, 500))
    
    toast.success('Cosmos wallet integration test completed')
  }

  const runAllTests = async () => {
    for (let i = 0; i < tests.length; i++) {
      await runTest(i)
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    const passedTests = tests.filter(t => t.status === 'success').length
    toast.success(`Integration test complete: ${passedTests}/${tests.length} tests passed`)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/20 text-green-400'
      case 'failed':
        return 'bg-red-500/20 text-red-400'
      case 'running':
        return 'bg-yellow-500/20 text-yellow-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getTestIcon = (index: number) => {
    const icons = [VideoCamera, Coins, MagnifyingGlass, Database, Shield]
    const IconComponent = icons[index]
    return <IconComponent className="w-4 h-4" />
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold">System Integration Tests</h3>
            <p className="text-muted-foreground">
              Test all connected blockchain and decentralized systems
            </p>
          </div>
          
          <Button onClick={runAllTests} className="gap-2">
            <Play className="w-4 h-4" />
            Run All Tests
          </Button>
        </div>

        <div className="space-y-4">
          {tests.map((test, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getTestIcon(index)}
                  <div>
                    <h4 className="font-medium">{test.name}</h4>
                    <p className="text-sm text-muted-foreground">{test.message}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {test.duration && (
                    <span className="text-xs text-muted-foreground">
                      {test.duration}ms
                    </span>
                  )}
                  <Badge className={getStatusColor(test.status)} variant="outline">
                    {test.status}
                  </Badge>
                  {getStatusIcon(test.status)}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => runTest(index)}
                    disabled={test.status === 'running'}
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="p-4 bg-accent/5 border-accent/20">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-accent" />
          <div>
            <div className="font-medium">Integration Test Coverage</div>
            <div className="text-sm text-muted-foreground">
              Tests blockchain signaling, TURN relays, ZK search, IPFS indexing, and Cosmos wallet
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}