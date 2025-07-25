import { useState, useEffect } from 'react'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { 
  MagnifyingGlass, 
  Download, 
  Eye, 
  Copy, 
  MapPin, 
  FileText, 
  Image, 
  VideoCamera,
  MusicNote,
  Package,
  CodeSimple
} from '@phosphor-icons/react'
import { ipfs, ipfsUtils } from '../lib/ipfs'
import { toast } from 'sonner'

interface IPFSSearchResult {
  cid: string
  name: string
  size: number
  type: string
  pinned: boolean
}

export function IPFSBrowser() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<IPFSSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedContent, setSelectedContent] = useState<string | null>(null)
  const [contentPreview, setContentPreview] = useState<string>('')

  useEffect(() => {
    loadPinnedContent()
  }, [])

  const loadPinnedContent = async () => {
    setLoading(true)
    try {
      const pinnedCIDs = await ipfs.listPinned()
      const results: IPFSSearchResult[] = []
      
      for (const cid of pinnedCIDs) {
        try {
          const stat = await ipfs.stat(cid)
          results.push({
            cid,
            name: `content-${cid.slice(0, 8)}`,
            size: stat.size,
            type: stat.type,
            pinned: true
          })
        } catch (error) {
          console.error(`Failed to get stats for ${cid}:`, error)
        }
      }
      
      setSearchResults(results)
    } catch (error) {
      console.error('Failed to load pinned content:', error)
      toast.error('Failed to load IPFS content')
    } finally {
      setLoading(false)
    }
  }

  const searchIPFS = async () => {
    if (!searchQuery.trim()) {
      await loadPinnedContent()
      return
    }

    setLoading(true)
    try {
      // In production, this would search through indexed IPFS content
      // For now, we'll filter pinned content by CID matching
      const pinnedCIDs = await ipfs.listPinned()
      const filteredResults = pinnedCIDs
        .filter(cid => cid.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 10) // Limit results
      
      const results: IPFSSearchResult[] = []
      for (const cid of filteredResults) {
        try {
          const stat = await ipfs.stat(cid)
          results.push({
            cid,
            name: `search-result-${cid.slice(0, 8)}`,
            size: stat.size,
            type: stat.type,
            pinned: true
          })
        } catch (error) {
          console.error(`Failed to get stats for ${cid}:`, error)
        }
      }
      
      setSearchResults(results)
      
      if (results.length === 0) {
        toast.info('No matching content found in IPFS')
      }
    } catch (error) {
      console.error('MagnifyingGlass failed:', error)
      toast.error('IPFS search failed')
    } finally {
      setLoading(false)
    }
  }

  const previewContent = async (cid: string) => {
    try {
      setSelectedContent(cid)
      toast.info('Loading content preview...')
      
      const content = await ipfs.get(cid)
      const text = new TextDecoder().decode(content)
      setContentPreview(text.slice(0, 1000)) // First 1000 chars
      
    } catch (error) {
      console.error('Preview failed:', error)
      toast.error('Failed to load content preview')
      setContentPreview('Unable to preview this content type')
    }
  }

  const downloadContent = async (result: IPFSSearchResult) => {
    try {
      toast.info(`Downloading ${result.name}...`)
      
      const content = await ipfs.get(result.cid)
      const blob = new Blob([content], { type: result.type })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = result.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`Downloaded ${result.name}`)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download content')
    }
  }

  const pinContent = async (cid: string) => {
    try {
      await ipfs.pin(cid)
      await loadPinnedContent()
      toast.success('Content pinned to IPFS')
    } catch (error) {
      console.error('MapPin failed:', error)
      toast.error('Failed to pin content')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />
    if (type.startsWith('video/')) return <VideoCamera className="w-4 h-4 text-purple-500" />
    if (type.startsWith('audio/')) return <MusicNote className="w-4 h-4 text-green-500" />
    if (type.includes('zip') || type.includes('tar')) return <Package className="w-4 h-4 text-orange-500" />
    if (type.includes('json') || type.includes('javascript')) return <CodeSimple className="w-4 h-4 text-yellow-500" />
    return <FileText className="w-4 h-4 text-gray-500" />
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">IPFS Content Browser</h2>
        
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="MagnifyingGlass IPFS content by CID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchIPFS()}
            className="flex-1"
          />
          <Button onClick={searchIPFS} disabled={loading} className="gap-2">
            <MagnifyingGlass className="w-4 h-4" />
            MagnifyingGlass
          </Button>
          <Button 
            variant="outline" 
            onClick={loadPinnedContent} 
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground mb-4">
          {searchResults.length > 0 ? (
            `Found ${searchResults.length} item${searchResults.length === 1 ? '' : 's'}`
          ) : loading ? (
            'Searching...'
          ) : (
            'No content found'
          )}
        </div>
      </Card>

      <ScrollArea className="h-96">
        <div className="space-y-2">
          {searchResults.map((result, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getFileIcon(result.type)}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{result.name}</div>
                    <div className="text-sm text-muted-foreground">
                      <code className="text-xs mr-2">{result.cid.slice(0, 16)}...</code>
                      <span>{ipfsUtils.formatSize(result.size)}</span>
                    </div>
                  </div>
                  {result.pinned && (
                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="w-3 h-3" />
                      Pinned
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.cid)}
                    title="Copy CID"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => previewContent(result.cid)}
                        title="Preview content"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Content Preview</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                          <strong>CID:</strong> <code>{selectedContent}</code>
                        </div>
                        <ScrollArea className="h-64 p-3 bg-muted rounded">
                          <pre className="text-sm whitespace-pre-wrap">{contentPreview}</pre>
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadContent(result)}
                    title="Download content"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  
                  {!result.pinned && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => pinContent(result.cid)}
                      title="MapPin content"
                    >
                      <MapPin className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
      
      {searchResults.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <MagnifyingGlass className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No IPFS Content Found</h3>
          <p className="text-muted-foreground mb-4">
            Upload files via email attachments or pin content to see it here
          </p>
          <Button onClick={loadPinnedContent}>Refresh Content</Button>
        </Card>
      )}
    </div>
  )
}