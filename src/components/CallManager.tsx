import { useState, useEffect } from 'react'
import { useKV } from '../hooks/useKV'
import { VideoCall } from './VideoCall'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback } from './ui/avatar'
import { 
  VideoCamera, 
  PhoneCall,
  PhoneX
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CallState {
  type: 'video' | 'audio' | null
  contact?: {
    id: string
    name: string
    address: string
  }
  isIncoming: boolean
  status: 'idle' | 'ringing' | 'connecting' | 'active' | 'ended'
}

interface Contact {
  id: string
  name: string
  address: string
  online: boolean
}

interface CallManagerProps {
  contacts: Contact[]
  onCallStatusChange?: (status: string) => void
}

export function CallManager({ contacts, onCallStatusChange }: CallManagerProps) {
  const [callState, setCallState] = useKV<CallState>('call-state', {
    type: null,
    isIncoming: false,
    status: 'idle'
  })
  
  const [incomingCallTimer, setIncomingCallTimer] = useState(0)

  // Simulate incoming calls for demo
  useEffect(() => {
    if (callState.status === 'idle') {
      // Simulate random incoming calls
      const simulateIncomingCall = () => {
        if (Math.random() > 0.8) { // 20% chance every 10 seconds
          const randomContact = contacts[Math.floor(Math.random() * contacts.length)]
          if (randomContact?.online) {
            initiateIncomingCall(randomContact, 'video')
          }
        }
      }

      const interval = setInterval(simulateIncomingCall, 10000)
      return () => clearInterval(interval)
    }
  }, [callState.status, contacts, initiateIncomingCall])

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
  }, [callState.status, callState.isIncoming, declineCall])

  // Update call status for parent component
  useEffect(() => {
    onCallStatusChange?.(callState.status)
  }, [callState.status, onCallStatusChange])

  const initiateCall = (contact: Contact, type: 'video' | 'audio') => {
    if (!contact.online) {
      toast.error(`${contact.name} is offline`)
      return
    }

    setCallState({
      type,
      contact,
      isIncoming: false,
      status: 'connecting'
    })

    toast.info(`Starting ${type} call with ${contact.name}`)
  }

  const initiateIncomingCall = (contact: Contact, type: 'video' | 'audio') => {
    setCallState({
      type,
      contact,
      isIncoming: true,
      status: 'ringing'
    })

    // Play notification sound (simulated)
    toast.info(`Incoming ${type} call from ${contact.name}`)
  }

  const acceptCall = () => {
    setCallState(prev => ({
      ...prev,
      status: 'active'
    }))
    
    toast.success('Call accepted')
  }

  const declineCall = () => {
    setCallState({
      type: null,
      isIncoming: false,
      status: 'idle'
    })
    
    toast.info('Call declined')
  }

  const endCall = () => {
    setCallState({
      type: null,
      isIncoming: false,
      status: 'idle'
    })
  }

  // Render incoming call overlay
  if (callState.status === 'ringing' && callState.isIncoming && callState.contact) {
    return (
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
    )
  }

  // Render active call
  if (callState.status === 'active' && callState.contact) {
    return (
      <VideoCall
        contact={callState.contact}
        onEndCall={endCall}
        isIncoming={callState.isIncoming}
      />
    )
  }

  // Render call initiation UI (can be integrated into other components)
  return {
    initiateCall,
    callState,
    isCallActive: callState.status === 'active',
    isInCall: callState.status !== 'idle'
  }
}

// Hook for components to use call functionality
export function useCallManager() {
  const [callState, setCallState] = useKV<CallState>('call-state', {
    type: null,
    isIncoming: false,
    status: 'idle'
  })

  const initiateCall = (contact: Contact, type: 'video' | 'audio') => {
    if (!contact.online) {
      toast.error(`${contact.name} is offline`)
      return
    }

    setCallState({
      type,
      contact,
      isIncoming: false,
      status: 'connecting'
    })

    toast.info(`Starting ${type} call with ${contact.name}`)
  }

  const endCall = () => {
    setCallState({
      type: null,
      isIncoming: false,
      status: 'idle'
    })
  }

  return {
    initiateCall,
    endCall,
    callState,
    isCallActive: callState.status === 'active',
    isInCall: callState.status !== 'idle'
  }
}