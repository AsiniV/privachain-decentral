import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { useVideoCall } from './VideoCallProvider'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Slider } from './ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { 
  Play,
  Stop,
  Lightning,
  WifiHigh,
  WifiMedium,
  WifiLow,
  Warning,
  CheckCircle,
  Clock,
  Gauge,
  VideoCamera,
  Globe,
  TrendUp,
  Activity,
  Zap,
  Target,
  RefreshCw,
  AlertTriangle
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface TestScenario {
  id: string
  name: string
  description: string
  networkConditions: {
    baseLatency: number
    packetLoss: number
    bandwidth: number
    jitter: number
    reliability: number
  }
  duration: number
}

interface TestResult {
  scenario: string
  selectedServer: string
  qualityAdaptations: number
  serverSwitches: number
  averageLatency: number
  dataUsage: number
  cost: number
  userSatisfaction: number
  success: boolean
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'optimal',
    name: 'Optimal Conditions',
    description: 'Perfect network, high-end connection',
    networkConditions: {
      baseLatency: 25,
      packetLoss: 0.001,
      bandwidth: 100,
      jitter: 2,
      reliability: 99.9
    },
    duration: 30
  },
  {
    id: 'congested',
    name: 'Network Congestion',
    description: 'Heavy traffic, variable latency',
    networkConditions: {
      baseLatency: 80,
      packetLoss: 0.02,
      bandwidth: 15,
      jitter: 15,
      reliability: 95
    },
    duration: 45
  },
  {
    id: 'mobile',
    name: 'Mobile Network',
    description: 'LTE/5G mobile connection',
    networkConditions: {
      baseLatency: 60,
      packetLoss: 0.01,
      bandwidth: 25,
      jitter: 8,
      reliability: 92
    },
    duration: 40
  },
  {
    id: 'unstable',
    name: 'Unstable Connection',
    description: 'Frequent quality changes, server failovers',
    networkConditions: {
      baseLatency: 120,
      packetLoss: 0.05,
      bandwidth: 8,
      jitter: 25,
      reliability: 85
    },
    duration: 60
  },
  {
    id: 'international',
    name: 'International Call',
    description: 'Cross-continental, high latency',
    networkConditions: {
      baseLatency: 180,
      packetLoss: 0.03,
      bandwidth: 12,
      jitter: 20,
      reliability: 90
    },
    duration: 35
  }
]

