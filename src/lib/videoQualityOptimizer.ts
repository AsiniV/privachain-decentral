/**
 * Advanced Video Quality Optimizer for Decentralized TURN Servers
 * Implements intelligent server selection and adaptive quality management
 */

export interface TurnServer {
  id: string
  url: string
  region: string
  latency: number
  reliability: number
  cost: number
  reputation: number
  stake: number
  isActive: boolean
  supportedQualities: string[]
  operatorAddress: string
}

export interface OptimizationSettings {
  preferredQuality: 'auto' | 'UHD' | 'HD' | 'SD' | 'LOW'
  maxCostPerMinute: number
  prioritizeLatency: boolean
  allowFallback: boolean
  enableAdaptiveBitrate: boolean
  maxServersToTest: number
}

export interface QualityProfile {
  resolution: string
  bitrate: number
  framerate: number
  codec: string
}

export interface UsageStats {
  server: TurnServer
  dataTransferred: number
  cost: number
  sessionDuration: number
  qualityMetrics: {
    averageLatency: number
    packetLoss: number
    jitter: number
  }
}

export class VideoQualityOptimizer {
  private settings: OptimizationSettings
  private availableServers: TurnServer[] = []
  private currentServer: TurnServer | null = null
  private usageStats: UsageStats | null = null
  private qualityProfile: QualityProfile | null = null
  private isActive: boolean = false

  constructor(settings: OptimizationSettings) {
    this.settings = settings
    this.initializeServers()
  }

