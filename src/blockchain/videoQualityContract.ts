/**
 * Smart Contract for Decentralized Video Quality Optimization
 * Manages TURN server selection, quality metrics, and economic incentives
 */

export interface VideoQualityContract {
  // Server registration and management
  registerTurnServer: (url: string, region: string, stake: number) => Promise<string>
  updateServerMetrics: (serverId: string, latency: number, reliability: number) => Promise<void>
  deactivateServer: (serverId: string) => Promise<void>
  
  // Quality optimization
  requestOptimalServer: (userLocation: string, qualityRequirement: string) => Promise<TurnServerInfo>
  reportQualityMetrics: (sessionId: string, metrics: QualityReport) => Promise<void>
  requestServerFailover: (sessionId: string, currentServerId: string) => Promise<TurnServerInfo>
  
  // Economic functions
  stakeForServer: (serverId: string, amount: number) => Promise<void>
  claimRewards: (serverId: string) => Promise<number>
  penalizeServer: (serverId: string, penalty: number) => Promise<void>
  
  // Reputation system
  reportServerIssue: (serverId: string, issueType: string, evidence: string) => Promise<void>
  voteOnReputation: (serverId: string, vote: boolean) => Promise<void>
  
  // Analytics
  getServerStats: (serverId: string) => Promise<ServerStats>
  getGlobalQualityMetrics: () => Promise<GlobalMetrics>
  getUserOptimizationHistory: (userAddress: string) => Promise<OptimizationEvent[]>
}

export interface TurnServerInfo {
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

export interface QualityReport {
  sessionId: string
  serverId: string
  bandwidth: number
  latency: number
  packetLoss: number
  jitter: number
  videoQuality: string
  duration: number
  dataTransferred: number
  userSatisfaction: number // 1-10 rating
}

export interface ServerStats {
  totalSessions: number
  averageLatency: number
  uptimePercentage: number
  totalRevenueEarned: number
  qualityRating: number
  reportedIssues: number
  slashingEvents: number
}

export interface GlobalMetrics {
  totalServers: number
  activeServers: number
  averageLatency: number
  totalSessionsToday: number
  totalBandwidthServed: number
  averageQualityScore: number
}

export interface OptimizationEvent {
  timestamp: number
  sessionId: string
  originalServer: string
  optimizedServer: string
  qualityImprovement: number
  costSavings: number
  reason: string
}

/**
 * Mock implementation of the video quality smart contract
 * In production, this would interact with actual Cosmos blockchain
 */
export class MockVideoQualityContract implements VideoQualityContract {
  private servers: Map<string, TurnServerInfo> = new Map()
  private sessions: Map<string, QualityReport[]> = new Map()
  private optimizationHistory: OptimizationEvent[] = []
  private reputationVotes: Map<string, { positive: number; negative: number }> = new Map()

  constructor() {
    this.initializeDefaultServers()
  }

