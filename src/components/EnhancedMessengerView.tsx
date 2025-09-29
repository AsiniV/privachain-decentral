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
import { getE2EService } from '../services/e2eEncryption'
import { useAppState } from '../lib/app_state'
import { storeCID, retractCID } from '../lib/onchain_ops'
import { WalletBar } from './WalletBar'
import { 
  PaperPlaneTilt, 
  Lock, 
  VideoCamera, 
  PhoneCall,
  DotsThree,
  User,
  ShieldCheck,
  ShieldWarning,
  CloudArrowUp,
  Trash,
  Circle,
  Check,
  Checks,
  Plus,
  MagnifyingGlass
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Message {
  id: string
  sender: string
  content: string
  timestamp: number
  encrypted: boolean
  sessionSecure: boolean
  type: 'text' | 'system'
  cid?: string
  txHash?: string
  status?: 'sent' | 'delivered' | 'read'
}

interface Contact {
  id: string
  name: string
  address: string
  avatar?: string
  lastSeen: number
  online: boolean
  lastMessage?: string
  unreadCount?: number
}

export function EnhancedMessengerView() {
  const [messages, setMessages] = useKV<Message[]>('messages', [])
  const [contacts] = useKV<Contact[]>('contacts', [
    {
      id: '1',
      name: 'Alice Chen',
      address: 'alice.prv',
      lastSeen: Date.now() - 300000,
      online: true,
      lastMessage: 'Привет! Как дела?',
      unreadCount: 2
    },
    {
      id: '2', 
      name: 'Bob Wilson',
      address: 'bob.prv',
      lastSeen: Date.now() - 3600000,
      online: false,
      lastMessage: 'Давай встретимся завтра',
      unreadCount: 0
    },
    {
      id: '3',
      name: 'Charlie Davis',
      address: 'charlie.prv', 
      lastSeen: Date.now() - 120000,
      online: true,
      lastMessage: 'Отправил документы',
      unreadCount: 1
    }
  ])
  
  const [selectedContact, setSelectedContact] = useKV<string | null>('selected-contact', null)
  const [newMessage, setNewMessage] = useState('')
  const [sessionStatus, setSessionStatus] = useState<Record<string, boolean>>({})
  const [isSending, setIsSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const selectedContactData = contacts.find(c => c.id === selectedContact)
  const { cosmosAddress, isKeplrConnected } = useAppState()
  
  const { initiateCall, isInCall } = useVideoCall()

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get messages for selected contact
  const contactMessages = messages.filter(msg => 
    selectedContactData && (
      (msg.sender === 'me' && msg.content.includes(selectedContactData.address)) ||
      (msg.sender !== 'me' && msg.sender === selectedContactData.address)
    )
  )

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [contactMessages])

  // Initialize E2E service
  useEffect(() => {
    const initializeE2E = async () => {
      try {
        const e2eService = getE2EService('messenger-user')
        await e2eService.initialize()
        
        const status: Record<string, boolean> = {}
        for (const contact of contacts) {
          const session = e2eService.getSessionByContact(contact.address)
          status[contact.id] = session !== null && session.isActive
        }
        setSessionStatus(status)
      } catch (error) {
        console.error('❌ Failed to initialize E2E service:', error)
        toast.error('Failed to initialize secure messaging')
      }
    }
    
    initializeE2E()
  }, [contacts])

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContactData || isSending) return

    setIsSending(true)
    
    try {
      const messageId = `msg-${Date.now()}`
      const newMsg: Message = {
        id: messageId,
        sender: 'me',
        content: newMessage,
        timestamp: Date.now(),
        encrypted: true,
        sessionSecure: sessionStatus[selectedContactData.id] || false,
        type: 'text',
        status: 'sent'
      }

      // Simulate message encryption and sending
      if (cosmosAddress && isKeplrConnected) {
        // Store on IPFS and blockchain
        const cid = `Qm${Math.random().toString(36).substr(2, 44)}`
        const txHash = await storeCID(cid, newMessage.length)
        newMsg.cid = cid
        newMsg.txHash = txHash
      }

      setMessages(prev => [...prev, newMsg])
      setNewMessage('')

      // Simulate message delivery
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'delivered' } : msg
        ))
      }, 1000)

      // Simulate message read
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        ))
      }, 3000)

    } catch (error) {
      console.error('❌ Failed to send message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />
      case 'delivered':
        return <Checks className="w-3 h-3 text-gray-400" />
      case 'read':
        return <Checks className="w-3 h-3 text-blue-500" />
      default:
        return <Circle className="w-3 h-3 text-gray-400" />
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    } else {
      return date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short' 
      })
    }
  }

  const getLastSeenText = (lastSeen: number, online: boolean) => {
    if (online) return 'в сети'
    
    const distance = formatDistanceToNow(lastSeen, { 
      addSuffix: true, 
      locale: ru 
    })
    return `был(а) ${distance}`
  }

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

  return (
    <TooltipProvider>
      <div className="h-full flex bg-background">
        {/* Contacts Sidebar - Telegram style */}
        <div className="w-80 flex flex-col bg-card border-r border-border">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Чаты</h2>
              <Button variant="ghost" size="icon" className="hover:bg-accent/20">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск чатов..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted/50 border-0 focus:bg-muted"
              />
            </div>
          </div>

          {/* Contacts List */}
          <ScrollArea className="flex-1">
            <div className="py-2">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/20",
                    selectedContact === contact.id && "bg-accent/30"
                  )}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {contact.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-foreground truncate">{contact.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {contact.lastMessage && formatTime(contact.lastSeen)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.lastMessage || getLastSeenText(contact.lastSeen, contact.online)}
                      </p>
                      
                      {contact.unreadCount && contact.unreadCount > 0 && (
                        <Badge className="bg-accent text-accent-foreground min-w-[20px] h-5 text-xs px-1.5">
                          {contact.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <WalletBar />
        </div>

        {/* Chat Area - Telegram style */}
        <div className="flex-1 flex flex-col">
          {selectedContactData ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                          {selectedContactData.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {selectedContactData.online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-foreground">{selectedContactData.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {getLastSeenText(selectedContactData.lastSeen, selectedContactData.online)}
                      </p>
                    </div>

                    {sessionStatus[selectedContactData.id] ? (
                      <Badge variant="secondary" className="gap-1 text-green-700 bg-green-50">
                        <ShieldCheck className="w-3 h-3" />
                        Защищено
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-yellow-700 bg-yellow-50">
                        <ShieldWarning className="w-3 h-3" />
                        Небезопасно
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={initiateAudioCall}
                          disabled={!selectedContactData.online}
                          className="hover:bg-accent/20"
                        >
                          <PhoneCall className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{selectedContactData.online ? 'Голосовой звонок' : 'Пользователь не в сети'}</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={initiateVideoCall}
                          disabled={!selectedContactData.online}
                          className="hover:bg-accent/20"
                        >
                          <VideoCamera className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{selectedContactData.online ? 'Видеозвонок' : 'Пользователь не в сети'}</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Button variant="ghost" size="icon" className="hover:bg-accent/20">
                      <DotsThree className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {contactMessages.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                      <Lock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <h3 className="text-lg font-medium mb-2">Начните защищённую переписку</h3>
                      <p className="text-sm">с {selectedContactData.name}</p>
                      <p className="text-xs mt-2 opacity-70">Все сообщения шифруются end-to-end</p>
                    </div>
                  )}
                  
                  {contactMessages.map((message, index) => {
                    const isMe = message.sender === 'me'
                    const isLastFromSender = index === contactMessages.length - 1 || 
                      contactMessages[index + 1]?.sender !== message.sender
                    
                    return (
                      <div 
                        key={message.id}
                        className={cn(
                          "flex group mb-1",
                          isMe ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div className={cn(
                          "max-w-[70%] relative",
                          isMe 
                            ? 'bg-accent text-accent-foreground rounded-l-2xl rounded-tr-2xl' 
                            : 'bg-muted text-foreground rounded-r-2xl rounded-tl-2xl',
                          isLastFromSender 
                            ? isMe 
                              ? 'rounded-br-md' 
                              : 'rounded-bl-md'
                            : isMe 
                              ? 'rounded-br-2xl' 
                              : 'rounded-bl-2xl',
                          "px-4 py-2 shadow-sm"
                        )}>
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <div className="flex items-center gap-1 text-xs opacity-70">
                              {message.encrypted && (
                                <>
                                  {message.sessionSecure ? (
                                    <ShieldCheck className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Lock className="w-3 h-3" />
                                  )}
                                </>
                              )}
                              {message.txHash && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <CloudArrowUp className="w-3 h-3 text-blue-600" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Сохранено в блокчейне: {message.txHash.slice(0, 12)}...</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <span className="text-xs opacity-70">
                                {formatTime(message.timestamp)}
                              </span>
                              {isMe && getStatusIcon(message.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Напишите сообщение..."
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !isSending && sendMessage()}
                      className="pr-12 py-3 rounded-2xl border-0 bg-muted focus:bg-muted resize-none min-h-[44px]"
                      disabled={isSending}
                    />
                  </div>
                  
                  <Button 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim() || isSending}
                    className="w-12 h-12 rounded-full p-0 shrink-0"
                    size="icon"
                  >
                    <PaperPlaneTilt className="w-5 h-5" />
                  </Button>
                </div>
                
                {cosmosAddress && isKeplrConnected && (
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <CloudArrowUp className="w-3 h-3 text-blue-600" />
                    <span>Сообщения сохраняются в блокчейне</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center bg-muted/10">
              <div className="max-w-md">
                <User className="w-24 h-24 mx-auto mb-6 opacity-20" />
                <h3 className="text-xl font-semibold mb-3 text-foreground">Выберите чат</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Выберите контакт из списка слева, чтобы начать защищённую переписку. 
                  Все сообщения шифруются end-to-end.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}