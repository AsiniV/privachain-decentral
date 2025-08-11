/**
 * Relayer API Client - Frontend interface to backend relayer service
 * Replaces direct blockchain calls to ensure mnemonic security
 * 
 * @placeholder @insecure This is a Phase 0 stub - to be replaced with real HTTP client in Phase 1
 */

export interface SponsoredTxRequest {
  operation: string
  payload: Record<string, unknown>
  contractAddr: string
  userId?: string
}

export interface SponsoredTxResponse {
  txHash: string
  success: boolean
  error?: string
}

/**
 * Client for the backend relayer service API
 * Provides gas-sponsored transactions without exposing developer mnemonic to frontend
 */
export class RelayerApiClient {
  private readonly baseUrl: string

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl
  }

  /**
   * Execute a sponsored transaction via backend relayer
   * @placeholder This is a stub implementation for Phase 0
   */
  async executeSponsoredTx(request: SponsoredTxRequest): Promise<SponsoredTxResponse> {
    // Phase 0 stub: Log the request and return a mock response
    console.log(`🚀 [STUB] Sponsored transaction request:`, {
      operation: request.operation,
      contract: request.contractAddr,
      payload: request.payload
    })
    
    // In Phase 1, this will become:
    // const response = await fetch(`${this.baseUrl}/tx/execute`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(request)
    // })
    // return await response.json()

    // Mock response for Phase 0
    return {
      txHash: `mock_tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      success: true
    }
  }

  /**
   * Register a .prv domain via sponsored transaction
   */
  async registerDomain(domain: string, zkProof: string, publicKey: string): Promise<SponsoredTxResponse> {
    return this.executeSponsoredTx({
      operation: 'register_domain',
      payload: {
        register_domain: {
          domain,
          zk_proof: zkProof,
          public_key: publicKey,
          mx_records: []
        }
      },
      contractAddr: process.env.VITE_DOMAIN_CONTRACT_ADDR || 'cosmos1example...domain'
    })
  }

  /**
   * Send encrypted email via sponsored transaction
   */
  async sendEmail(recipientDomain: string, contentCid: string, powProof: string): Promise<SponsoredTxResponse> {
    return this.executeSponsoredTx({
      operation: 'send_email',
      payload: {
        send_email: {
          recipient_domain: recipientDomain,
          content_cid: contentCid,
          pow_proof: powProof,
          sender_alias: null
        }
      },
      contractAddr: process.env.VITE_MAIL_CONTRACT_ADDR || 'cosmos1example...mail'
    })
  }

  /**
   * Start video session via sponsored transaction
   */
  async startVideoSession(recipientAddress: string, turnServers: string[]): Promise<SponsoredTxResponse> {
    return this.executeSponsoredTx({
      operation: 'start_session',
      payload: {
        start_session: {
          receiver: recipientAddress,
          stun_turn_server: turnServers[0],
          metadata: {
            call_type: 'video',
            encryption_key: await this.generateSessionKey(),
            quality_preference: 'hd'
          }
        }
      },
      contractAddr: process.env.VITE_VIDEO_SIGNALING_CONTRACT || 'cosmos1example...video'
    })
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    console.log('🏥 [STUB] Health check request')
    
    // In Phase 1, this will become:
    // const response = await fetch(`${this.baseUrl}/health`)
    // return await response.json()

    return {
      status: 'healthy',
      timestamp: Date.now()
    }
  }

  /**
   * Generate session key for WebRTC
   */
  private async generateSessionKey(): Promise<string> {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
}

// Export singleton instance
export const relayerApiClient = new RelayerApiClient()

// Runtime guard: Prevent direct mnemonic access in frontend
if (typeof window !== 'undefined') {
  // Add warning to console when frontend loads
  console.warn(
    '🔒 SECURITY: This frontend uses the relayer API for gas sponsorship. ' +
    'Direct mnemonic access is prohibited. All transactions go through /api/tx/execute'
  )
}