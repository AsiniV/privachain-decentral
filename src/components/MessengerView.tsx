import { useState, useRef, useEffect } from 'react'
import { useKV } from '../hooks/useKV'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback } from './ui/avatar'
import { ScrollArea } from './ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { useVideoCall } from './VideoCallProvider'
import { 
  PaperPlaneTilt, 
  Lock, 
  VideoCamera, 
  PhoneCall,
  DotsThree,
  User
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { toast } from 'sonner'

interface Message {
  id: string
  sender: string
  content: string
  timestamp: number
  encrypted: boolean
  type: 'text' | 'system'
}

interface Contact {
  id: string
  name: string
  address: string
  avatar?: string
  lastSeen: number
  online: boolean
}

export function MessengerView() {
  const [messages, setMessages] = useKV<Message[]>('messages', [])
  const [contacts, _setContacts] = useKV<Contact[]>('contacts', [
    {
      id: '1',
      name: 'Alice Chen',
      address: 'alice.prv',
      lastSeen: Date.now() - 300000,
      online: true
    },
    {
      id: '2', 
      name: 'Bob Wilson',
      address: 'bob.prv',
      lastSeen: Date.now() - 3600000,
      online: false
    },
    {
      id: '3',
      name: 'Charlie Davis',
      address: 'charlie.prv', 
      lastSeen: Date.now() - 120000,
      online: true
    }
  ])
  
  const [selectedContact, setSelectedContact] = useKV<string | null>('selected-contact', null)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const selectedContactData = contacts.find(c => c.id === selectedContact)
  
  // Use video call hook
  const { initiateCall, isInCall } = useVideoCall()

  const initiateVideoCall = () => {
    if (selectedContactData) {
      initiateCall(selectedContactData, 'video')
    }
  }

  const initiateAudioCall = () => {
    if (selectedContactData) {
      initiateCall(selectedContactData, 'audio')
    }
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedContact) return

    const message: Message = {
      id: Date.now().toString(),
      sender: 'me',
      content: newMessage,
      timestamp: Date.now(),
      encrypted: true,
      type: 'text'
    }

    setMessages(current => [...current, message])
    setNewMessage('')
    
    toast.success('Message sent with E2E encryption')

    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        sender: selectedContactData?.name || 'User',
        content: `Thanks for your message! This is a demo response.`,
        timestamp: Date.now(),
        encrypted: true,
        type: 'text'
      }
      setMessages(current => [...current, response])
    }, 1000)
  }

  const contactMessages = messages.filter(m => 
    (m.sender === 'me' || m.sender === selectedContactData?.name) && selectedContact
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [contactMessages])

  return (
    <TooltipProvider>
      <div className="flex h-full">
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold mb-3">Conversations</h2>
          <Input 
            placeholder="MagnifyingGlass conversations..." 
            className="w-full mb-3"
          />
          
          {/* Demo VideoCamera Call Button */}
          <Button 
            onClick={() => initiateCall({
              id: 'demo-video',
              name: 'Demo VideoCamera Call',
              address: 'demo.prv',
              online: true
            }, 'video')}
            className="w-full mb-2 bg-accent text-accent-foreground hover:bg-accent/90"
            size="sm"
          >
            <VideoCamera className="w-4 h-4 mr-2" />
            Start Demo VideoCamera Call
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {contacts.map(contact => (
              <Card 
                key={contact.id}
                className={cn(
                  "p-3 mb-2 cursor-pointer transition-colors hover:bg-muted/50",
                  selectedContact === contact.id && "bg-accent text-accent-foreground"
                )}
                onClick={() => setSelectedContact(contact.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {contact.online && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{contact.name}</p>
                      <Badge variant="outline" className="font-mono text-xs">
                        {contact.address}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {contact.online ? 'Online' : `Last seen ${new Date(contact.lastSeen).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedContactData ? (
          <>
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {selectedContactData.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedContactData.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      <span>End-to-end encrypted</span>
                      {isInCall && (
                        <>
                          <span>•</span>
                          <span className="text-accent">Call active</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={initiateAudioCall}
                        disabled={!selectedContactData?.online}
                      >
                        <PhoneCall className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{selectedContactData?.online ? 'Start audio call' : 'User is offline'}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={initiateVideoCall}
                        disabled={!selectedContactData?.online}
                      >
                        <VideoCamera className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{selectedContactData?.online ? 'Start video call' : 'User is offline'}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Button variant="ghost" size="icon">
                    <DotsThree className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {contactMessages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Start a secure conversation with {selectedContactData.name}</p>
                    <p className="text-sm">Messages are end-to-end encrypted</p>
                  </div>
                )}
                
                {contactMessages.map(message => (
                  <div 
                    key={message.id}
                    className={cn(
                      "flex",
                      message.sender === 'me' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div className={cn(
                      "max-w-[70%] rounded-lg p-3",
                      message.sender === 'me' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-muted'
                    )}>
                      <p>{message.content}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
                        {message.encrypted && <Lock className="w-3 h-3" />}
                        <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a secure message..."
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <PaperPlaneTilt className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">Choose a contact to start messaging securely</p>
            </div>
          </div>
        )}
      </div>
      </div>
    </TooltipProvider>
  )
}