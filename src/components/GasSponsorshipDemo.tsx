import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { useTestWallet } from '../hooks/useTestWallet'
import { gasFeeManager } from '../services/GasFeeManager'
import { TEST_WALLET_ADDRESS } from '../blockchain/CosmosTestnet'
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  MessageCircle,
  Mail,
  VideoCamera,
  MagnifyingGlass,
  Globe,
  Coins
} from '@phosphor-icons/react'
import { toast } from 'sonner'

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
  const { wallet, payGasFee, estimateGasFee, config } = useTestWallet()

  const testOperations: TestOperation[] = [
    {
      id: 'message',
      name: 'Send Message',
      operation: 'message',
      icon: MessageCircle,
      description: 'Send an encrypted message to another user',
      estimatedGas: '5000' // 0.005 ATOM
    },
    {
      id: 'email',
      name: 'Send Email',
      operation: 'email',
      icon: Mail,
      description: 'Send an anonymous email via .prv domain',
      estimatedGas: '10000' // 0.01 ATOM
    },
    {
      id: 'video',
      name: 'Video Call',
      operation: 'video',
      icon: VideoCamera,
      description: 'Start a secure video call session',
      estimatedGas: '25000' // 0.025 ATOM
    },
    {
      id: 'search',
      name: 'Search Query',
      operation: 'search',
      icon: MagnifyingGlass,
      description: 'Perform a decentralized search',
      estimatedGas: '2000' // 0.002 ATOM
    }
  ]

  const runSingleTest = async (operation: TestOperation) => {
    setTestResults(prev => new Map(prev.set(operation.id, 'pending')))
    
    try {
      const gasAmount = estimateGasFee(operation.operation + '_test')
      const txHash = await payGasFee(gasAmount, `test_${operation.operation}`, `Testing ${operation.name}`)
      
      // Simulate blockchain confirmation delay
      setTimeout(() => {
        setTestResults(prev => new Map(prev.set(operation.id, 'success')))
        toast.success(`${operation.name} test completed successfully!`)
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
      
      toast.success('All gas sponsorship tests completed!')
    } catch (error) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Gas Sponsorship Testing
        </CardTitle>
        <CardDescription>
          Test platform operations using the sponsored test wallet for gas fees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Status */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-blue-800">Test Wallet Status</h4>
            <Badge variant={wallet.isConnected ? "default" : "secondary"}>
              {wallet.isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-blue-600 font-medium">Address:</span>
              <div className="font-mono text-xs mt-1">{config.address}</div>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Balance:</span>
              <div className="mt-1">
                {wallet.isConnected 
                  ? wallet.balances.find(b => b.denom === 'uatom')?.formatted || '0 ATOM'
                  : 'Not Available'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Test Operations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Test Operations</h4>
            <Button 
              onClick={runAllTests}
              disabled={isRunningTest || !wallet.isConnected}
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
                          {(parseInt(operation.estimatedGas) / 1000000).toFixed(6)} ATOM
                        </div>
                        <div className="text-xs text-muted-foreground">Est. Gas</div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusIcon(operation.id)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runSingleTest(operation)}
                          disabled={testResults.get(operation.id) === 'pending' || !wallet.isConnected}
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
          <h4 className="font-semibold mb-3">Test Results Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-lg font-bold">{testOperations.length}</div>
              <div className="text-xs text-muted-foreground">Total Tests</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">
                {Array.from(testResults.values()).filter(status => status === 'success').length}
              </div>
              <div className="text-xs text-muted-foreground">Successful</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded">
              <div className="text-lg font-bold text-yellow-600">
                {Array.from(testResults.values()).filter(status => status === 'pending').length}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-lg font-bold text-red-600">
                {Array.from(testResults.values()).filter(status => status === 'error').length}
              </div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
          <strong>Note:</strong> These tests simulate real blockchain operations where gas fees are automatically 
          sponsored by the test wallet ({TEST_WALLET_ADDRESS.slice(0, 20)}...). 
          In production, users can choose between sponsored operations (within quotas), premium subscriptions, 
          or direct PRIV token payments.
        </div>
      </CardContent>
    </Card>
  )
}