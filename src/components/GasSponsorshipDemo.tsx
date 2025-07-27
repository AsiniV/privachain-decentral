import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  ChatCircle,
  Envelope,
  VideoCamera,
  MagnifyingGlass,
  Coins
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { gasFeeManager } from '../services/GasFeeManager'

interface TestOperation {
  id: string
  name: string
  operation: 'message' | 'email' | 'video' | 'search' | 'domain'
  icon: React.ElementType
  description: string
  estimatedGas: string
}

export function GasSponsorshipDemo() {
  const [testResults, setTestResults] = useState<Map<string, 'pending' | 'success' | 'error'>>(new Map())
  const [isRunningTest, setIsRunningTest] = useState(false)
  const mockUserAddress = 'cosmos1user5example7address9for0testing1purposes23'

  const testOperations: TestOperation[] = [
    {
      id: 'message',
      name: 'Send Message',
      operation: 'message',
      icon: ChatCircle,
      description: 'Send an encrypted message to another user',
      estimatedGas: '0.005 ATOM'
    },
    {
      id: 'email',
      name: 'Send Email',
      operation: 'email',
      icon: Envelope,
      description: 'Send an anonymous email via .prv domain',
      estimatedGas: '0.01 ATOM'
    },
    {
      id: 'video',
      name: 'Video Call',
      operation: 'video',
      icon: VideoCamera,
      description: 'Start a secure video call session',
      estimatedGas: '0.025 ATOM'
    },
    {
      id: 'search',
      name: 'Search Query',
      operation: 'search',
      icon: MagnifyingGlass,
      description: 'Perform a decentralized search',
      estimatedGas: '0.002 ATOM'
    }
  ]

  const runSingleTest = async (operation: TestOperation) => {
    setTestResults(prev => new Map(prev.set(operation.id, 'pending')))
    
    try {
      const transaction = await gasFeeManager.processGasFee(mockUserAddress, operation.operation)
      
      // Simulate blockchain confirmation delay
      setTimeout(() => {
        if (transaction.success) {
          setTestResults(prev => new Map(prev.set(operation.id, 'success')))
          toast.success(`${operation.name} completed - gas sponsored by developer wallet!`)
        } else {
          setTestResults(prev => new Map(prev.set(operation.id, 'error')))
          toast.error(`${operation.name} failed: ${transaction.errorReason}`)
        }
      }, 1500)
      
    } catch (error) {
      setTestResults(prev => new Map(prev.set(operation.id, 'error')))
      toast.error(`${operation.name} test failed: ${error}`)
    }
  }

  const runAllTests = async () => {
    setIsRunningTest(true)
    setTestResults(new Map())
    
    try {
      for (const operation of testOperations) {
        await runSingleTest(operation)
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      toast.success('All developer-sponsored gas tests completed!')
    } catch {
      toast.error('Test suite failed')
    } finally {
      setIsRunningTest(false)
    }
  }

  const getStatusIcon = (operationId: string) => {
    const status = testResults.get(operationId)
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (operationId: string) => {
    const status = testResults.get(operationId)
    switch (status) {
      case 'pending':
        return 'border-yellow-200 bg-yellow-50'
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-border'
    }
  }

  const gasStats = gasFeeManager.getGasStats()
  const userStatus = gasFeeManager.getPaymentStatus(mockUserAddress)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Developer-Sponsored Gas System
        </CardTitle>
        <CardDescription>
          Test platform operations with gas fees automatically paid by the developer's ATOM wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Status */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-blue-800">System Status</h4>
            <Badge variant="default">Developer Sponsored</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-blue-600 font-medium">Gas Currency:</span>
              <div className="mt-1">ATOM (Cosmos Network)</div>
            </div>
            <div>
              <span className="text-blue-600 font-medium">User Cost:</span>
              <div className="mt-1 font-semibold text-green-600">FREE</div>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Quota Remaining:</span>
              <div className="mt-1">
                Messages: {userStatus.quotaRemaining.messages}, 
                Emails: {userStatus.quotaRemaining.emails}, 
                Video: {userStatus.quotaRemaining.videoMinutes}min
              </div>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Payment Method:</span>
              <div className="mt-1">{userStatus.gasPaymentMethod}</div>
            </div>
          </div>
        </div>

        {/* Test Operations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Test Operations</h4>
            <Button 
              onClick={runAllTests}
              disabled={isRunningTest}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isRunningTest ? 'Running Tests...' : 'Run All Tests'}
            </Button>
          </div>

          <div className="space-y-3">
            {testOperations.map((operation) => {
              const IconComponent = operation.icon
              return (
                <div 
                  key={operation.id}
                  className={`p-4 rounded-lg border transition-colors ${getStatusColor(operation.id)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium">{operation.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {operation.description}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-mono">
                          {operation.estimatedGas}
                        </div>
                        <div className="text-xs text-muted-foreground">Developer Pays</div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusIcon(operation.id)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runSingleTest(operation)}
                          disabled={testResults.get(operation.id) === 'pending'}
                        >
                          Test
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Test Results Summary */}
        <div>
          <h4 className="font-semibold mb-3">Test Results & Gas Statistics</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-lg font-bold">{gasStats.totalTransactions}</div>
              <div className="text-xs text-muted-foreground">Total Operations</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">
                {gasStats.successfulTransactions}
              </div>
              <div className="text-xs text-muted-foreground">Successful</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-lg font-bold text-blue-600">
                {gasStats.activeUsers}
              </div>
              <div className="text-xs text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded">
              <div className="text-lg font-bold text-purple-600">
                {gasStats.totalGasSponsored}
              </div>
              <div className="text-xs text-muted-foreground">Total Sponsored</div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
          <strong>System Update:</strong> PrivaChain now uses a simplified gas payment model. 
          All blockchain operations are sponsored by the developer's ATOM wallet 
          ({gasStats.developerWallet.slice(0, 20)}...). 
          Users enjoy free access to platform features within generous daily quotas, 
          with no need to understand or manage cryptocurrency. 
          {userStatus.recommendedAction}
        </div>
      </CardContent>
    </Card>
  )
}