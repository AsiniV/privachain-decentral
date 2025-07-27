/**
 * VideoCamera Call Service for PrivaChain
 * Implements WebRTC P2P calls with blockchain signaling and decentralized TURN servers
 */

import { gasFeeManager } from './GasFeeManager'
import { ipfsService } from './ipfs'

interface VideoSession {
  sessionId: string
  initiator: string
  receiver: string
  startTime: number
  status: 'initiating' | 'ringing' | 'connected' | 'ended' | 'failed'
  turnServers: string[]
  encrypted: boolean
  duration: number
  quality: 'sd' | 'hd' | '4k'
}

interface TurnServerNode {
  address: string
  region: string
  stake: number
  reputation: number
  latency: number
  cost: number // PRIV tokens per MB
}

interface CallStatistics {
  sessionId: string
  duration: number
  quality: string
  dataTransferred: number
  peerToPeer: boolean
  turnServerUsed?: string
  costPaid: number
}

interface WebRTCConfig {
  iceServers: RTCIceServer[]
  constraints: MediaStreamConstraints
  codecPreferences: string[]
}

/**
 * Decentralized VideoCamera Call Service
 */
export class VideoCallService {
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private peerConnection: RTCPeerConnection | null = null
  private currentSession: VideoSession | null = null
  private turnNodes: TurnServerNode[] = []
  private callStatistics: CallStatistics[] = []

  constructor() {
    this.initializeService()
  }

  /**
   * Initialize video call service with decentralized TURN servers
   */
  private async initializeService() {
    try {
      // Load available TURN server nodes from network
      await this.loadTurnServerNodes()
      
      console.log('📹 PrivaChain VideoCamera Service initialized')
      console.log('🌐 Decentralized TURN servers:', this.turnNodes.length)
      console.log('🔒 End-to-end DTLS-SRTP encryption enabled')
      console.log('⚡ WebRTC P2P optimization active')
    } catch (error) {
      console.error('VideoCamera service initialization failed:', error)
    }
  }

