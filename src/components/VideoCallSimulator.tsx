import { useState, useRef, useEffect } from 'react'
import { useKV } from '../hooks/useKV'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { 
  PhoneCall, 
  PhoneDisconnect, 
  VideoCamera, 
  VideoCameraSlash, 
  Microphone, 
  MicrophoneSlash,
  Monitor,
  SpeakerHigh,
  SpeakerSlash,
  Gear,
  Warning,
  CheckCircle,
  Network,
  Shield,
  Clock
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface VideoCallSimulatorProps {
  onBack: () => void
}

interface CallMetrics {
  bitrate: number
  packetLoss: number
  latency: number
  jitter: number
  resolution: string
  fps: number
  codec: string
}

interface TurnServer {
  id: string
  location: string
  load: number
  latency: number
  bandwidth: number
  cost: number // PRIV per MB
  reputation: number
  isDecentralized: boolean
}

export function VideoCallSimulator({ onBack }: VideoCallSimulatorProps) {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'failed'>('connecting')
  const [selectedTurnServer, setSelectedTurnServer] = useState<TurnServer | null>(null)
  const [premiumFeatures] = useKV('premium_access', null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const _remoteVideoRef = useRef<HTMLVideoElement>(null)
  
  const [callMetrics, setCallMetrics] = useState<CallMetrics>({
    bitrate: 1200,
    packetLoss: 0.2,
    latency: 45,
    jitter: 2.1,
    resolution: '720p',
    fps: 30,
    codec: 'VP9'
  })

  const [turnServers] = useState<TurnServer[]>([
    {
      id: 'turn-us-west',
      location: 'US West (San Francisco)',
      load: 65,
      latency: 25,
      bandwidth: 98.5,
      cost: 0.001,
      reputation: 95,
      isDecentralized: true
    },
    {
      id: 'turn-eu-central',
      location: 'EU Central (Frankfurt)',
      load: 45,
      latency: 35,
      bandwidth: 99.2,
      cost: 0.0008,
      reputation: 98,
      isDecentralized: true
    },
    {
      id: 'turn-asia-pacific',
      location: 'Asia Pacific (Singapore)',
      load: 78,
      latency: 55,
      bandwidth: 96.8,
      cost: 0.0012,
      reputation: 92,
      isDecentralized: true
    },
    {
      id: 'turn-centralized',
      location: 'Centralized (CloudFlare)',
      load: 25,
      latency: 15,
      bandwidth: 99.9,
      cost: 0,
      reputation: 85,
      isDecentralized: false
    }
  ])

  // Simulate WebRTC connection process
  useEffect(() => {
    if (isCallActive && !selectedTurnServer) {
      // Auto-select best TURN server for premium users
      if (premiumFeatures?.isPremium) {
        const bestServer = turnServers
          .filter(server => server.isDecentralized)
          .sort((a, b) => (b.reputation - a.reputation) + (a.latency - b.latency))[0]
        setSelectedTurnServer(bestServer)
        toast.success(`Connected to premium TURN server: ${bestServer.location}`)
      } else {
        // Free users get basic centralized server
        const freeServer = turnServers.find(server => !server.isDecentralized)
        if (freeServer) {
          setSelectedTurnServer(freeServer)
          toast.info('Using basic TURN server. Upgrade to Premium for better performance.')
        }
      }
    }
  }, [isCallActive, premiumFeatures, turnServers, selectedTurnServer])

  // Simulate call timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isCallActive])

  // Simulate changing metrics during call
  useEffect(() => {
    if (isCallActive) {
      const interval = setInterval(() => {
        setCallMetrics(prev => ({
          ...prev,
          bitrate: prev.bitrate + (Math.random() - 0.5) * 200,
          packetLoss: Math.max(0, prev.packetLoss + (Math.random() - 0.5) * 0.5),
          latency: Math.max(10, prev.latency + (Math.random() - 0.5) * 10),
          jitter: Math.max(0, prev.jitter + (Math.random() - 0.5) * 1)
        }))
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [isCallActive])

  const startCall = async () => {
    try {
      setConnectionStatus('connecting')
      toast.info('Establishing WebRTC connection...')
      
      // Simulate WebRTC setup delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate getting user media
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: isVideoEnabled, 
            audio: isAudioEnabled 
          })
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
          toast.success('CameraPlus and microphone access granted')
        } catch (error) {
          toast.warning('Using simulated video stream')
        }
      }
      
      setIsCallActive(true)
      setConnectionStatus('connected')
      setCallDuration(0)
      toast.success('Call connected successfully!')
      
    } catch (error) {
      setConnectionStatus('failed')
      toast.error('Failed to establish connection')
    }
  }

  const endCall = () => {
    setIsCallActive(false)
    setConnectionStatus('connecting')
    setCallDuration(0)
    setSelectedTurnServer(null)
    
    // Stop media streams
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
    }
    
    toast.info('Call ended')
  }

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled)
    toast.info(isVideoEnabled ? 'VideoCamera disabled' : 'VideoCamera enabled')
  }

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled)
    toast.info(isAudioEnabled ? 'Microphone muted' : 'Microphone unmuted')
  }

  const toggleSpeaker = () => {
    setIsSpeakerEnabled(!isSpeakerEnabled)
    toast.info(isSpeakerEnabled ? 'Speaker muted' : 'Speaker enabled')
  }

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing)
    toast.info(isScreenSharing ? 'Screen sharing stopped' : 'Screen sharing started')
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return hours > 0 
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600'
      case 'connecting': return 'text-yellow-600'
      case 'reconnecting': return 'text-orange-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="w-4 h-4" />
      case 'connecting': return <Clock className="w-4 h-4 animate-spin" />
      case 'reconnecting': return <Warning className="w-4 h-4" />
      case 'failed': return <Warning className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">VideoCamera Call Simulator</h1>
          <p className="text-muted-foreground">
            Experience PrivaChain's decentralized video calling with WebRTC
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* VideoCamera Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <VideoCamera className="w-5 h-5" />
                  VideoCamera Call Interface
                </CardTitle>
                <div className={`flex items-center gap-2 ${getConnectionStatusColor()}`}>
                  {getConnectionStatusIcon()}
                  <span className="text-sm capitalize">{connectionStatus}</span>
                </div>
              </div>
              {isCallActive && (
                <CardDescription>
                  Call duration: {formatDuration(callDuration)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Local and Remote VideoCamera */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    {isCallActive ? (
                      isVideoEnabled ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white">
                          <VideoCameraSlash className="w-16 h-16" />
                        </div>
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <VideoCamera className="w-16 h-16" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-2 left-2 text-white text-sm font-medium">
                    You
                  </div>
                  {isCallActive && !isAudioEnabled && (
                    <div className="absolute top-2 right-2">
                      <MicrophoneSlash className="w-5 h-5 text-red-400" />
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                    {isCallActive ? (
                      <div className="w-full h-full flex items-center justify-center">
                        {/* Simulated remote participant */}
                        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold">
                          JD
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="w-16 h-16" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-2 left-2 text-white text-sm font-medium">
                    John Doe
                  </div>
                </div>
              </div>

              {/* Call Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={isAudioEnabled ? "default" : "destructive"}
                  size="icon"
                  onClick={toggleAudio}
                  disabled={!isCallActive}
                >
                  {isAudioEnabled ? <Microphone className="w-4 h-4" /> : <MicrophoneSlash className="w-4 h-4" />}
                </Button>

                <Button
                  variant={isVideoEnabled ? "default" : "destructive"}
                  size="icon"
                  onClick={toggleVideo}
                  disabled={!isCallActive}
                >
                  {isVideoEnabled ? <VideoCamera className="w-4 h-4" /> : <VideoCameraSlash className="w-4 h-4" />}
                </Button>

                <Button
                  variant={isSpeakerEnabled ? "default" : "destructive"}
                  size="icon"
                  onClick={toggleSpeaker}
                  disabled={!isCallActive}
                >
                  {isSpeakerEnabled ? <SpeakerHigh className="w-4 h-4" /> : <SpeakerSlash className="w-4 h-4" />}
                </Button>

                <Button
                  variant={isScreenSharing ? "secondary" : "outline"}
                  size="icon"
                  onClick={toggleScreenShare}
                  disabled={!isCallActive}
                >
                  <Monitor className="w-4 h-4" />
                </Button>

                <Button variant="outline" size="icon" disabled={!isCallActive}>
                  <Gear className="w-4 h-4" />
                </Button>

                {!isCallActive ? (
                  <Button onClick={startCall} className="px-6">
                    <PhoneCall className="w-4 h-4 mr-2" />
                    Start Call
                  </Button>
                ) : (
                  <Button onClick={endCall} variant="destructive" className="px-6">
                    <PhoneDisconnect className="w-4 h-4 mr-2" />
                    End Call
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* TURN Desktop Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                TURN Desktop
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTurnServer ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Location</span>
                    <Badge variant={selectedTurnServer.isDecentralized ? "default" : "secondary"}>
                      {selectedTurnServer.isDecentralized ? "Decentralized" : "Centralized"}
                    </Badge>
                  </div>
                  <div className="text-sm">{selectedTurnServer.location}</div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Desktop Load</span>
                      <span>{selectedTurnServer.load}%</span>
                    </div>
                    <Progress value={selectedTurnServer.load} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Latency</span>
                      <div className="font-medium">{selectedTurnServer.latency}ms</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bandwidth</span>
                      <div className="font-medium">{selectedTurnServer.bandwidth}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reputation</span>
                      <div className="font-medium">{selectedTurnServer.reputation}/100</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cost</span>
                      <div className="font-medium">
                        {selectedTurnServer.cost > 0 ? `${selectedTurnServer.cost} PRIV/MB` : 'Free'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  No server selected
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Call Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCallActive ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Bitrate</span>
                      <div className="font-medium">{Math.round(callMetrics.bitrate)} kbps</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Packet Loss</span>
                      <div className="font-medium">{callMetrics.packetLoss.toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Latency</span>
                      <div className="font-medium">{Math.round(callMetrics.latency)}ms</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Jitter</span>
                      <div className="font-medium">{callMetrics.jitter.toFixed(1)}ms</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Resolution</span>
                      <div className="font-medium">{callMetrics.resolution}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">FPS</span>
                      <div className="font-medium">{callMetrics.fps}</div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Codec</span>
                      <span className="font-medium">{callMetrics.codec}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  Start a call to see metrics
                </div>
              )}
            </CardContent>
          </Card>

          {/* Premium Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Premium Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {premiumFeatures?.isPremium ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Priority TURN servers</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>HD quality (up to 1080p)</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Advanced codecs (AV1, VP9)</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Unlimited call duration</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Warning className="w-4 h-4" />
                    <span>Basic TURN servers only</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Warning className="w-4 h-4" />
                    <span>Limited to 720p quality</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Warning className="w-4 h-4" />
                    <span>30 minute call limit</span>
                  </div>
                  <Button size="sm" className="w-full mt-3">
                    Upgrade to Premium
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default VideoCallSimulator