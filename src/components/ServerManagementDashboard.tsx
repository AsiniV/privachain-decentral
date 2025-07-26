import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  Lightning,
  WifiHigh,
  WifiMedium,
  WifiLow,
  CurrencyCircleDollar,
  Users,
  ChartLine,
  Shield,
  Plus,
  WarningCircle,
  CheckCircle,
  Gauge
} from '@phosphor-icons/react'
import { videoQualityContract, TurnServerInfo, ServerStats, GlobalMetrics } from '../blockchain/videoQualityContract'
import { toast } from 'sonner'

export function ServerManagementDashboard() {
  const [servers, setServers] = useState<TurnServerInfo[]>([])
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null)
  const [selectedServer, setSelectedServer] = useState<string>('')
  const [serverStats, setServerStats] = useState<ServerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newServerUrl, setNewServerUrl] = useState('')
  const [newServerRegion, setNewServerRegion] = useState('')
  const [stakeAmount, setStakeAmount] = useState('')

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedServer) {
      loadServerStats(selectedServer)
    }
  }, [selectedServer])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Load global metrics
      const metrics = await videoQualityContract.getGlobalQualityMetrics()
      setGlobalMetrics(metrics)

      // Load server list (simulated - in real implementation would query blockchain)
      const mockServers: TurnServerInfo[] = [
        {
          id: 'us-east-1',
          url: 'turn:node1.privturn.net:3478',
          region: 'US-East',
          latency: 35,
          reliability: 98.5,
          cost: 0.002,
          reputation: 95,
          stake: 10000,
          isActive: true,
          supportedQualities: ['UHD', 'HD', 'SD'],
          operatorAddress: '0x1234...5678'
        },
        {
          id: 'eu-west-1',
          url: 'turn:node2.privturn.net:3478',
          region: 'EU-West',
          latency: 45,
          reliability: 96.2,
          cost: 0.0015,
          reputation: 92,
          stake: 8000,
          isActive: true,
          supportedQualities: ['HD', 'SD'],
          operatorAddress: '0x2345...6789'
        },
        {
          id: 'asia-1',
          url: 'turn:node3.privturn.net:3478',
          region: 'Asia-Pacific',
          latency: 62,
          reliability: 94.1,
          cost: 0.001,
          reputation: 90,
          stake: 6000,
          isActive: true,
          supportedQualities: ['HD', 'SD', 'LOW'],
          operatorAddress: '0x3456...7890'
        }
      ]

      setServers(mockServers)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadServerStats = async (serverId: string) => {
    try {
      const stats = await videoQualityContract.getServerStats(serverId)
      setServerStats(stats)
    } catch (error) {
      toast.error('Failed to load server statistics')
    }
  }

  const handleRegisterServer = async () => {
    if (!newServerUrl || !newServerRegion || !stakeAmount) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      const serverId = await videoQualityContract.registerTurnServer(
        newServerUrl,
        newServerRegion,
        parseFloat(stakeAmount)
      )
      
      toast.success(`Desktop registered successfully: ${serverId}`)
      setNewServerUrl('')
      setNewServerRegion('')
      setStakeAmount('')
      loadDashboardData()
    } catch (error) {
      toast.error('Failed to register server')
    }
  }

  const handleStakeForServer = async (serverId: string) => {
    if (!stakeAmount) {
      toast.error('Please enter stake amount')
      return
    }

    try {
      await videoQualityContract.stakeForServer(serverId, parseFloat(stakeAmount))
      toast.success(`Staked ${stakeAmount} PRIV for server ${serverId}`)
      setStakeAmount('')
      loadDashboardData()
    } catch (error) {
      toast.error('Failed to stake for server')
    }
  }

  const handleReportIssue = async (serverId: string) => {
    try {
      await videoQualityContract.reportServerIssue(serverId, 'poor_performance', 'Manual report from dashboard')
      toast.success('Issue reported successfully')
      loadDashboardData()
    } catch (error) {
      toast.error('Failed to report issue')
    }
  }

  const getLatencyIcon = (latency: number) => {
    if (latency < 50) return <WifiHigh className="w-4 h-4 text-green-500" />
    if (latency < 100) return <WifiMedium className="w-4 h-4 text-yellow-500" />
    return <WifiLow className="w-4 h-4 text-red-500" />
  }

  const getReputationColor = (reputation: number) => {
    if (reputation >= 90) return 'text-green-600'
    if (reputation >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global Metrics */}
      {globalMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Servers</p>
                  <p className="text-2xl font-bold">{globalMetrics.totalServers}</p>
                </div>
                <Lightning className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Servers</p>
                  <p className="text-2xl font-bold text-green-600">{globalMetrics.activeServers}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Latency</p>
                  <p className="text-2xl font-bold">{Math.round(globalMetrics.averageLatency)}ms</p>
                </div>
                <Gauge className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sessions Today</p>
                  <p className="text-2xl font-bold">{globalMetrics.totalSessionsToday.toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="servers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="servers">Desktop List</TabsTrigger>
          <TabsTrigger value="register">Register Desktop</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="servers" className="space-y-4">
          {/* Desktop List */}
          <Card>
            <CardHeader>
              <CardTitle>TURN Desktop Network</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {servers.map((server) => (
                  <div 
                    key={server.id}
                    className={`p-4 border rounded-lg transition-all cursor-pointer ${
                      selectedServer === server.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedServer(server.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          server.isActive ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <div className="font-medium">{server.region}</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {server.url}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="flex items-center gap-1">
                            {getLatencyIcon(server.latency)}
                            <span className="text-sm">{server.latency}ms</span>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Reliability</div>
                          <div className="font-medium">{server.reliability}%</div>
                        </div>

                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Reputation</div>
                          <div className={`font-medium ${getReputationColor(server.reputation)}`}>
                            {server.reputation}
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Stake</div>
                          <div className="font-medium">{server.stake} PRIV</div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReportIssue(server.id)
                            }}
                          >
                            <WarningCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {server.supportedQualities.map((quality) => (
                        <Badge key={quality} variant="outline" className="text-xs">
                          {quality}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-2">
                      <Progress value={server.reliability} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Desktop Details */}
          {selectedServer && serverStats && (
            <Card>
              <CardHeader>
                <CardTitle>Desktop Statistics: {selectedServer}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Sessions</div>
                    <div className="text-lg font-bold">{serverStats.totalSessions}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                    <div className="text-lg font-bold text-green-600">
                      {serverStats.uptimePercentage.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Revenue Earned</div>
                    <div className="text-lg font-bold">
                      {serverStats.totalRevenueEarned.toFixed(4)} PRIV
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Quality Rating</div>
                    <div className="text-lg font-bold">
                      {serverStats.qualityRating.toFixed(1)}/10
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Input
                    placeholder="Stake amount (PRIV)"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    type="number"
                    className="max-w-48"
                  />
                  <Button onClick={() => handleStakeForServer(selectedServer)}>
                    <CurrencyCircleDollar className="w-4 h-4 mr-2" />
                    Stake
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Register New TURN Desktop</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Desktop URL</label>
                <Input
                  placeholder="turn:your-server.com:3478"
                  value={newServerUrl}
                  onChange={(e) => setNewServerUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Region</label>
                <Select value={newServerRegion} onValueChange={setNewServerRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US-East">US East</SelectItem>
                    <SelectItem value="US-West">US West</SelectItem>
                    <SelectItem value="EU-West">EU West</SelectItem>
                    <SelectItem value="EU-Central">EU Central</SelectItem>
                    <SelectItem value="Asia-Pacific">Asia Pacific</SelectItem>
                    <SelectItem value="Asia-Southeast">Asia Southeast</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Initial Stake (PRIV)</label>
                <Input
                  placeholder="5000"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  type="number"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 1000 PRIV required for server activation
                </p>
              </div>

              <Button onClick={handleRegisterServer} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Register Desktop
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartLine className="w-5 h-5" />
                  Network Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Average Quality Score</span>
                    <span className="font-bold">
                      {globalMetrics?.averageQualityScore.toFixed(1)}/100
                    </span>
                  </div>
                  <Progress value={globalMetrics?.averageQualityScore || 0} />

                  <div className="flex justify-between items-center">
                    <span>Total Bandwidth Served</span>
                    <span className="font-bold">
                      {globalMetrics?.totalBandwidthServed.toFixed(1)} TB
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security & Reliability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Desktop Uptime</span>
                    <span className="font-bold text-green-600">99.2%</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>ZK-Proof Verifications</span>
                    <span className="font-bold">1,234,567</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Slashing Events</span>
                    <span className="font-bold text-red-600">3</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}