  private initializeDefaultServers() {
    const defaultServers: TurnServerInfo[] = [
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

    defaultServers.forEach(server => {
      this.servers.set(server.id, server)
      this.reputationVotes.set(server.id, { positive: 0, negative: 0 })
    })
  }

  async registerTurnServer(url: string, region: string, stake: number): Promise<string> {
    const serverId = `server-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    
    const server: TurnServerInfo = {
      id: serverId,
      url,
      region,
      latency: 0, // Will be updated through metrics
      reliability: 0,
      cost: 0.001, // Default cost
      reputation: 50, // Starting neutral reputation
      stake,
      isActive: false, // Requires approval
      supportedQualities: ['HD', 'SD'],
      operatorAddress: '0x0000...0000' // Mock address
    }

    this.servers.set(serverId, server)
    this.reputationVotes.set(serverId, { positive: 0, negative: 0 })

    console.log(`Registered new TURN server: ${serverId} in ${region}`)
    return serverId
  }

  async updateServerMetrics(serverId: string, latency: number, reliability: number): Promise<void> {
    const server = this.servers.get(serverId)
    if (!server) throw new Error('Server not found')

    server.latency = latency
    server.reliability = reliability
    server.isActive = reliability > 90 // Auto-activate reliable servers

    this.servers.set(serverId, server)
    console.log(`Updated metrics for server ${serverId}: ${latency}ms, ${reliability}% uptime`)
  }

  async deactivateServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId)
    if (!server) throw new Error('Server not found')

    server.isActive = false
    this.servers.set(serverId, server)
    console.log(`Deactivated server ${serverId}`)
  }

  async requestOptimalServer(userLocation: string, qualityRequirement: string): Promise<TurnServerInfo> {
    const activeServers = Array.from(this.servers.values()).filter(s => s.isActive)
    
    if (activeServers.length === 0) {
      throw new Error('No active servers available')
    }

    // Smart selection algorithm considering multiple factors
    const scoredServers = activeServers.map(server => {
      let score = 0
      
      // Latency score (40% weight)
      score += Math.max(0, 100 - server.latency) * 0.4
      
      // Reliability score (25% weight)  
      score += server.reliability * 0.25
      
      // Cost efficiency score (15% weight)
      score += Math.max(0, 100 - (server.cost * 1000)) * 0.15
      
      // Reputation score (20% weight)
      score += server.reputation * 0.20

      // Quality support bonus
      if (server.supportedQualities.includes(qualityRequirement)) {
        score += 10
      }

      return { server, score }
    })

    // Sort by score and return best server
    scoredServers.sort((a, b) => b.score - a.score)
    const optimalServer = scoredServers[0].server

    console.log(`Selected optimal server: ${optimalServer.id} (score: ${scoredServers[0].score.toFixed(2)})`)
    return optimalServer
  }

  async reportQualityMetrics(sessionId: string, metrics: QualityReport): Promise<void> {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, [])
    }

    this.sessions.get(sessionId)!.push(metrics)
    
    // Update server reputation based on quality metrics
    const server = this.servers.get(metrics.serverId)
    if (server) {
      const qualityScore = this.calculateQualityScore(metrics)
      const reputationChange = (qualityScore - 50) * 0.1 // Gradual reputation adjustment
      server.reputation = Math.max(0, Math.min(100, server.reputation + reputationChange))
      this.servers.set(metrics.serverId, server)
    }

    console.log(`Reported quality metrics for session ${sessionId}`)
  }

  private calculateQualityScore(metrics: QualityReport): number {
    let score = 100

    // Penalize high latency
    if (metrics.latency > 100) score -= 20
    else if (metrics.latency > 50) score -= 10

    // Penalize packet loss
    score -= metrics.packetLoss * 10

    // Penalize jitter
    score -= metrics.jitter * 2

    // Reward user satisfaction
    score += (metrics.userSatisfaction - 5) * 5

    return Math.max(0, Math.min(100, score))
  }

  async requestServerFailover(sessionId: string, currentServerId: string): Promise<TurnServerInfo> {
    console.log(`Failover requested for session ${sessionId}, current server: ${currentServerId}`)
    
    // Mark current server as having issues
    const currentServer = this.servers.get(currentServerId)
    if (currentServer) {
      currentServer.reliability = Math.max(0, currentServer.reliability - 5)
      currentServer.reputation = Math.max(0, currentServer.reputation - 2)
      this.servers.set(currentServerId, currentServer)
    }

    // Find alternative server (exclude current one)
    const alternatives = Array.from(this.servers.values())
      .filter(s => s.isActive && s.id !== currentServerId)
      .sort((a, b) => (b.reliability * b.reputation) - (a.reliability * a.reputation))

    if (alternatives.length === 0) {
      throw new Error('No alternative servers available')
    }

    const failoverServer = alternatives[0]
    
    // Record optimization event
    this.optimizationHistory.push({
      timestamp: Date.now(),
      sessionId,
      originalServer: currentServerId,
      optimizedServer: failoverServer.id,
      qualityImprovement: 20, // Estimated improvement
      costSavings: 0,
      reason: 'Server failover due to quality issues'
    })

    console.log(`Failover completed: switched to ${failoverServer.id}`)
    return failoverServer
  }

  async stakeForServer(serverId: string, amount: number): Promise<void> {
    const server = this.servers.get(serverId)
    if (!server) throw new Error('Server not found')

    server.stake += amount
    this.servers.set(serverId, server)
    console.log(`Added ${amount} PRIV stake to server ${serverId}`)
  }

  async claimRewards(serverId: string): Promise<number> {
    const server = this.servers.get(serverId)
    if (!server) throw new Error('Server not found')

    // Calculate rewards based on performance
    const baseReward = 10
    const performanceMultiplier = (server.reliability / 100) * (server.reputation / 100)
    const reward = baseReward * performanceMultiplier

    console.log(`Claimed ${reward.toFixed(4)} PRIV rewards for server ${serverId}`)
    return reward
  }

  async penalizeServer(serverId: string, penalty: number): Promise<void> {
    const server = this.servers.get(serverId)
    if (!server) throw new Error('Server not found')

    server.stake = Math.max(0, server.stake - penalty)
    server.reputation = Math.max(0, server.reputation - penalty / 10)
    
    if (server.stake < 1000) {
      server.isActive = false // Deactivate under-staked servers
    }

    this.servers.set(serverId, server)
    console.log(`Penalized server ${serverId}: ${penalty} PRIV slashed`)
  }

  async reportServerIssue(serverId: string, issueType: string, evidence: string): Promise<void> {
    const server = this.servers.get(serverId)
    if (!server) throw new Error('Server not found')

    console.log(`Issue reported for server ${serverId}: ${issueType}`)
    
    // Automatically reduce reputation for reported issues
    server.reputation = Math.max(0, server.reputation - 1)
    this.servers.set(serverId, server)
  }

  async voteOnReputation(serverId: string, vote: boolean): Promise<void> {
    const votes = this.reputationVotes.get(serverId)
    if (!votes) throw new Error('Server not found')

    if (vote) {
      votes.positive++
    } else {
      votes.negative++
    }

    this.reputationVotes.set(serverId, votes)
    
    // Update server reputation based on votes
    const server = this.servers.get(serverId)
    if (server) {
      const totalVotes = votes.positive + votes.negative
      if (totalVotes > 0) {
        const positiveRatio = votes.positive / totalVotes
        server.reputation = positiveRatio * 100
        this.servers.set(serverId, server)
      }
    }

    console.log(`Vote recorded for server ${serverId}: ${vote ? 'positive' : 'negative'}`)
  }

  async getServerStats(serverId: string): Promise<ServerStats> {
    const server = this.servers.get(serverId)
    if (!server) throw new Error('Server not found')

    // Mock statistics - in production would come from blockchain data
    return {
      totalSessions: Math.floor(Math.random() * 1000) + 100,
      averageLatency: server.latency,
      uptimePercentage: server.reliability,
      totalRevenueEarned: Math.random() * 100,
      qualityRating: server.reputation / 10,
      reportedIssues: Math.floor(Math.random() * 5),
      slashingEvents: Math.floor(Math.random() * 2)
    }
  }

  async getGlobalQualityMetrics(): Promise<GlobalMetrics> {
    const allServers = Array.from(this.servers.values())
    const activeServers = allServers.filter(s => s.isActive)

    return {
      totalServers: allServers.length,
      activeServers: activeServers.length,
      averageLatency: activeServers.reduce((sum, s) => sum + s.latency, 0) / activeServers.length,
      totalSessionsToday: Math.floor(Math.random() * 10000) + 1000,
      totalBandwidthServed: Math.random() * 1000,
      averageQualityScore: activeServers.reduce((sum, s) => sum + s.reputation, 0) / activeServers.length
    }
  }

  async getUserOptimizationHistory(userAddress: string): Promise<OptimizationEvent[]> {
    // Return recent optimization events (in production, filter by user)
    return this.optimizationHistory.slice(-10)
  }
}

// Export singleton instance
export const videoQualityContract = new MockVideoQualityContract()