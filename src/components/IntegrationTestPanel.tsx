import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { 
  Phone, 
  PhoneCall, 
  Search,
  Shield,
  Zap,
  Globe
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useVideoSignaling } from '../blockchain/VideoSignaling'
import { useDecentralizedSearch } from '../blockchain/SearchBackend'

export function IntegrationTestPanel() {
  const [testResults, setTestResults] = useState<any>({})
  const [isRunning, setIsRunning] = useState(false)
  const [callReceiver, setCallReceiver] = useState('test.prv')
  const [searchQuery, setSearchQuery] = useState('blockchain')

  const { startSession, sessions, turnRelays } = useVideoSignaling()
  const { zkSearch, indexContent, searchHistory, indexStats } = useDecentralizedSearch()

  const runVideoCallTest = async () => {
    try {
      setIsRunning(true)
      toast.info('Testing video calling with blockchain signaling...')
      
      // Test starting a video session
      const sessionId = await startSession(
        callReceiver,
        'video',
        'mock_sdp_offer_data'
      )
      
      setTestResults(prev => ({
        ...prev,
        videoCall: {
          success: true,
          sessionId,
          blockchain: 'Cosmos',
          turnRelays: turnRelays.length,
          timestamp: new Date().toISOString()
        }
      }))
      
      toast.success('Video call blockchain signaling test passed!')
      
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        videoCall: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }))
      toast.error('Video call test failed')
    } finally {
      setIsRunning(false)
    }
  }

  const runSearchTest = async () => {
    try {
      setIsRunning(true)
      toast.info('Testing decentralized search with ZK queries...')
      
      // Test indexing content
      const contentId = await indexContent({
        type: 'message',
        title: 'Test Blockchain Message',
        description: 'Testing search integration with SubQuery and ComposeDB',
        tags: ['test', 'blockchain', 'search'],
        source: 'integration-test.prv',
        encrypted: true,
        ipfsHash: 'QmTestHash123'
      })
      
      // Test ZK search
      const searchResults = await zkSearch(searchQuery, {
        type: 'message',
        encrypted: true
      })
      
      setTestResults(prev => ({
        ...prev,
        search: {
          success: true,
          contentId,
          resultsCount: searchResults.length,
          backends: ['Local', 'SubQuery', 'ComposeDB'],
          zkProofs: searchResults.filter(r => r.zkProof).length,
          timestamp: new Date().toISOString()
        }
      }))
      
      toast.success('Decentralized search test passed!')
      
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        search: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }))
      toast.error('Search test failed')
    } finally {
      setIsRunning(false)
    }
  }

  const runFullIntegrationTest = async () => {
    setTestResults({})
    await runVideoCallTest()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Brief pause
    await runSearchTest()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Video Calling & Search Integration Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Video Call Test */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Video Call Test
              </h3>
              <Input 
                placeholder="test.prv"
                value={callReceiver}
                onChange={(e) => setCallReceiver(e.target.value)}
              />
              <Button 
                onClick={runVideoCallTest}
                disabled={isRunning}
                className="w-full"
              >
                <PhoneCall className="w-4 h-4 mr-2" />
                Test Blockchain Signaling
              </Button>
              
              {testResults.videoCall && (
                <div className="p-3 bg-muted rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={testResults.videoCall.success ? "default" : "destructive"}>
                      {testResults.videoCall.success ? "PASSED" : "FAILED"}
                    </Badge>
                    <Shield className="w-4 h-4" />
                  </div>
                  {testResults.videoCall.success ? (
                    <div className="text-sm space-y-1">
                      <p>Session ID: {testResults.videoCall.sessionId}</p>
                      <p>Blockchain: {testResults.videoCall.blockchain}</p>
                      <p>TURN Relays: {testResults.videoCall.turnRelays}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">{testResults.videoCall.error}</p>
                  )}
                </div>
              )}
            </div>

            {/* Search Test */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search Test
              </h3>
              <Input 
                placeholder="blockchain"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button 
                onClick={runSearchTest}
                disabled={isRunning}
                className="w-full"
              >
                <Globe className="w-4 h-4 mr-2" />
                Test ZK Search
              </Button>
              
              {testResults.search && (
                <div className="p-3 bg-muted rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={testResults.search.success ? "default" : "destructive"}>
                      {testResults.search.success ? "PASSED" : "FAILED"}
                    </Badge>
                    <Shield className="w-4 h-4" />
                  </div>
                  {testResults.search.success ? (
                    <div className="text-sm space-y-1">
                      <p>Content ID: {testResults.search.contentId?.slice(0, 20)}...</p>
                      <p>Results: {testResults.search.resultsCount}</p>
                      <p>ZK Proofs: {testResults.search.zkProofs}</p>
                      <p>Backends: {testResults.search.backends.join(', ')}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">{testResults.search.error}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator />

          <Button 
            onClick={runFullIntegrationTest}
            disabled={isRunning}
            size="lg"
            className="w-full"
          >
            Run Full Integration Test
          </Button>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{sessions.length}</div>
              <div className="text-sm text-muted-foreground">Active Video Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{turnRelays.length}</div>
              <div className="text-sm text-muted-foreground">TURN Relay Nodes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{indexStats.totalIndexed || 0}</div>
              <div className="text-sm text-muted-foreground">Indexed Content</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}