  /**
   * Initiate video call with another .prv domain user
   */
  async initiateCall(
    callerDomain: string,
    calleeDomain: string,
    options: {
      video: boolean
      audio: boolean
      quality: 'sd' | 'hd' | '4k'
      encryption: boolean
    } = { video: true, audio: true, quality: 'hd', encryption: true }
  ): Promise<{
    success: boolean
    sessionId?: string
    error?: string
  }> {
    try {
      // Check quota and gas fees
      const gasResult = await gasFeeManager.executeSponsoredOperation(
        callerDomain,
        'video_call_setup',
        {
          operation: 'initiateCall',
          callee: calleeDomain,
          options
        }
      )

      if (!gasResult.success) {
        return {
          success: false,
          error: gasResult.error || 'Gas fee payment failed'
        }
      }

      // Generate session ID
      const sessionId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

      // Select optimal TURN servers
      const selectedTurnServers = await this.selectOptimalTurnServers()

      // Create video session
      const session: VideoSession = {
        sessionId,
        initiator: callerDomain,
        receiver: calleeDomain,
        startTime: Date.now(),
        status: 'initiating',
        turnServers: selectedTurnServers.map(server => server.address),
        encrypted: options.encryption,
        duration: 0,
        quality: options.quality
      }

      this.currentSession = session

      // Get user media
      const constraints = this.getMediaConstraints(options)
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Set up WebRTC peer connection
      const rtcConfig = this.getWebRTCConfig(selectedTurnServers)
      this.peerConnection = new RTCPeerConnection(rtcConfig)

      // Set up peer connection event handlers
      this.setupPeerConnectionHandlers()

      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream)
        }
      })

      // Create offer
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      // Store session signaling data on blockchain via IPFS
      const signalingData = {
        sessionId,
        type: 'offer',
        sdp: offer.sdp,
        initiator: callerDomain,
        receiver: calleeDomain,
        turnServers: selectedTurnServers,
        timestamp: Date.now()
      }

      const ipfsResult = await ipfsService.uploadEncrypted(
        JSON.stringify(signalingData),
        await this.getSessionEncryptionKey(sessionId),
        { type: 'video_signaling', sessionId }
      )

      // Update session status
      session.status = 'ringing'

      console.log(`📞 VideoCamera call initiated:`, {
        session: sessionId,
        from: callerDomain,
        to: calleeDomain,
        quality: options.quality,
        turnServers: selectedTurnServers.length,
        signalingCID: ipfsResult.cid
      })

      return {
        success: true,
        sessionId
      }

    } catch (error) {
      console.error('VideoCamera call initiation failed:', error)
      
      // Clean up on failure
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop())
        this.localStream = null
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Call initiation failed'
      }
    }
  }

  /**
   * Answer incoming video call
   */
  async answerCall(
    sessionId: string,
    receiverDomain: string,
    accept: boolean
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      if (!accept) {
        // Reject call
        await this.endCall(sessionId, 'rejected')
        return { success: true }
      }

      // Get session from blockchain/IPFS
      const session = await this.getSessionFromBlockchain(sessionId)
      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        }
      }

      this.currentSession = session

      // Get user media
      const constraints = this.getMediaConstraints({
        video: true,
        audio: true,
        quality: session.quality,
        encryption: session.encrypted
      })
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Set up WebRTC with the same TURN servers
      const turnServers = await this.getTurnServersByAddress(session.turnServers)
      const rtcConfig = this.getWebRTCConfig(turnServers)
      this.peerConnection = new RTCPeerConnection(rtcConfig)

      // Set up event handlers
      this.setupPeerConnectionHandlers()

      // Add local stream
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream)
        }
      })

      // Get offer from signaling data
      const signalingData = await this.getSignalingData(sessionId)
      if (signalingData?.type === 'offer') {
        await this.peerConnection.setRemoteDescription({
          type: 'offer',
          sdp: signalingData.sdp
        })

        // Create answer
        const answer = await this.peerConnection.createAnswer()
        await this.peerConnection.setLocalDescription(answer)

        // Store answer on blockchain
        const answerData = {
          sessionId,
          type: 'answer',
          sdp: answer.sdp,
          receiver: receiverDomain,
          timestamp: Date.now()
        }

        await ipfsService.uploadEncrypted(
          JSON.stringify(answerData),
          await this.getSessionEncryptionKey(sessionId),
          { type: 'video_answer', sessionId }
        )

        // Update session status
        session.status = 'connected'

        console.log(`✅ VideoCamera call answered:`, {
          session: sessionId,
          receiver: receiverDomain,
          quality: session.quality
        })

        return { success: true }
      }

      return {
        success: false,
        error: 'Invalid signaling data'
      }

    } catch (error) {
      console.error('Answer call failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to answer call'
      }
    }
  }

  /**
   * End active video call
   */
  async endCall(
    sessionId: string,
    reason: 'normal' | 'rejected' | 'timeout' | 'error' = 'normal'
  ): Promise<{ success: boolean }> {
    try {
      if (this.currentSession?.sessionId === sessionId) {
        // Calculate call duration
        const duration = Date.now() - this.currentSession.startTime
        this.currentSession.duration = duration
        this.currentSession.status = 'ended'

        // Record call statistics
        const stats: CallStatistics = {
          sessionId,
          duration,
          quality: this.currentSession.quality,
          dataTransferred: await this.getDataTransferredEstimate(),
          peerToPeer: await this.isPeerToPeerConnection(),
          turnServerUsed: await this.getUsedTurnServer(),
          costPaid: await this.calculateTurnServerCost()
        }

        this.callStatistics.push(stats)

        // Store final session state on blockchain
        await this.storeSessionEnd(sessionId, reason, stats)

        console.log(`📞 Call ended:`, {
          session: sessionId,
          duration: `${Math.round(duration / 1000)}s`,
          reason,
          quality: this.currentSession.quality,
          cost: `${stats.costPaid} PRIV`
        })
      }

      // Clean up WebRTC connection
      if (this.peerConnection) {
        this.peerConnection.close()
        this.peerConnection = null
      }

      // Stop local media streams
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop())
        this.localStream = null
      }

      // Clear remote stream
      this.remoteStream = null
      this.currentSession = null

      return { success: true }

    } catch (error) {
      console.error('End call failed:', error)
      return { success: false }
    }
  }

  /**
   * Get current call status and statistics
   */
  getCurrentCallStatus(): {
    active: boolean
    session?: VideoSession
    localStream?: MediaStream
    remoteStream?: MediaStream
    connectionState?: RTCPeerConnectionState
    iceConnectionState?: RTCIceConnectionState
  } {
    return {
      active: !!this.currentSession && this.currentSession.status === 'connected',
      session: this.currentSession || undefined,
      localStream: this.localStream || undefined,
      remoteStream: this.remoteStream || undefined,
      connectionState: this.peerConnection?.connectionState,
      iceConnectionState: this.peerConnection?.iceConnectionState
    }
  }

  /**
   * Get call history and statistics
   */
  getCallHistory(_domain: string): {
    totalCalls: number
    totalDuration: number
    averageDuration: number
    recentCalls: CallStatistics[]
    costs: {
      total: number
      thisMonth: number
      turnServerFees: number
    }
  } {
    // For now, return all call statistics
    // TODO: Filter by domain when CallStatistics interface includes user information
    const userCalls = this.callStatistics

    const totalCalls = userCalls.length
    const totalDuration = userCalls.reduce((sum, call) => sum + call.duration, 0)
    const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0

    const totalCosts = userCalls.reduce((sum, call) => sum + call.costPaid, 0)
    // For this month calculation, assuming all recent calls are from this month
    // TODO: Add timestamp field to CallStatistics for proper filtering
    const thisMonth = userCalls.slice(-5).reduce((sum, call) => sum + call.costPaid, 0)

    return {
      totalCalls,
      totalDuration,
      averageDuration,
      recentCalls: userCalls.slice(-10), // Last 10 calls
      costs: {
        total: totalCosts,
        thisMonth,
        turnServerFees: totalCosts * 0.8 // Estimate 80% goes to TURN servers
      }
    }
  }

  /**
   * Load available TURN server nodes from network
   */
  private async loadTurnServerNodes(): Promise<void> {
    // In production, this would query the blockchain for registered TURN nodes
    // For now, simulate decentralized TURN servers
    this.turnNodes = [
      {
        address: 'turn:us-east-1.privchain.network:3478',
        region: 'us-east-1',
        stake: 100000,
        reputation: 0.98,
        latency: 45,
        cost: 0.001
      },
      {
        address: 'turn:eu-west-1.privchain.network:3478',
        region: 'eu-west-1',
        stake: 150000,
        reputation: 0.97,
        latency: 30,
        cost: 0.0008
      },
      {
        address: 'turn:asia-pacific.privchain.network:3478',
        region: 'asia-pacific',
        stake: 120000,
        reputation: 0.99,
        latency: 60,
        cost: 0.0012
      }
    ]
  }

  /**
   * Select optimal TURN servers based on latency and cost
   */
  private async selectOptimalTurnServers(): Promise<TurnServerNode[]> {
    // Sort by combination of reputation, latency, and cost
    const scored = this.turnNodes.map(node => ({
      ...node,
      score: node.reputation * 0.4 + (1 / node.latency) * 0.3 + (1 / node.cost) * 0.3
    }))

    scored.sort((a, b) => b.score - a.score)
    
    // Return top 3 TURN servers for redundancy
    return scored.slice(0, 3)
  }

  /**
   * Get WebRTC configuration with TURN servers
   */
  private getWebRTCConfig(turnServers: TurnServerNode[]): RTCConfiguration {
    const iceServers: RTCIceServer[] = [
      // Public STUN servers for initial connectivity
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      
      // Decentralized TURN servers
      ...turnServers.map(server => ({
        urls: server.address,
        username: 'privchain_user',
        credential: 'privchain_network_auth'
      }))
    ]

    return {
      iceServers,
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all'
    }
  }

  /**
   * Get media constraints based on call options
   */
  private getMediaConstraints(options: {
    video: boolean
    audio: boolean
    quality: 'sd' | 'hd' | '4k'
  }): MediaStreamConstraints {
    const videoConstraints = {
      sd: { width: 640, height: 480, frameRate: 30 },
      hd: { width: 1280, height: 720, frameRate: 30 },
      '4k': { width: 3840, height: 2160, frameRate: 30 }
    }

    return {
      video: options.video ? videoConstraints[options.quality] : false,
      audio: options.audio ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } : false
    }
  }

  /**
   * Set up WebRTC peer connection event handlers
   */
  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0]
      console.log('📹 Remote stream received')
    }

    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate && this.currentSession) {
        // Store ICE candidate on blockchain for signaling
        await this.storeIceCandidate(this.currentSession.sessionId, event.candidate)
      }
    }

    this.peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', this.peerConnection?.connectionState)
    }

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', this.peerConnection?.iceConnectionState)
    }
  }

  /**
   * Generate session-specific encryption key
   */
  private async getSessionEncryptionKey(sessionId: string): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(sessionId + '_video_key'),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('privchain_video_salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Mock methods for blockchain integration (would be real in production)
   */
  private async getSessionFromBlockchain(sessionId: string): Promise<VideoSession | null> {
    // Mock implementation - would query blockchain
    return this.currentSession?.sessionId === sessionId ? this.currentSession : null
  }

  private async getSignalingData(_sessionId: string): Promise<{ type: string; sdp: string }> {
    // Mock implementation - would fetch from IPFS
    return { type: 'offer', sdp: 'mock_sdp_data' }
  }

  private async getTurnServersByAddress(addresses: string[]): Promise<TurnServerNode[]> {
    return this.turnNodes.filter(node => addresses.includes(node.address))
  }

  private async storeIceCandidate(sessionId: string, candidate: RTCIceCandidate): Promise<void> {
    // Mock implementation - would store on blockchain
    console.log('📡 ICE candidate stored:', candidate.candidate?.slice(0, 20) + '...')
  }

  private async storeSessionEnd(sessionId: string, reason: string, stats: CallStatistics): Promise<void> {
    // Mock implementation - would store final state on blockchain
    console.log('💾 Session end stored:', { sessionId, reason, duration: stats.duration })
  }

  private async getDataTransferredEstimate(): Promise<number> {
    // Mock implementation - would calculate from WebRTC stats
    return Math.random() * 100 * 1024 * 1024 // Random MB
  }

  private async isPeerToPeerConnection(): Promise<boolean> {
    // Mock implementation - would check if TURN was used
    return Math.random() > 0.3 // 70% P2P success rate
  }

  private async getUsedTurnServer(): Promise<string | undefined> {
    // Mock implementation - would check which TURN server was used
    return this.turnNodes[0]?.address
  }

  private async calculateTurnServerCost(): Promise<number> {
    // Mock implementation - would calculate based on data transfer
    return Math.random() * 0.01 // Random PRIV cost
  }
}

// Export singleton instance
export const videoCallService = new VideoCallService()

// Export types
export type { VideoSession, TurnServerNode, CallStatistics, WebRTCConfig }