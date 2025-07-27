import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react'
import { useKV } from '../hooks/useKV'
import { VideoCall } from './VideoCall'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback } from './ui/avatar'
import { 
  VideoCamera, 
  PhoneCall,
  PhoneX,
  Coins,
  Globe
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useVideoSignaling } from '../blockchain/VideoSignaling'

interface CallState {
  type: 'video' | 'audio' | null
  contact?: {
    id: string
    name: string
    address: string
  }
  isIncoming: boolean
  status: 'idle' | 'ringing' | 'connecting' | 'active' | 'ended'
  sessionId?: string
  turnRelay?: string
}

interface Contact {
  id: string
  name: string
  address: string
  online: boolean
}

interface VideoCallContextType {
  initiateCall: (contact: Contact, type: 'video' | 'audio') => void
  callState: CallState
  isInCall: boolean
}

const VideoCallContext = createContext<VideoCallContextType | null>(null)

export function VideoCallProvider({ children }: { children: ReactNode }) {
  const [callState, setCallState] = useKV<CallState>('call-state', {
    type: null,
    isIncoming: false,
    status: 'idle'
  })
  
  const [incomingCallTimer, setIncomingCallTimer] = useState(0)
  const { startSession, acceptSession, endSession, turnRelays } = useVideoSignaling()

  // Demo: Simulate incoming calls occasionally
  useEffect(() => {
    if (callState.status === 'idle') {
      const simulateIncomingCall = () => {
        // 20% chance of receiving a demo call every 15 seconds
        if (Math.random() > 0.8) {
          const demoContact = {
            id: 'demo',
            name: 'Demo Caller',
            address: 'demo.prv'
          }
          
          setCallState({
            type: Math.random() > 0.5 ? 'video' : 'audio',
            contact: demoContact,
            isIncoming: true,
            status: 'ringing',
            sessionId: `demo_${Date.now()}`,
            turnRelay: turnRelays[0]?.address || 'turn1.privachain.network:3478'
          })
          
          toast.info('Demo incoming call')
        }
      }

      const interval = setInterval(simulateIncomingCall, 15000)
      return () => clearInterval(interval)
    }
  }, [callState.status, turnRelays, setCallState])

  const declineCall = useCallback(() => {
    setCallState({
      type: null,
      isIncoming: false,
      status: 'idle'
    })
    
    toast.info('Call declined')
  }, [setCallState])

  // Incoming call timer
  useEffect(() => {
    if (callState.status === 'ringing' && callState.isIncoming) {
      const timer = setInterval(() => {
        setIncomingCallTimer(prev => {
          if (prev >= 30) { // Auto-decline after 30 seconds
            declineCall()
            return 0
          }
          return prev + 1
        })
      }, 1000)

      return () => {
        clearInterval(timer)
        setIncomingCallTimer(0)
      }
    }
  }, [callState.status, callState.isIncoming, setCallState, declineCall])

  const initiateCall = async (contact: Contact, type: 'video' | 'audio') => {
    if (!contact.online) {
      toast.error(`${contact.name} is offline`)
      return
    }

    try {
      // Generate mock SDP offer
      const sdpOffer = `v=0\no=user ${Date.now()} 2 IN IP4 127.0.0.1\ns=PrivaChain ${type} call\nc=IN IP4 127.0.0.1\nt=0 0\nm=${type === 'video' ? 'video' : 'audio'} 9 UDP/TLS/RTP/SAVPF 96\na=rtcp:9 IN IP4 127.0.0.1`

      // Start blockchain session
      const sessionId = await startSession(contact.address, type, sdpOffer)
      
      setCallState({
        type,
        contact,
        isIncoming: false,
        status: 'connecting',
        sessionId,
        turnRelay: turnRelays[0]?.address || 'turn1.privachain.network:3478'
      })

      toast.success(`Blockchain session ${sessionId} created for ${type} call`)
    } catch (error) {
      toast.error(`Failed to initiate call: ${error}`)
    }
  }

  const acceptCall = async () => {
    try {
      if (callState.sessionId) {
        // Generate mock SDP answer
        const sdpAnswer = `v=0\no=user ${Date.now()} 2 IN IP4 127.0.0.1\ns=PrivaChain response\nc=IN IP4 127.0.0.1\nt=0 0\nm=${callState.type === 'video' ? 'video' : 'audio'} 9 UDP/TLS/RTP/SAVPF 96\na=rtcp:9 IN IP4 127.0.0.1`
        
        await acceptSession(callState.sessionId, sdpAnswer)
      }
      
      setCallState(prev => ({
        ...prev,
        status: 'active'
      }))
      
      toast.success('Call accepted - WebRTC connection established')
    } catch (error) {
      toast.error(`Failed to accept call: ${error}`)
    }
  }

  const endCall = async () => {
    try {
      if (callState.sessionId) {
        // Simulate data transfer amount (MB)
        const dataTransferred = Math.floor(Math.random() * 100) + 10
        await endSession(callState.sessionId, dataTransferred)
      }
      
      setCallState({
        type: null,
        isIncoming: false,
        status: 'idle'
      })
      
      toast.success('Call ended - TURN relay compensated')
    } catch (error) {
      toast.error(`Failed to end call properly: ${error}`)
      
      // Force end call even if blockchain transaction fails
      setCallState({
        type: null,
        isIncoming: false,
        status: 'idle'
      })
    }
  }

  const contextValue: VideoCallContextType = {
    initiateCall,
    callState,
    isInCall: callState.status !== 'idle'
  }

  return (
    <VideoCallContext.Provider value={contextValue}>
      {children}
      
      {/* Incoming call overlay */}
      {callState.status === 'ringing' && callState.isIncoming && callState.contact && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md w-full mx-4">
            <div className="mb-6">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarFallback className="text-3xl">
                  {callState.contact.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <h3 className="text-2xl font-semibold mb-2">{callState.contact.name}</h3>
              <Badge variant="outline" className="font-mono text-sm mb-2">
                {callState.contact.address}
              </Badge>
              
              {callState.sessionId && (
                <Badge variant="secondary" className="font-mono text-xs mb-2 gap-1">
                  <Globe className="w-3 h-3" />
                  Session: {callState.sessionId}
                </Badge>
              )}
              
              {callState.turnRelay && (
                <Badge variant="outline" className="font-mono text-xs mb-2 gap-1">
                  <Coins className="w-3 h-3" />
                  TURN: {callState.turnRelay}
                </Badge>
              )}
              
              <div className="flex items-center justify-center gap-2 mb-4">
                {callState.type === 'video' ? (
                  <VideoCamera className="w-5 h-5" />
                ) : (
                  <PhoneCall className="w-5 h-5" />
                )}
                <span className="text-lg">
                  Incoming {callState.type} call
                </span>
              </div>
              
              <div className="text-muted-foreground">
                <div className="animate-pulse mb-2">📞 Ringing...</div>
                <div className="text-sm">
                  Auto-decline in {30 - incomingCallTimer}s
                </div>
              </div>
            </div>
            
            <div className="flex justify-center gap-6">
              <Button 
                size="lg"
                variant="destructive"
                onClick={declineCall}
                className="rounded-full w-16 h-16 p-0"
              >
                <PhoneX className="w-8 h-8" />
              </Button>
              
              <Button 
                size="lg"
                className="bg-green-600 hover:bg-green-700 rounded-full w-16 h-16 p-0"
                onClick={acceptCall}
              >
                {callState.type === 'video' ? (
                  <VideoCamera className="w-8 h-8" />
                ) : (
                  <PhoneCall className="w-8 h-8" />
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Active call */}
      {callState.status === 'active' && callState.contact && (
        <VideoCall
          contact={callState.contact}
          onEndCall={endCall}
          isIncoming={callState.isIncoming}
        />
      )}
    </VideoCallContext.Provider>
  )
}

export function useVideoCall() {
  const context = useContext(VideoCallContext)
  if (!context) {
    throw new Error('useVideoCall must be used within a VideoCallProvider')
  }
  return context
}