import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { IPFSBrowser } from './IPFSBrowser'
import { 
  MagnifyingGlass,
  Lock,
  Globe,
  ChatCircle,
  Envelope,
  File,
  Calendar,
  User,
  Shield,
  Database,
  Brain,
  Lightning,
  ArrowSquareOut,
  VideoCamera,
  IdentificationCard,
  Network,
  Command
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { useDecentralizedSearch, SearchIndexEntry } from '../blockchain/SearchBackend'

interface SearchViewProps {
  onNavigateToBrowser?: (url: string) => void
}

export function SearchView({ onNavigateToBrowser }: SearchViewProps = {}) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [results, setResults] = useState<SearchIndexEntry[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  const { zkSearch, searchIPFS, indexStats } = useDecentralizedSearch()

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    try {
      const filters = activeTab === 'all' ? {} : { type: activeTab }
      const searchResults = await zkSearch(searchQuery, filters)
      setResults(searchResults)
    } catch (error) {
      console.error('MagnifyingGlass failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleIPFSSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const ipfsResults = await searchIPFS(searchQuery)
      setResults(ipfsResults)
    } catch (error) {
      console.error('IPFS search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return ChatCircle
      case 'email': return Envelope
      case 'contact': return User
      case 'file': return File
      case 'domain': return Globe
      case 'transaction': return Database
      case 'video': return VideoCamera
      case 'identity': return IdentificationCard
      default: return File
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'message': return 'bg-blue-500/20 text-blue-400'
      case 'email': return 'bg-green-500/20 text-green-400'
      case 'contact': return 'bg-purple-500/20 text-purple-400'
      case 'file': return 'bg-orange-500/20 text-orange-400'
      case 'domain': return 'bg-pink-500/20 text-pink-400'
      case 'transaction': return 'bg-cyan-500/20 text-cyan-400'
      case 'video': return 'bg-red-500/20 text-red-400'
      case 'identity': return 'bg-indigo-500/20 text-indigo-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border bg-card">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">PrivaChain Hybrid Search</h2>
            <p className="text-muted-foreground">
              Privacy-first search powered by OrbitDB • Zero tracking • Bang commands supported
            </p>
          </div>
          
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (e.target.value.length > 2) {
                  handleSearch(e.target.value)
                } else {
                  setResults([])
                }
              }}
              placeholder="Search or try bang commands like !w wikipedia, !prv domains, !mail encrypted emails..."
              className="pl-12 h-12 text-lg"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Brain className="w-5 h-5 animate-pulse text-accent" />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Zero-knowledge search • No tracking • Fully encrypted</span>
              {indexStats.orbitDBConnected && (
                <>
                  <Network className="w-4 h-4 ml-2" />
                  <span>OrbitDB Connected</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{indexStats.totalIndexed} indexed</span>
              </div>
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>{indexStats.encryptedEntries} encrypted</span>
              </div>
              {indexStats.peerConnections > 0 && (
                <div className="flex items-center gap-1">
                  <Network className="w-3 h-3" />
                  <span>{indexStats.peerConnections} peers</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Lightning className="w-3 h-3" />
                <span>{indexStats.queryHistory} queries</span>
              </div>
            </div>
          </div>

          {/* Bang Commands Help */}
          {query.startsWith('!') && (
            <Card className="p-3 bg-accent/10 border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <Command className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">Bang Commands Available:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><code>!w</code> - Search Wikipedia</div>
                <div><code>!prv</code> - Search .prv domains</div>
                <div><code>!mail</code> - Search encrypted emails</div>
                <div><code>!video</code> - Search video calls</div>
                <div><code>!file</code> - Search files</div>
                <div><code>!cosmos</code> - Search blockchain</div>
                <div><code>!ipfs</code> - Search IPFS network</div>
                <div><code>!onion</code> - Search onion services</div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="flex-1 p-6">
        {query.length === 0 ? (
          <div className="text-center py-12">
            <MagnifyingGlass className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Start Searching</h3>
            <p className="text-muted-foreground mb-6">Enter a search term to find content across your encrypted network</p>
            
            <div className="max-w-2xl mx-auto">
              <h4 className="font-semibold mb-3">Search Features</h4>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Lock className="w-5 h-5 text-accent" />
                    <span className="font-medium">Encrypted Search</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Search through encrypted content without exposing data to servers
                  </p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Network className="w-5 h-5 text-accent" />
                    <span className="font-medium">OrbitDB P2P</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Decentralized search across peer-to-peer network
                  </p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Command className="w-5 h-5 text-accent" />
                    <span className="font-medium">Bang Commands</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use !w for Wikipedia, !prv for domains, !mail for emails
                  </p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-accent" />
                    <span className="font-medium">No Tracking</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your searches remain private and are never logged
                  </p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <VideoCamera className="w-5 h-5 text-accent" />
                    <span className="font-medium">Video & Identity</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Search encrypted video calls and anonymous identities
                  </p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Database className="w-5 h-5 text-accent" />
                    <span className="font-medium">IPFS Storage</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Browse and search decentralized file storage network
                  </p>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                Found {results.length} results for "{query}"
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>Searched with zero-knowledge encryption</span>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="message">Messages</TabsTrigger>
                <TabsTrigger value="email">Emails</TabsTrigger>
                <TabsTrigger value="video">Videos</TabsTrigger>
                <TabsTrigger value="file">Files</TabsTrigger>
                <TabsTrigger value="domain">Domains</TabsTrigger>
                <TabsTrigger value="ipfs" onClick={() => handleIPFSSearch(query)}>
                  <Database className="w-4 h-4 mr-1" />
                  IPFS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ipfs" className="mt-6">
                <IPFSBrowser />
              </TabsContent>

              <TabsContent value={activeTab === 'ipfs' ? 'hidden' : activeTab} className="mt-6">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {results.length === 0 ? (
                      <div className="text-center py-8">
                        <MagnifyingGlass className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No results found for this search</p>
                      </div>
                    ) : (
                      results.map(result => {
                        const IconComponent = getIcon(result.type)
                        return (
                          <Card key={result.id} className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                            <div className="flex items-start gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                getTypeColor(result.type)
                              )}>
                                <IconComponent className="w-5 h-5" />
                              </div>
                              
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold">{result.metadata.title}</h3>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="capitalize">
                                      {result.type}
                                    </Badge>
                                    {result.metadata.encrypted && (
                                      <Badge variant="secondary" className="gap-1">
                                        <Lock className="w-3 h-3" />
                                        Encrypted
                                      </Badge>
                                    )}
                                    {result.zkProof && (
                                      <Badge variant="outline" className="gap-1">
                                        <Brain className="w-3 h-3" />
                                        ZK-Proof
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <p className="text-muted-foreground line-clamp-2">
                                  {result.metadata.description}
                                </p>
                                
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="font-mono">{result.metadata.source}</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(result.metadata.timestamp).toLocaleDateString()}
                                  </span>
                                  <span>Relevance: {Math.round(result.relevanceScore * 100)}%</span>
                                  {result.contentHash && (
                                    <span className="font-mono text-xs">{result.contentHash.substring(0, 12)}...</span>
                                  )}
                                </div>
                                {result.metadata.source.includes('http') && onNavigateToBrowser && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onNavigateToBrowser(result.metadata.source)
                                    }}
                                  >
                                    <ArrowSquareOut className="w-3 h-3 mr-1" />
                                    Browse
                                  </Button>
                                )}
                              </div>
                              </div>
                            </div>
                          </Card>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}