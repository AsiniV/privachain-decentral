import { useState, useRef } from 'react'
import { useKV } from '../hooks/useKV'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Progress } from './ui/progress'
import { 
  PaperPlaneTilt,
  Lock,
  Plus,
  Trash,
  Eye,
  Download,
  Paperclip,
  X,
  Cloud,
  FileText,
  Image,
  VideoCamera
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { ipfs, ipfsUtils, IPFSUploadResult } from '../lib/ipfs'

interface Email {
  id: string
  from: string
  to: string
  subject: string
  content: string
  timestamp: number
  encrypted: boolean
  read: boolean
  attachments?: {
    name: string
    cid: string
    size: number
    type: string
  }[]
  contentCID?: string // IPFS CID for email content
}

interface PrivDomain {
  domain: string
  publicKey: string
  created: number
}

export function EmailView() {
  const [emails, setEmails] = useKV<Email[]>('emails', [
    {
      id: '1',
      from: 'whistleblower.prv',
      to: 'you.prv',
      subject: 'Secure Communication Test',
      content: 'This message was sent via PrivaChain\'s anonymous .prv domain system. The sender\'s identity is protected through ZK-SNARKs, and the message was routed through 3 anonymous relay nodes.',
      timestamp: Date.now() - 3600000,
      encrypted: true,
      read: false,
      contentCID: 'QmXyZ123abcDEF456ghiJKL789mnoPQR012stuVWX345yzaBC',
      attachments: [{
        name: 'encrypted_document.asc',
        cid: 'QmAbc456defGHI789jklMNO012pqrSTU345vwxYZA678bcDEF',
        size: 2048,
        type: 'application/pgp-encrypted'
      }]
    },
    {
      id: '2',
      from: 'demo-sender.prv',
      to: 'you.prv',
      subject: 'Blockchain Envelope Demo',
      content: 'Welcome to PrivaChain Envelope! This demonstration shows:\n\n• Anonymous .prv domains\n• PGP/GPG encryption\n• IPFS content storage\n• Zero-knowledge sender verification\n• Decentralized relay routing\n\nYour communications are truly private and censorship-resistant.',
      timestamp: Date.now() - 7200000,
      encrypted: true,
      read: true,
      contentCID: 'Qm789DefghiJKL012mnoABC345pqrSTU678vwxYZA901bcDEF'
    }
  ])
  
  const [privDomains, setPrivDomains] = useKV<PrivDomain[]>('priv-domains', [
    {
      domain: 'you.prv',
      publicKey: 'pk_1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z',
      created: Date.now() - 2592000000
    }
  ])
  
  const [selectedEmail, setSelectedEmail] = useKV<string | null>('selected-email', null)
  const [composing, setComposing] = useState(false)
  const [newEmail, setNewEmail] = useState({
    to: '',
    subject: '',
    content: ''
  })
  const [newDomain, setNewDomain] = useState('')
  const [attachments, setAttachments] = useState<{name: string, file: File, cid?: string, uploading?: boolean}[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedEmailData = emails.find(e => e.id === selectedEmail)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newAttachments = Array.from(files).map(file => ({
      name: file.name,
      file,
      uploading: false
    }))

    setAttachments(current => [...current, ...newAttachments])
  }

  const removeAttachment = (index: number) => {
    setAttachments(current => current.filter((_, i) => i !== index))
  }

  const uploadAttachments = async () => {
    const toUpload = attachments.filter(att => !att.cid)
    if (toUpload.length === 0) return []

    const uploadedAttachments: { name: string; cid: string; size: number; type: string }[] = []
    
    for (let i = 0; i < toUpload.length; i++) {
      const attachment = toUpload[i]
      setUploadProgress((i / toUpload.length) * 100)
      
      // Mark as uploading
      setAttachments(current => 
        current.map(att => 
          att === attachment ? { ...att, uploading: true } : att
        )
      )

      try {
        toast.info(`📦 Uploading ${attachment.name} to IPFS...`)
        
        // Upload to IPFS with encryption
        const result = await ipfsUtils.uploadEncrypted(attachment.file, 'encryption-key')
        
        // MapPin the content to ensure availability
        await ipfs.pin(result.cid)
        
        uploadedAttachments.push({
          name: result.name,
          cid: result.cid,
          size: result.size,
          type: attachment.file.type || 'application/octet-stream'
        })

        // Update attachment with CID
        setAttachments(current =>
          current.map(att =>
            att === attachment ? { ...att, cid: result.cid, uploading: false } : att
          )
        )

        toast.success(`✅ ${attachment.name} uploaded to IPFS`)
      } catch (error) {
        console.error('Upload failed:', error)
        toast.error(`Failed to upload ${attachment.name}`)
        
        setAttachments(current =>
          current.map(att =>
            att === attachment ? { ...att, uploading: false } : att
          )
        )
      }
    }

    setUploadProgress(100)
    return uploadedAttachments
  }

  const downloadAttachment = async (attachment: { name: string; cid: string; size: number; type: string }) => {
    try {
      toast.info(`⬇️ Downloading ${attachment.name} from IPFS...`)
      
      // Download and decrypt from IPFS
      const content = await ipfsUtils.downloadDecrypted(attachment.cid, 'decryption-key')
      
      // Create blob and download
      const blob = new Blob([content], { type: attachment.type })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`✅ Downloaded ${attachment.name}`)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error(`Failed to download ${attachment.name}`)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />
    if (type.startsWith('video/')) return <VideoCamera className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const sendEmail = async () => {
    if (!newEmail.to.trim() || !newEmail.subject.trim() || !newEmail.content.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      // Upload attachments first
      const uploadedAttachments = await uploadAttachments()

      // Simulate blockchain email sending process
      toast.info('🔐 Encrypting content with PGP...')
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Upload email content to IPFS
      toast.info('📦 Uploading content to IPFS...')
      const contentResult = await ipfs.add(newEmail.content)
      await ipfs.pin(contentResult.cid)
      await new Promise(resolve => setTimeout(resolve, 600))
      
      toast.info('🌐 Routing through anonymous relays...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.info('⛽ Processing transaction (0.001 PRIV)...')
      await new Promise(resolve => setTimeout(resolve, 500))

      const email: Email = {
        id: Date.now().toString(),
        from: privDomains[0]?.domain || 'you.prv',
        to: newEmail.to,
        subject: newEmail.subject,
        content: newEmail.content,
        timestamp: Date.now(),
        encrypted: true,
        read: true,
        contentCID: contentResult.cid,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
      }

      setEmails(current => [email, ...current])
      setNewEmail({ to: '', subject: '', content: '' })
      setAttachments([])
      setUploadProgress(0)
      setComposing(false)
      
      toast.success('✅ Email sent via decentralized anonymous relays with IPFS storage')
    } catch (error) {
      console.error('Send failed:', error)
      toast.error('Failed to send email')
    }
  }

  const createPrivDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain name')
      return
    }

    if (!newDomain.endsWith('.prv')) {
      toast.error('Domain must end with .prv')
      return
    }

    // Simulate blockchain domain registration process
    toast.info('🔐 Generating ZK-SNARK proof...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast.info('📡 Submitting to PrivaChain...')
    await new Promise(resolve => setTimeout(resolve, 800))
    
    toast.info('⛽ Processing gas fee (0.05 PRIV)...')
    await new Promise(resolve => setTimeout(resolve, 600))

    const domain: PrivDomain = {
      domain: newDomain,
      publicKey: `pk_${Math.random().toString(36).substring(2).toUpperCase()}${Math.random().toString(36).substring(2).toUpperCase()}`,
      created: Date.now()
    }

    setPrivDomains(current => [...current, domain])
    setNewDomain('')
    toast.success(`✅ Anonymous domain ${newDomain} registered with ZK-proof verification`)
  }

  const markAsRead = (emailId: string) => {
    setEmails(current => 
      current.map(email => 
        email.id === emailId ? { ...email, read: true } : email
      )
    )
  }

  const unreadCount = emails.filter(e => !e.read).length

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Inbox</h2>
            <Badge variant="destructive">{unreadCount}</Badge>
          </div>
          
          <Button 
            onClick={() => setComposing(true)}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Compose Email
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {emails.map(email => (
              <Card 
                key={email.id}
                className={cn(
                  "p-3 mb-2 cursor-pointer transition-colors hover:bg-muted/50",
                  selectedEmail === email.id && "bg-accent text-accent-foreground",
                  !email.read && "border-l-4 border-l-accent"
                )}
                onClick={() => {
                  setSelectedEmail(email.id)
                  if (!email.read) markAsRead(email.id)
                }}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm font-mono truncate">
                      {email.from}
                    </p>
                    {email.encrypted && <Lock className="w-3 h-3" />}
                  </div>
                  
                  <p className={cn(
                    "font-medium truncate",
                    !email.read && "font-bold"
                  )}>
                    {email.subject}
                  </p>
                  
                  <p className="text-sm text-muted-foreground truncate">
                    {email.content}
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    {email.timestamp ? new Date(email.timestamp).toLocaleDateString() : 'No date'}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-border">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Create .prv Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Anonymous Domain</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Domain Name</label>
                  <Input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="myname.prv"
                    className="mt-1"
                  />
                </div>
                <Button onClick={createPrivDomain} className="w-full">
                  Create with ZK-Proof
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedEmailData ? (
          <>
            <div className="p-4 border-b border-border bg-card">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{selectedEmailData.subject}</h3>
                  <div className="flex items-center gap-2">
                    {selectedEmailData.encrypted && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="w-3 h-3" />
                        Encrypted
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon">
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-mono">From: {selectedEmailData.from}</span>
                  <span className="font-mono">To: {selectedEmailData.to}</span>
                  <span>{selectedEmailData.timestamp ? new Date(selectedEmailData.timestamp).toLocaleString() : 'No date'}</span>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{selectedEmailData.content}</p>
                
                {selectedEmailData.attachments && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      IPFS Attachments ({selectedEmailData.attachments.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedEmailData.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-background rounded border">
                          <div className="flex items-center gap-3">
                            {getFileIcon(attachment.type)}
                            <div>
                              <div className="font-mono text-sm font-medium">{attachment.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <span>{ipfsUtils.formatSize(attachment.size)}</span>
                                <span>•</span>
                                <code className="text-xs">{attachment.cid.slice(0, 12)}...</code>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-auto p-0 text-xs"
                                  onClick={() => navigator.clipboard.writeText(attachment.cid)}
                                >
                                  Copy CID
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => downloadAttachment(attachment)}
                              className="gap-1"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(ipfs.getGatewayUrl(attachment.cid), '_blank')}
                              className="gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <Lock className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Select an email</h3>
              <p className="text-muted-foreground">Choose an email to read securely</p>
            </div>
          </div>
        )}
      </div>

      {composing && (
        <Dialog open={composing} onOpenChange={setComposing}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Compose Encrypted Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">To</label>
                <Input
                  value={newEmail.to}
                  onChange={(e) => setNewEmail({...newEmail, to: e.target.value})}
                  placeholder="recipient.prv"
                  className="mt-1 font-mono"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={newEmail.subject}
                  onChange={(e) => setNewEmail({...newEmail, subject: e.target.value})}
                  placeholder="Subject"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={newEmail.content}
                  onChange={(e) => setNewEmail({...newEmail, content: e.target.value})}
                  placeholder="Your encrypted message..."
                  rows={8}
                  className="mt-1"
                />
              </div>
              
              {/* Attachments Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Attachments</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Paperclip className="w-4 h-4" />
                    Add File
                  </Button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {attachments.length > 0 && (
                  <div className="space-y-2 p-3 bg-muted rounded-lg">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                        <div className="flex items-center gap-2">
                          {getFileIcon(attachment.file.type)}
                          <div>
                            <div className="text-sm font-medium">{attachment.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {ipfsUtils.formatSize(attachment.file.size)}
                              {attachment.cid && (
                                <>
                                  {' • '}
                                  <code className="text-xs">IPFS: {attachment.cid.slice(0, 8)}...</code>
                                </>
                              )}
                              {attachment.uploading && (
                                <>
                                  {' • '}
                                  <span className="text-accent">Uploading...</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          disabled={attachment.uploading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Uploading to IPFS...</span>
                          <span>{uploadProgress.toFixed(0)}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    <span>End-to-end encrypted</span>
                  </div>
                  {attachments.length > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Cloud className="w-4 h-4" />
                        <span>IPFS distributed storage</span>
                      </div>
                    </>
                  )}
                </div>
                
                <Button onClick={sendEmail} className="gap-2">
                  <PaperPlaneTilt className="w-4 h-4" />
                  Send Encrypted
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}