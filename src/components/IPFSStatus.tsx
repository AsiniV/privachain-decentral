import { useState, useEffect } from 'react'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { 
  Cloud, 
  CloudCheck, 
  CloudSlash, 
  Copy, 
  Pin, 
  Trash2,
  Database,
  Globe,
  Link
} from '@phosphor-icons/react'
import { ipfs, ipfsUtils } from '../lib/ipfs'
import { toast } from 'sonner'

interface IPFSStatusProps {
  className?: string
}

export function IPFSStatus({ className }: IPFSStatusProps) {
  const [connected, setConnected] = useState(false)
  const [pinnedContent, setPinnedContent] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [storageStats, setStorageStats] = useState({
    totalPins: 0,
    totalSize: 0
  })

  useEffect(() => {
    checkConnection()
    loadPinnedContent()
  }, [])

  const checkConnection = async () => {
    try {
      const isConnected = await ipfs.isConnected()
      setConnected(isConnected)
    } catch (error) {
      console.error('IPFS connection check failed:', error)
      setConnected(false)
    }
  }

  const loadPinnedContent = async () => {
    setLoading(true)
    try {
      const pinned = await ipfs.listPinned()
      setPinnedContent(pinned)
      
      // Calculate storage stats
      let totalSize = 0
      for (const cid of pinned) {
        try {
          const stat = await ipfs.stat(cid)
          totalSize += stat.size
        } catch (error) {
          console.error(`Failed to get stats for ${cid}:`, error)
        }
      }
      
      setStorageStats({
        totalPins: pinned.length,
        totalSize
      })
    } catch (error) {
      console.error('Failed to load pinned content:', error)
      toast.error('Failed to load IPFS storage info')
    } finally {
      setLoading(false)
    }
  }

  const copyCID = async (cid: string) => {
    try {
      await navigator.clipboard.writeText(cid)
      toast.success('CID copied to clipboard')
    } catch (error) {
      console.error('Copy failed:', error)
      toast.error('Failed to copy CID')
    }
  }

  const unpinContent = async (cid: string) => {
    try {
      await ipfs.unpin(cid)
      await loadPinnedContent()
      toast.success('Content unpinned from IPFS')
    } catch (error) {
      console.error('Unpin failed:', error)
      toast.error('Failed to unpin content')
    }
  }

  const openInGateway = (cid: string) => {
    const url = ipfs.getGatewayUrl(cid)
    window.open(url, '_blank')
  }

  return (
    <Card className={className}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5" />
            IPFS Storage
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant={connected ? "default" : "destructive"} className="gap-1">
              {connected ? (
                <>
                  <CloudCheck className="w-3 h-3" />
                  Connected
                </>
              ) : (
                <>
                  <CloudSlash className="w-3 h-3" />
                  Disconnected
                </>
              )}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkConnection}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Pinned Items:</span>
            <span className="ml-2 font-mono">{storageStats.totalPins}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Size:</span>
            <span className="ml-2 font-mono">{ipfsUtils.formatSize(storageStats.totalSize)}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Pin className="w-4 h-4" />
          Pinned Content
        </h4>
        
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading pinned content...
          </div>
        ) : pinnedContent.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Cloud className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No pinned content</p>
            <p className="text-sm">Files will appear here when uploaded</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {pinnedContent.map((cid, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="min-w-0 flex-1">
                    <code className="text-sm font-mono break-all">{cid}</code>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyCID(cid)}
                      title="Copy CID"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openInGateway(cid)}
                      title="Open in IPFS Gateway"
                    >
                      <Link className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unpinContent(cid)}
                      title="Unpin content"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
      
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Pinned content is replicated across IPFS network</p>
          <p>• Files are encrypted before upload for privacy</p>
          <p>• Content addressable by cryptographic hash (CID)</p>
        </div>
      </div>
    </Card>
  )
}