  private initializeServers() {
    // Mock TURN servers for demonstration
    this.availableServers = [
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
  }

  async selectOptimalServer(): Promise<TurnServer> {
    const activeServers = this.availableServers.filter(s => s.isActive)
    
    if (activeServers.length === 0) {
      throw new Error('No active TURN servers available')
    }

    // Score servers based on multiple criteria
    const scoredServers = activeServers.map(server => {
      let score = 0

      // Latency score (40% weight)
      if (this.settings.prioritizeLatency) {
        score += Math.max(0, 100 - server.latency) * 0.4
      } else {
        score += Math.max(0, 100 - server.latency) * 0.2
      }

      // Reliability score (25% weight)
      score += server.reliability * 0.25

      // Cost efficiency (15% weight)
      const costScore = Math.max(0, 100 - (server.cost / this.settings.maxCostPerMinute * 100))
      score += costScore * 0.15

      // Reputation (20% weight)
      score += server.reputation * 0.20

      // Quality support bonus
      const targetQuality = this.settings.preferredQuality === 'auto' ? 'HD' : this.settings.preferredQuality
      if (server.supportedQualities.includes(targetQuality)) {
        score += 10
      }

      return { server, score }
    })

    // Sort by score and select best
    scoredServers.sort((a, b) => b.score - a.score)
    this.currentServer = scoredServers[0].server

    console.log(`Selected optimal TURN server: ${this.currentServer.region} (score: ${scoredServers[0].score.toFixed(2)})`)
    return this.currentServer
  }

  async adaptVideoQuality(): Promise<QualityProfile> {
    if (!this.currentServer) {
      throw new Error('No server selected')
    }

    let targetQuality = this.settings.preferredQuality

    // Auto-select quality based on server capabilities and network conditions
    if (targetQuality === 'auto') {
      if (this.currentServer.latency < 50 && this.currentServer.reliability > 95) {
        targetQuality = this.currentServer.supportedQualities.includes('UHD') ? 'UHD' : 'HD'
      } else if (this.currentServer.latency < 100) {
        targetQuality = 'HD'
      } else {
        targetQuality = 'SD'
      }
    }

    // Generate quality profile
    this.qualityProfile = this.generateQualityProfile(targetQuality)
    
    console.log(`Adapted video quality: ${this.qualityProfile.resolution} @ ${this.qualityProfile.bitrate}kbps`)
    return this.qualityProfile
  }

  private generateQualityProfile(quality: string): QualityProfile {
    const profiles: Record<string, QualityProfile> = {
      'UHD': {
        resolution: '3840x2160',
        bitrate: 8000,
        framerate: 30,
        codec: 'AV1'
      },
      'HD': {
        resolution: '1920x1080',
        bitrate: 2500,
        framerate: 30,
        codec: 'VP9'
      },
      'SD': {
        resolution: '1280x720',
        bitrate: 1000,
        framerate: 30,
        codec: 'VP8'
      },
      'LOW': {
        resolution: '640x480',
        bitrate: 500,
        framerate: 24,
        codec: 'VP8'
      }
    }

    return profiles[quality] || profiles['HD']
  }

  async handleServerFailover(): Promise<TurnServer> {
    if (!this.currentServer) {
      throw new Error('No current server to failover from')
    }

    console.log(`Initiating failover from ${this.currentServer.region}`)

    // Mark current server as having issues
    this.currentServer.reliability = Math.max(0, this.currentServer.reliability - 5)
    this.currentServer.reputation = Math.max(0, this.currentServer.reputation - 2)

    // Find alternative server (exclude current one)
    const alternatives = this.availableServers
      .filter(s => s.isActive && s.id !== this.currentServer!.id)
      .sort((a, b) => (b.reliability * b.reputation) - (a.reliability * a.reputation))

    if (alternatives.length === 0) {
      throw new Error('No alternative servers available for failover')
    }

    const failoverServer = alternatives[0]
    this.currentServer = failoverServer

    // Re-adapt quality for new server
    await this.adaptVideoQuality()

    console.log(`Failover completed: switched to ${failoverServer.region}`)
    return failoverServer
  }

  updateSettings(newSettings: Partial<OptimizationSettings>) {
    this.settings = { ...this.settings, ...newSettings }
    console.log('Video quality optimizer settings updated')
  }

  startSession() {
    this.isActive = true
    this.initializeUsageTracking()
  }

  private initializeUsageTracking() {
    if (!this.currentServer) return

    this.usageStats = {
      server: this.currentServer,
      dataTransferred: 0,
      cost: 0,
      sessionDuration: 0,
      qualityMetrics: {
        averageLatency: this.currentServer.latency,
        packetLoss: 0,
        jitter: 0
      }
    }

    // Simulate real-time usage tracking
    const trackingInterval = setInterval(() => {
      if (!this.isActive || !this.usageStats) {
        clearInterval(trackingInterval)
        return
      }

      // Simulate data transfer (random 1-5 MB per minute)
      const dataTransferredMB = Math.random() * 4 + 1
      this.usageStats.dataTransferred += dataTransferredMB
      this.usageStats.cost += dataTransferredMB * this.currentServer!.cost
      this.usageStats.sessionDuration += 1

      // Update quality metrics
      this.usageStats.qualityMetrics.averageLatency = 
        this.currentServer!.latency + (Math.random() * 20 - 10) // ±10ms variance
      this.usageStats.qualityMetrics.packetLoss = Math.random() * 0.02 // 0-2%
      this.usageStats.qualityMetrics.jitter = Math.random() * 10 // 0-10ms

    }, 60000) // Update every minute
  }

  getUsageStats(): UsageStats | null {
    return this.usageStats
  }

  getCurrentServer(): TurnServer | null {
    return this.currentServer
  }

  getCurrentMetrics() {
    if (!this.currentServer || !this.usageStats) {
      return null
    }
    
    return {
      server: this.currentServer,
      latency: this.usageStats.qualityMetrics.averageLatency,
      packetLoss: this.usageStats.qualityMetrics.packetLoss,
      jitter: this.usageStats.qualityMetrics.jitter,
      dataTransferred: this.usageStats.dataTransferred,
      cost: this.usageStats.cost
    }
  }

  getQualityProfile(): QualityProfile | null {
    return this.qualityProfile
  }

  endSession() {
    this.isActive = false
    console.log('Video quality optimizer session ended')
  }

  destroy() {
    this.endSession()
    this.currentServer = null
    this.usageStats = null
    this.qualityProfile = null
  }
}

export function createVideoQualityOptimizer(settings: OptimizationSettings): VideoQualityOptimizer {
  return new VideoQualityOptimizer(settings)
}