export function VideoCallTester() {
  const { optimizer, initiateCall } = useVideoCall()
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<TestScenario | null>(null)
  const [testProgress, setTestProgress] = useState(0)
  const [testResults, setTestResults] = useKV<TestResult[]>('video-test-results', [])
  const [selectedScenario, setSelectedScenario] = useState<string>('unstable')
  const [testDuration, setTestDuration] = useState([30])
  const [customNetworkConditions, setCustomNetworkConditions] = useState({
    latency: 50,
    packetLoss: 1,
    bandwidth: 50,
    jitter: 5
  })
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    currentServer: '',
    quality: 'HD',
    latency: 0,
    adaptations: 0,
    switches: 0,
    dataUsage: 0,
    cost: 0
  })
  const [optimizationHistory, setOptimizationHistory] = useState<Array<{
    timestamp: number
    action: string
    server: string
    quality: string
    latency: number
  }>>([])

  // Create test contacts for different scenarios
  const testContacts = [
    { id: 'test-optimal', name: 'Test User (Optimal)', address: 'test-optimal.prv', online: true },
    { id: 'test-congested', name: 'Test User (Congested)', address: 'test-congested.prv', online: true },
    { id: 'test-mobile', name: 'Test User (Mobile)', address: 'test-mobile.prv', online: true },
    { id: 'test-unstable', name: 'Test User (Unstable)', address: 'test-unstable.prv', online: true },
    { id: 'test-international', name: 'Test User (International)', address: 'test-international.prv', online: true }
  ]

  const runQualityTest = async (scenario: TestScenario) => {
    if (!optimizer) {
      toast.error('Video quality optimizer not available')
      return
    }

    setIsTestRunning(true)
    setCurrentTest(scenario)
    setTestProgress(0)
    
    const testStartTime = Date.now()
    let adaptations = 0
    let serverSwitches = 0
    let totalDataUsage = 0
    let totalCost = 0
    let currentLatency = scenario.networkConditions.baseLatency
    let selectedServer = ''

    toast.info(`Starting ${scenario.name} test`)

    try {
      // Initialize optimizer with scenario conditions
      await optimizer.updateSettings({
        preferredQuality: 'auto',
        maxCostPerMinute: 0.02,
        prioritizeLatency: true,
        allowFallback: true,
        enableAdaptiveBitrate: true,
        maxServersToTest: 3
      })

      // Start simulation
      const simulationInterval = setInterval(async () => {
        const elapsed = (Date.now() - testStartTime) / 1000
        const progress = Math.min((elapsed / scenario.duration) * 100, 100)
        setTestProgress(progress)

        // Simulate network condition changes
        const variance = Math.random() * 0.4 - 0.2 // ±20% variance
        currentLatency = scenario.networkConditions.baseLatency * (1 + variance)
        
        // Simulate quality adaptation
        if (Math.random() < 0.15) { // 15% chance per interval
          adaptations++
          const newQuality = await optimizer.adaptVideoQuality()
          
          setRealTimeMetrics(prev => ({
            ...prev,
            quality: newQuality.resolution.includes('3840') ? 'UHD' : 
                     newQuality.resolution.includes('1920') ? 'HD' : 'SD',
            adaptations,
            latency: currentLatency
          }))

          setOptimizationHistory(prev => [...prev.slice(-9), {
            timestamp: Date.now(),
            action: 'Quality Adapted',
            server: selectedServer,
            quality: newQuality.resolution,
            latency: currentLatency
          }])

          toast.info(`Quality adapted to ${newQuality.resolution}`)
        }

        // Simulate server failover for unstable conditions
        if (scenario.id === 'unstable' && Math.random() < 0.1) { // 10% chance for unstable
          serverSwitches++
          const newServer = await optimizer.handleServerFailover()
          selectedServer = newServer.region
          
          setRealTimeMetrics(prev => ({
            ...prev,
            currentServer: newServer.region,
            switches: serverSwitches
          }))

          setOptimizationHistory(prev => [...prev.slice(-9), {
            timestamp: Date.now(),
            action: 'Server Switch',
            server: newServer.region,
            quality: prev[prev.length - 1]?.quality || 'HD',
            latency: currentLatency
          }])

          toast.warning(`Switched to ${newServer.region} server`)
        }

        // Update metrics
        const dataIncrement = Math.random() * 2 + 1 // 1-3 MB per interval
        totalDataUsage += dataIncrement
        totalCost += dataIncrement * 0.002

        setRealTimeMetrics(prev => ({
          ...prev,
          dataUsage: totalDataUsage,
          cost: totalCost,
          latency: currentLatency
        }))

        // Test completion
        if (progress >= 100) {
          clearInterval(simulationInterval)
          
          const result: TestResult = {
            scenario: scenario.name,
            selectedServer: selectedServer || 'US-East',
            qualityAdaptations: adaptations,
            serverSwitches,
            averageLatency: currentLatency,
            dataUsage: totalDataUsage,
            cost: totalCost,
            userSatisfaction: Math.max(5, 10 - (adaptations * 0.5) - (serverSwitches * 1)),
            success: adaptations < 10 && serverSwitches < 5
          }

          setTestResults(prev => [...prev, result])
          setIsTestRunning(false)
          setCurrentTest(null)
          
          toast.success(`Test completed! Adaptations: ${adaptations}, Switches: ${serverSwitches}`)
        }
      }, 2000) // Update every 2 seconds

      // Initial server selection
      const initialServer = await optimizer.selectOptimalServer()
      selectedServer = initialServer.region
      setRealTimeMetrics(prev => ({
        ...prev,
        currentServer: initialServer.region
      }))

    } catch (error) {
      toast.error(`Test failed: ${error}`)
      setIsTestRunning(false)
      setCurrentTest(null)
    }
  }

  const startCustomTest = () => {
    const customScenario: TestScenario = {
      id: 'custom',
      name: 'Custom Test',
      description: 'User-defined network conditions',
      networkConditions: {
        baseLatency: customNetworkConditions.latency,
        packetLoss: customNetworkConditions.packetLoss / 100,
        bandwidth: customNetworkConditions.bandwidth,
        jitter: customNetworkConditions.jitter,
        reliability: 95
      },
      duration: testDuration[0]
    }
    
    runQualityTest(customScenario)
  }

  const startDemoCall = () => {
    const contact = testContacts.find(c => c.id.includes(selectedScenario))
    if (contact) {
      initiateCall(contact, 'video')
      toast.info('Starting demo call with optimization testing')
    }
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'UHD': return 'bg-purple-500'
      case 'HD': return 'bg-green-500'
      case 'SD': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return 'text-green-500'
    if (latency < 100) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Video Call Quality Testing</h1>
          <p className="text-muted-foreground">Test automatic TURN server optimization and quality adaptation</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-primary">
            <Lightning className="w-4 h-4 mr-1" />
            PrivaChain Optimizer
          </Badge>
          {isTestRunning && (
            <Badge variant="default" className="bg-green-600">
              <Activity className="w-4 h-4 mr-1 animate-pulse" />
              Live Testing
            </Badge>
          )}
        </div>
      </div>

      {/* Test Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Test Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {TEST_SCENARIOS.map((scenario) => (
              <Card 
                key={scenario.id}
                className={`cursor-pointer transition-colors ${
                  selectedScenario === scenario.id ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedScenario(scenario.id)}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">{scenario.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Latency:</span>
                      <span className={getLatencyColor(scenario.networkConditions.baseLatency)}>
                        {scenario.networkConditions.baseLatency}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Packet Loss:</span>
                      <span>{(scenario.networkConditions.packetLoss * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{scenario.duration}s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => runQualityTest(TEST_SCENARIOS.find(s => s.id === selectedScenario)!)}
              disabled={isTestRunning}
              className="flex items-center gap-2"
              size="lg"
            >
              {isTestRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isTestRunning ? 'Testing...' : 'Run Optimization Test'}
            </Button>

            <Button 
              onClick={startDemoCall}
              variant="outline"
              className="flex items-center gap-2"
              size="lg"
            >
              <VideoCamera className="w-4 h-4" />
              Start Live Demo Call
            </Button>
            
            {testResults.length > 0 && (
              <Button 
                onClick={() => setTestResults([])}
                variant="ghost"
                size="lg"
                className="text-muted-foreground"
              >
                Clear Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Custom Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Custom Test Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Latency (ms)</label>
                <Slider
                  value={[customNetworkConditions.latency]}
                  onValueChange={(value) => setCustomNetworkConditions(prev => ({ ...prev, latency: value[0] }))}
                  max={300}
                  min={10}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {customNetworkConditions.latency}ms
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Packet Loss (%)</label>
                <Slider
                  value={[customNetworkConditions.packetLoss]}
                  onValueChange={(value) => setCustomNetworkConditions(prev => ({ ...prev, packetLoss: value[0] }))}
                  max={10}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {customNetworkConditions.packetLoss.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Bandwidth (Mbps)</label>
                <Slider
                  value={[customNetworkConditions.bandwidth]}
                  onValueChange={(value) => setCustomNetworkConditions(prev => ({ ...prev, bandwidth: value[0] }))}
                  max={100}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {customNetworkConditions.bandwidth} Mbps
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Test Duration (seconds)</label>
                <Slider
                  value={testDuration}
                  onValueChange={setTestDuration}
                  max={120}
                  min={15}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {testDuration[0]} seconds
                </p>
              </div>
            </div>
          </div>

          <Button onClick={startCustomTest} disabled={isTestRunning} className="w-full">
            Run Custom Test
          </Button>
        </CardContent>
      </Card>

      {/* Real-time Test Progress */}
      {isTestRunning && currentTest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Test in Progress: {currentTest.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm font-medium">{testProgress.toFixed(0)}%</span>
              </div>
              <Progress value={testProgress} className="w-full" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Server</p>
                <div className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-primary" />
                  <p className="font-semibold text-sm">{realTimeMetrics.currentServer || 'Selecting...'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quality Level</p>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getQualityColor(realTimeMetrics.quality)}`} />
                  <span className="font-semibold text-sm">{realTimeMetrics.quality}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Latency</p>
                <p className={`font-semibold text-sm ${getLatencyColor(realTimeMetrics.latency)}`}>
                  {realTimeMetrics.latency.toFixed(0)}ms
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adaptations</p>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <p className="font-semibold text-sm">{realTimeMetrics.adaptations}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Server Switches</p>
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-blue-500" />
                  <p className="font-semibold text-sm">{realTimeMetrics.switches}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cost</p>
                <p className="font-semibold text-sm text-green-600">
                  {realTimeMetrics.cost.toFixed(4)} PRIV
                </p>
              </div>
            </div>

            {optimizationHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recent Optimizations</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {optimizationHistory.slice(-5).map((event, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {event.action}
                      </Badge>
                      <span>{event.server}</span>
                      <span className={getLatencyColor(event.latency)}>
                        {event.latency.toFixed(0)}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendUp className="w-5 h-5" />
              Test Results History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.slice(-5).map((result, index) => (
                <div 
                  key={index}
                  className="p-4 border rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-semibold">{result.scenario}</p>
                      <p className="text-sm text-muted-foreground">
                        Server: {result.selectedServer} • 
                        Adaptations: {result.qualityAdaptations} • 
                        Switches: {result.serverSwitches}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold">
                      {result.userSatisfaction.toFixed(1)}/10
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.cost.toFixed(4)} PRIV
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {testResults.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Satisfaction</p>
                    <p className="font-semibold">
                      {(testResults.reduce((sum, r) => sum + r.userSatisfaction, 0) / testResults.length).toFixed(1)}/10
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="font-semibold">
                      {((testResults.filter(r => r.success).length / testResults.length) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Adaptations</p>
                    <p className="font-semibold">
                      {(testResults.reduce((sum, r) => sum + r.qualityAdaptations, 0) / testResults.length).toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="font-semibold">
                      {testResults.reduce((sum, r) => sum + r.cost, 0).toFixed(4)} PRIV
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Alert>
        <Lightning className="w-4 h-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">🚀 Try the Video Call Optimization System:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Select a test scenario above (try "Unstable Connection" for dramatic results)</li>
              <li>Click "Run Test" to see automatic server selection and quality adaptation</li>
              <li>Or click "Start Demo Call" to experience a simulated video call with real-time optimization</li>
              <li>Watch how the system automatically switches servers and adapts quality based on network conditions</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              This demonstrates PrivaChain's intelligent video quality optimization that selects optimal TURN servers, 
              adapts video quality based on network conditions, and handles failovers seamlessly.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}