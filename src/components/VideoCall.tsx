import { useState, useRef, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Slider } from './ui/slider'
import { 
  VideoCamera, 
  VideoCameraSlash,
  Microphone,
  MicrophoneSlash,
  Phone,
  PhoneX,
  Monitor,
  SpeakerHigh,
  SpeakerX,
  Record,
  Gear,
  Users,
  ChatCircle,
  PictureInPicture,
  ArrowsOut,
  ArrowsIn
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { toast } from 'sonner'

interface CallParticipant {
  id: string
  name: string
  address: string
  avatar?: string
  isMuted: boolean
  isVideoOn: boolean
  isScreenSharing: boolean
  connectionQuality: 'excellent' | 'good' | 'poor'
}

interface VideoCallProps {
  contact?: {
    id: string
    name: string
    address: string
  }
  onEndCall: () => void
  isIncoming?: boolean
}

export function VideoCall({ contact, onEndCall, isIncoming = false }: VideoCallProps) {
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting')
  const [isVideoOn, setIsVideoOn] = useKV('video-on', true)
  const [isMuted, setIsMuted] = useKV('audio-muted', false)
  const [isSpeakerOn, setIsSpeakerOn] = useKV('speaker-on', true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPiPMode, setIsPiPMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState([50])
  const [connectionStats, setConnectionStats] = useState({
    bitrate: '2.5 Mbps',
    latency: '45ms',
    packetLoss: '0.1%',
    codec: 'AV1'
  })
  const [blockchainStatus, setBlockchainStatus] = useState({
    sessionId: '',
    gasUsed: '0.0012 PRIV',
    turnNodes: 3
  })
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const callStartTime = useRef<number>(Date.now())
  
  // Simulated participants for demo
  const [participants] = useState<CallParticipant[]>([
    {
      id: '1',
      name: contact?.name || 'Unknown',
      address: contact?.address || 'unknown.prv',
      isMuted: false,
      isVideoOn: true,
      isScreenSharing: false,
      connectionQuality: 'excellent'
    }
  ])

  // Simulate WebRTC connection process with realistic phases
  useEffect(() => {
    const connectionPhases = async () => {
      if (isIncoming) {
        // Simulate incoming call connection phases
        toast.info('🔐 Establishing secure connection...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        toast.info('🌐 Connecting to TURN servers...')
        await new Promise(resolve => setTimeout(resolve, 800))
        
        toast.info('🔑 Exchanging encryption keys...')
        await new Promise(resolve => setTimeout(resolve, 600))
        
        setCallStatus('connected')
        toast.success('✅ Call connected with AES-256 E2E encryption')
        
        // Simulate blockchain session initialization
        const sessionId = `0x${Math.random().toString(16).substr(2, 8)}`
        setBlockchainStatus({
          sessionId,
          gasUsed: '0.0012 PRIV',
          turnNodes: 3
        })
      } else {
        // Simulate outgoing call connection phases
        toast.info('📡 Finding optimal TURN nodes...')
        await new Promise(resolve => setTimeout(resolve, 1200))
        
        toast.info('🤝 Performing WebRTC handshake...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        toast.info('🔐 Establishing encrypted channel...')
        await new Promise(resolve => setTimeout(resolve, 800))
        
        setCallStatus('connected')
        toast.success('✅ Call established via decentralized TURN infrastructure')
        
        // Simulate blockchain session initialization
        const sessionId = `0x${Math.random().toString(16).substr(2, 8)}`
        setBlockchainStatus({
          sessionId,
          gasUsed: '0.0015 PRIV',
          turnNodes: 3
        })
      }
    }

    connectionPhases()

    // Start call duration timer
    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000))
    }, 1000)

    // Simulate getting user media
    if (localVideoRef.current && isVideoOn) {
      // In a real app, this would be navigator.mediaDevices.getUserMedia()
      localVideoRef.current.src = '' // Placeholder for demo
    }

    // Simulate audio level monitoring and connection stats
    const audioTimer = setInterval(() => {
      if (!isMuted) {
        setAudioLevel([Math.floor(Math.random() * 80) + 20])
      }
      
      // Update connection stats
      setConnectionStats({
        bitrate: `${(2.1 + Math.random() * 0.8).toFixed(1)} Mbps`,
        latency: `${Math.floor(40 + Math.random() * 20)}ms`,
        packetLoss: `${(Math.random() * 0.3).toFixed(2)}%`,
        codec: Math.random() > 0.5 ? 'AV1' : 'VP9'
      })
    }, 2000)

    return () => {
      clearInterval(timer)
      clearInterval(audioTimer)
    }
  }, [isIncoming, isVideoOn, isMuted])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleEndCall = () => {
    setCallStatus('ended')
    toast.info('Call ended')
    onEndCall()
  }

  const toggleVideo = () => {
    setIsVideoOn(prev => !prev)
    toast.info(isVideoOn ? 'Camera turned off' : 'Camera turned on')
  }

  const toggleMute = () => {
    setIsMuted(prev => !prev)
    toast.info(isMuted ? 'Microphone unmuted' : 'Microphone muted')
  }

  const toggleScreenShare = () => {
    setIsScreenSharing(prev => !prev)
    toast.info(isScreenSharing ? 'Screen sharing stopped' : 'Screen sharing started')
  }

  const toggleRecording = () => {
    setIsRecording(prev => !prev)
    toast.info(isRecording ? 'Recording stopped' : 'Recording started (Zero-knowledge encrypted)')
  }

  const getConnectionQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500'
      case 'good': return 'text-yellow-500'
      case 'poor': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  if (callStatus === 'connecting') {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md w-full mx-4">
          <div className="mb-6">
            <Avatar className="w-20 h-20 mx-auto mb-4">
              <AvatarFallback className="text-2xl">
                {contact?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold">{contact?.name || 'Unknown Contact'}</h3>
            <Badge variant="outline" className="font-mono text-xs mt-2">
              {contact?.address || 'unknown.prv'}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="animate-pulse">
              <p className="text-muted-foreground">
                {isIncoming ? 'Incoming video call...' : 'Connecting via TURN nodes...'}
              </p>
            </div>
            
            <div className="flex justify-center gap-4">
              {isIncoming && (
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                  <Phone className="w-5 h-5 mr-2" />
                  Accept
                </Button>
              )}
              <Button 
                variant="destructive" 
                size="lg"
                onClick={handleEndCall}
              >
                <PhoneX className="w-5 h-5 mr-2" />
                {isIncoming ? 'Decline' : 'Cancel'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn(
      "fixed inset-0 bg-background z-50 flex flex-col",
      isFullscreen && "bg-black"
    )}>
      {/* Header */}
      <div className="p-4 bg-card/50 backdrop-blur-sm border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Connected • {formatDuration(callDuration)}
            </span>
          </div>
          
          <Badge variant="outline" className="text-xs">
            <VideoCamera className="w-3 h-3 mr-1" />
            {connectionStats.codec} • {connectionStats.bitrate}
          </Badge>
          
          <Badge variant="outline" className="text-xs">
            🔗 Session: {blockchainStatus.sessionId}
          </Badge>
          
          <Badge variant="outline" className="text-xs">
            🔒 E2E Encrypted
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Gear className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <ArrowsIn className="w-4 h-4" /> : <ArrowsOut className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-black">
        {/* Remote Video (Main) */}
        <div className="w-full h-full relative">
          {participants[0]?.isVideoOn ? (
            <div className="w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center relative">
              {/* Simulated video stream with animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-800/50 to-purple-800/50 animate-pulse"></div>
              <div className="relative z-10 text-center">
                <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-white/20">
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-600 to-purple-600">
                    {participants[0]?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-white text-lg opacity-75">Video Stream Active</p>
              </div>
              {/* Simulated video noise/grain effect */}
              <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGZpbHRlciBpZD0ibm9pc2UiPgogIDxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjkiIG51bU9jdGF2ZXM9IjEiIHNlZWQ9IjIiLz4KICA8ZmVDb2xvck1hdHJpeCB0eXBlPSJzYXR1cmF0ZSIgdmFsdWVzPSIwIi8+CjwvZmlsdGVyPgo8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjQiLz4KPC9zdmc+')]"></div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <Avatar className="w-32 h-32 mx-auto mb-4">
                  <AvatarFallback className="text-4xl">
                    {participants[0]?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-white text-lg">{participants[0]?.name}</p>
                <p className="text-gray-400">Camera is off</p>
              </div>
            </div>
          )}

          {/* Connection Quality Indicator */}
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-2 bg-black/50 rounded-lg px-3 py-1">
              <div className={cn("w-2 h-2 rounded-full", getConnectionQualityColor(participants[0]?.connectionQuality || 'good'))} />
              <span className="text-white text-sm capitalize">
                {participants[0]?.connectionQuality || 'Good'}
              </span>
            </div>
          </div>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-4 right-4 bg-red-600 rounded-lg px-3 py-1 flex items-center gap-2">
              <Record className="w-4 h-4 text-white animate-pulse" />
              <span className="text-white text-sm">Recording</span>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className={cn(
          "absolute bottom-20 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20",
          isPiPMode && "top-4 right-4 w-64 h-48"
        )}>
          {isVideoOn ? (
            <div className="w-full h-full bg-gradient-to-br from-green-900 via-teal-900 to-green-800 flex items-center justify-center relative">
              {/* Simulated local video stream */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-800/50 to-teal-800/50 animate-pulse"></div>
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <VideoCamera className="w-8 h-8 text-white" />
                </div>
                <p className="text-white text-xs opacity-75">You</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <VideoCameraSlash className="w-8 h-8 text-gray-500" />
            </div>
          )}
          
          <div className="absolute top-2 right-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 bg-black/50"
              onClick={() => setIsPiPMode(!isPiPMode)}
            >
              <PictureInPicture className="w-3 h-3 text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-card/50 backdrop-blur-sm border-t border-border">
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            onClick={toggleMute}
            className="rounded-full w-12 h-12 p-0"
          >
            {isMuted ? <MicrophoneSlash className="w-6 h-6" /> : <Microphone className="w-6 h-6" />}
          </Button>

          {/* Video */}
          <Button
            variant={!isVideoOn ? "destructive" : "secondary"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-12 h-12 p-0"
          >
            {isVideoOn ? <VideoCamera className="w-6 h-6" /> : <VideoCameraSlash className="w-6 h-6" />}
          </Button>

          {/* Screen Share */}
          <Button
            variant={isScreenSharing ? "default" : "secondary"}
            size="lg"
            onClick={toggleScreenShare}
            className="rounded-full w-12 h-12 p-0"
          >
            <Monitor className="w-6 h-6" />
          </Button>

          {/* Record */}
          <Button
            variant={isRecording ? "destructive" : "secondary"}
            size="lg"
            onClick={toggleRecording}
            className="rounded-full w-12 h-12 p-0"
          >
            <Record className="w-6 h-6" />
          </Button>

          {/* Speaker */}
          <Button
            variant={!isSpeakerOn ? "destructive" : "secondary"}
            size="lg"
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className="rounded-full w-12 h-12 p-0"
          >
            {isSpeakerOn ? <SpeakerHigh className="w-6 h-6" /> : <SpeakerX className="w-6 h-6" />}
          </Button>

          {/* Chat */}
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full w-12 h-12 p-0"
          >
            <ChatCircle className="w-6 h-6" />
          </Button>

          {/* End Call */}
          <Button
            variant="destructive"
            size="lg"
            onClick={handleEndCall}
            className="rounded-full w-12 h-12 p-0 ml-4"
          >
            <PhoneX className="w-6 h-6" />
          </Button>
        </div>

        {/* Audio Level Indicator */}
        {!isMuted && (
          <div className="flex items-center justify-center mt-4 gap-2">
            <Microphone className="w-4 h-4 text-muted-foreground" />
            <div className="w-32">
              <Slider
                value={audioLevel}
                onValueChange={setAudioLevel}
                max={100}
                step={1}
                className="w-full"
                disabled
              />
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute right-4 top-16 w-96 bg-card border border-border rounded-lg p-4 shadow-lg max-h-[80vh] overflow-y-auto">
          <h3 className="font-semibold mb-4">Call Settings & Network Status</h3>
          
          <div className="space-y-6">
            {/* Blockchain Session Info */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-primary">Blockchain Session</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session ID:</span>
                  <span className="font-mono text-xs">{blockchainStatus.sessionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gas Used:</span>
                  <span className="font-mono">{blockchainStatus.gasUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TURN Nodes:</span>
                  <span>{blockchainStatus.turnNodes} active</span>
                </div>
              </div>
            </div>

            {/* Connection Stats */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-primary">Network Performance</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bitrate:</span>
                  <span className="text-green-500">{connectionStats.bitrate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Latency:</span>
                  <span className="text-blue-500">{connectionStats.latency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Packet Loss:</span>
                  <span className="text-yellow-500">{connectionStats.packetLoss}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Codec:</span>
                  <span>{connectionStats.codec}</span>
                </div>
              </div>
            </div>
            
            {/* Video Quality Settings */}
            <div>
              <h4 className="text-sm font-medium mb-3">Video Quality</h4>
              <select className="w-full p-2 bg-background border border-border rounded text-sm">
                <option>1080p (Recommended)</option>
                <option>720p</option>
                <option>480p</option>
                <option>Auto (Adaptive)</option>
              </select>
            </div>
            
            {/* Bandwidth Control */}
            <div>
              <h4 className="text-sm font-medium mb-2">Bandwidth Limit</h4>
              <div>
                <Slider
                  defaultValue={[75]}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {connectionStats.bitrate}
                </p>
              </div>
            </div>
            
            {/* Advanced Features */}
            <div>
              <h4 className="text-sm font-medium mb-3">Advanced Features</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Noise Cancellation</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs">Enabled</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Background Blur</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs">Disabled</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">ZK-Privacy Mode</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs bg-green-100 text-green-700">Active</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quantum Encryption</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs bg-blue-100 text-blue-700">CRYSTALS-Kyber</Button>
                </div>
              </div>
            </div>

            {/* Emergency Actions */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-destructive">Emergency Actions</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Switch to Audio Only
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Use Backup TURN Server
                </Button>
                <Button variant="destructive" size="sm" className="w-full text-xs">
                  Burn Session Keys
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}