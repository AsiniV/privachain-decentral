import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { 
  Lightning,
  VideoCamera,
  WifiHigh,
  WifiMedium,
  WifiLow,
  Warning,
  CheckCircle,
  Gauge,
  Globe
} from '@phosphor-icons/react'
import { videoQualityContract, TurnServerInfo, QualityReport } from '../blockchain/videoQualityContract'
import { toast } from 'sonner'

interface VideoQualityDashboardProps {
  onServerSelected?: (server: TurnServerInfo) => void
  currentSessionId?: string
  isInCall?: boolean
  onSettingsChange?: (settings: Record<string, unknown>) => void
}

export function VideoQualityDashboard({ onServerSelected, currentSessionId }: VideoQualityDashboardProps) {
  const [servers, setServers] = useState<TurnServerInfo[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>('auto')
  const [qualityRequirement, setQualityRequirement] = useState<string>('HD')
  const [optimalServer, setOptimalServer] = useState<TurnServerInfo | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [qualityMetrics, setQualityMetrics] = useState<QualityReport | null>(null)

  useEffect(() => {
    loadServers()
    if (currentSessionId) {
      simulateQualityMetrics()
    }
  }, [currentSessionId, simulateQualityMetrics])

  const loadServers = async () => {
    try {
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
    } catch {
      toast.error('Failed to load TURN servers')
    }
  }

  const simulateQualityMetrics = useCallback(() => {
    if (!currentSessionId || !optimalServer) return

    const interval = setInterval(() => {
      const metrics: QualityReport = {
        sessionId: currentSessionId,
        serverId: optimalServer.id,
        bandwidth: Math.random() * 1000 + 500, // 500-1500 kbps
        latency: optimalServer.latency + Math.random() * 20 - 10, // ±10ms variance
        packetLoss: Math.random() * 0.02, // 0-2% packet loss
        jitter: Math.random() * 10, // 0-10ms jitter
        videoQuality: qualityRequirement,
        duration: 60, // 1 minute intervals
        dataTransferred: Math.random() * 50 + 25, // 25-75 MB
        userSatisfaction: Math.floor(Math.random() * 3) + 8 // 8-10 rating
      }
      setQualityMetrics(metrics)
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [currentSessionId, optimalServer, qualityRequirement])

  const handleOptimizeConnection = async () => {
    setIsOptimizing(true)
    try {
      const server = await videoQualityContract.requestOptimalServer(
        selectedRegion === 'auto' ? 'US-East' : selectedRegion,
        qualityRequirement
      )
      
      setOptimalServer(server)
      onServerSelected?.(server)
      toast.success(`Optimized to server: ${server.region} (${server.latency}ms)`)
    } catch {
      toast.error('Failed to optimize connection')
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleFailover = async () => {
    if (!currentSessionId || !optimalServer) return

    try {
      const newServer = await videoQualityContract.requestServerFailover(
        currentSessionId,
        optimalServer.id
      )
      
      setOptimalServer(newServer)
      onServerSelected?.(newServer)
      toast.success(`Switched to backup server: ${newServer.region}`)
    } catch {
      toast.error('Failover failed')
    }
  }

  const reportQualityIssue = async () => {
    if (!currentSessionId || !qualityMetrics) return

    try {
      await videoQualityContract.reportQualityMetrics(currentSessionId, qualityMetrics)
      toast.success('Quality metrics reported')
    } catch {
      toast.error('Failed to report quality metrics')
    }
  }

  const getLatencyIndicator = (latency: number) => {
    if (latency < 50) return { icon: WifiHigh, color: 'text-green-500', label: 'Excellent' }
    if (latency < 100) return { icon: WifiMedium, color: 'text-yellow-500', label: 'Good' }
    return { icon: WifiLow, color: 'text-red-500', label: 'Poor' }
  }

  const getQualityScore = (server: TurnServerInfo) => {
    return Math.round((server.reliability + server.reputation) / 2)
  }

  return (
    <div className="space-y-6">
      {/* Optimization Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightning className="w-5 h-5" />
            VideoCamera Quality Optimization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Region Preference</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-Select</SelectItem>
                  <SelectItem value="US-East">US East</SelectItem>
                  <SelectItem value="EU-West">EU West</SelectItem>
                  <SelectItem value="Asia-Pacific">Asia Pacific</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quality Target</label>
              <Select value={qualityRequirement} onValueChange={setQualityRequirement}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UHD">UHD (4K)</SelectItem>
                  <SelectItem value="HD">HD (1080p)</SelectItem>
                  <SelectItem value="SD">SD (720p)</SelectItem>
                  <SelectItem value="LOW">Low (480p)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleOptimizeConnection} 
                disabled={isOptimizing}
                className="w-full"
              >
                {isOptimizing ? 'Optimizing...' : 'Optimize Connection'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Desktop Status */}
      {optimalServer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Active Desktop: {optimalServer.region}
              </span>
              <Badge variant="outline">{optimalServer.url}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Latency</p>
                <div className="flex items-center gap-2">
                  {(() => {
                    const indicator = getLatencyIndicator(optimalServer.latency)
                    return (
                      <>
                        <indicator.icon className={`w-4 h-4 ${indicator.color}`} />
                        <span className="font-semibold">{optimalServer.latency}ms</span>
                        <span className={`text-xs ${indicator.color}`}>({indicator.label})</span>
                      </>
                    )
                  })()}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Reliability</p>
                <div className="flex items-center gap-2">
                  <Progress value={optimalServer.reliability} className="flex-1 h-2" />
                  <span className="font-semibold">{optimalServer.reliability.toFixed(1)}%</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cost</p>
                <p className="font-semibold">{optimalServer.cost.toFixed(4)} PRIV/MB</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Quality Score</p>
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{getQualityScore(optimalServer)}/100</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleFailover} variant="outline" size="sm">
                Request Failover
              </Button>
              <Button onClick={reportQualityIssue} variant="outline" size="sm">
                Report Quality
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Quality Metrics */}
      {qualityMetrics && currentSessionId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <VideoCamera className="w-5 h-5" />
              Live Session Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bandwidth</span>
                  <span className="font-semibold">{qualityMetrics.bandwidth.toFixed(0)} kbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Latency</span>
                  <span className="font-semibold">{qualityMetrics.latency.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Packet Loss</span>
                  <span className="font-semibold">{(qualityMetrics.packetLoss * 100).toFixed(2)}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Jitter</span>
                  <span className="font-semibold">{qualityMetrics.jitter.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Quality</span>
                  <Badge variant="outline">{qualityMetrics.videoQuality}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Data Usage</span>
                  <span className="font-semibold">{qualityMetrics.dataTransferred.toFixed(1)} MB</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">User Satisfaction</span>
                  <div className="flex items-center gap-2">
                    <Progress value={qualityMetrics.userSatisfaction * 10} className="flex-1 h-2" />
                    <span className="font-semibold">{qualityMetrics.userSatisfaction}/10</span>
                  </div>
                </div>
                
                {(qualityMetrics.latency > 100 || qualityMetrics.packetLoss > 0.05) && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <Warning className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">Quality issues detected</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Servers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Available TURN Servers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {servers.map((server) => (
              <div 
                key={server.id}
                className={`p-4 border rounded-lg ${optimalServer?.id === server.id ? 'border-primary bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {(() => {
                        const indicator = getLatencyIndicator(server.latency)
                        return <indicator.icon className={`w-4 h-4 ${indicator.color}`} />
                      })()}
                    </div>
                    <div>
                      <p className="font-semibold">{server.region}</p>
                      <p className="text-xs text-muted-foreground">{server.url}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{server.latency}ms</p>
                      <p className="text-muted-foreground">Latency</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{server.reliability.toFixed(1)}%</p>
                      <p className="text-muted-foreground">Uptime</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{server.reputation}</p>
                      <p className="text-muted-foreground">Reputation</p>
                    </div>
                    <Badge variant={server.isActive ? 'default' : 'secondary'}>
                      {server.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}