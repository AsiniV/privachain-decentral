import { useState, useEffect, useCallback, useMemo } from 'react'
import { useKV } from '../hooks/useKV'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { ExtensionManager } from './ExtensionManager'
import { toast } from 'sonner'
import { proxyVPN } from '../services/proxyVPN'
import { contentFilter } from '../services/contentFilter'
import { codecManager } from '../services/codecManager'
import { unblockingService } from '../services/unblocking'
import { cn } from '../lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  ArrowClockwise,
  House,
  MagnifyingGlass,
  Shield,
  Lock,
  LockOpen,
  Globe,
  BookmarkSimple,
  Plus,
  X,
  Eye,
  EyeSlash,
  ShieldCheck,
  Gear,
  WifiHigh,
  ChatCircle,
  Envelope,
  File,
  Calendar,
  User,
  PuzzlePiece
} from '@phosphor-icons/react'

interface BrowserTab {
  id: string
  url: string
  title: string
  loading: boolean
  secure: boolean
  favicon?: string
  content?: string
  error?: string
}

interface Bookmark {
  id: string
  url: string
  title: string
  favicon?: string
  folder?: string
}

interface ProxyNode {
  id: string
  location: string
  speed: number
  load: number
  active: boolean
  encryption: string
}

interface SearchResult {
  id: string
  type: 'message' | 'email' | 'contact' | 'file' | 'web' | 'domain'
  title: string
  content: string
  source: string
  timestamp: number
  encrypted: boolean
  relevance: number
  url?: string
}

interface BrowserViewProps {
  initialUrl?: string
}

export function BrowserView({ initialUrl }: BrowserViewProps = {}) {
  const [tabs, setTabs] = useKV<BrowserTab[]>('browser-tabs', [])
  const [activeTabId, setActiveTabId] = useKV<string>('active-tab', '')
  // const [bookmarks, setBookmarks] = useKV<Bookmark[]>('browser-bookmarks', [])
  // const [history, setHistory] = useKV<string[]>('browser-history', [])
  const [proxyEnabled, setProxyEnabled] = useKV('proxy-enabled', true)
  const [vpnEnabled, setVpnEnabled] = useKV('vpn-enabled', true)
  const [adBlockEnabled, setAdBlockEnabled] = useKV('adblock-enabled', true)
  const [javascriptEnabled, setJavascriptEnabled] = useKV('javascript-enabled', true)
  const [cookiesEnabled, setCookiesEnabled] = useKV('cookies-enabled', false)
  const [trackingProtection, setTrackingProtection] = useKV('tracking-protection', true)
  const [incognitoMode, setIncognitoMode] = useKV('incognito-mode', false)
  
  const [urlInput, setUrlInput] = useState('')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  // const [showBookmarks, setShowBookmarks] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showExtensions, setShowExtensions] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  
  // const iframeRef = useRef<HTMLIFrameElement>(null)

  // Mock proxy nodes for demonstration
  const [proxyNodes] = useState<ProxyNode[]>([
    { id: '1', location: 'Netherlands', speed: 95, load: 34, active: true, encryption: 'AES-256' },
    { id: '2', location: 'Switzerland', speed: 87, load: 67, active: false, encryption: 'ChaCha20' },
    { id: '3', location: 'Iceland', speed: 92, load: 23, active: false, encryption: 'AES-256' },
    { id: '4', location: 'Sweden', speed: 89, load: 45, active: false, encryption: 'WireGuard' },
  ])

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  // Mock search results that would come from the decentralized search service
  const mockSearchResults: SearchResult[] = useMemo(() => [
    {
      id: '1',
      type: 'web',
      title: 'PrivaChain Network Documentation',
      content: 'Complete guide to anonymous browsing and secure communications on the PrivaChain network.',
      source: 'docs.privachain.prv',
      timestamp: Date.now() - 300000,
      encrypted: true,
      relevance: 0.98,
      url: 'https://docs.privachain.prv'
    },
    {
      id: '2',
      type: 'message',
      title: 'Encrypted Chat Thread',
      content: 'Secure conversation about blockchain privacy protocols and zero-knowledge implementations.',
      source: 'anonymous.prv',
      timestamp: Date.now() - 600000,
      encrypted: true,
      relevance: 0.92
    },
    {
      id: '3',
      type: 'domain',
      title: 'journalist.prv',
      content: 'Verified anonymous journalist domain with PGP encryption and secure messaging.',
      source: 'blockchain:cosmos',
      timestamp: Date.now() - 900000,
      encrypted: true,
      relevance: 0.89,
      url: 'privachain://domain/journalist.prv'
    },
    {
      id: '4',
      type: 'web',
      title: 'Tor Browser - Protect yourself against tracking',
      content: 'Download Tor Browser to experience real private browsing without tracking.',
      source: 'torproject.org',
      timestamp: Date.now() - 1200000,
      encrypted: false,
      relevance: 0.85,
      url: 'https://www.torproject.org'
    },
    {
      id: '5',
      type: 'file',
      title: 'Privacy Whitepaper.pdf',
      content: 'Technical specification for quantum-resistant encryption and anonymous communication.',
      source: 'ipfs://QmXyZ789...',
      timestamp: Date.now() - 1500000,
      encrypted: true,
      relevance: 0.82
    },
    {
      id: '6',
      type: 'email',
      title: 'Network Security Update',
      content: 'Latest security patches and protocol improvements for enhanced anonymity.',
      source: 'security@privachain.prv',
      timestamp: Date.now() - 1800000,
      encrypted: true,
      relevance: 0.78
    }
  ], [])

  // MagnifyingGlass function that integrates with decentralized search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setShowSearchResults(false)
      return
    }

    setSearchQuery(query)
    setShowSearchResults(true)

    // Simulate search across decentralized network
    const filteredResults = mockSearchResults.filter(result =>
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.content.toLowerCase().includes(query.toLowerCase()) ||
      result.source.toLowerCase().includes(query.toLowerCase())
    ).sort((a, b) => b.relevance - a.relevance)

    setSearchResults(filteredResults)
    
    // Also create a search results tab
    const searchTab: BrowserTab = {
      id: Date.now().toString(),
      url: `privachain://search?q=${encodeURIComponent(query)}`,
      title: `MagnifyingGlass: ${query}`,
      loading: false,
      secure: true,
      content: generateSearchResultsPage(query, filteredResults)
    }
    
    setTabs(prev => [...prev, searchTab])
    setActiveTabId(searchTab.id)
  }, [setSearchQuery, setShowSearchResults, setSearchResults, setTabs, setActiveTabId, mockSearchResults])

  // Initialize with a default tab if none exist, or navigate to initial URL
  useEffect(() => {
    if (initialUrl && initialUrl !== '') {
      // Create a new tab for the initial URL
      const newTab: BrowserTab = {
        id: Date.now().toString(),
        url: initialUrl,
        title: 'Loading...',
        loading: true,
        secure: initialUrl.startsWith('https://') || initialUrl.startsWith('privachain://'),
      }
      setTabs(prev => [...prev, newTab])
      setActiveTabId(newTab.id)
      navigateToUrl(initialUrl, newTab.id)
    } else if (tabs.length === 0) {
      const defaultTab: BrowserTab = {
        id: '1',
        url: 'privachain://welcome',
        title: 'PrivaChain Browser',
        loading: false,
        secure: true,
        content: generateWelcomePage()
      }
      setTabs([defaultTab])
      setActiveTabId('1')
    }
  }, [initialUrl, tabs.length, setTabs, setActiveTabId, navigateToUrl])

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await codecManager.initialize()
        await contentFilter.initialize()
        await proxyVPN.initialize()
        await unblockingService.initialize()
        console.log('PrivaChain Browser services initialized')
      } catch (error) {
        console.error('Failed to initialize browser services:', error)
        toast.error('Some browser features may not work properly')
      }
    }

    initializeServices()
  }, [])

  const createNewTab = () => {
    const newTab: BrowserTab = {
      id: Date.now().toString(),
      url: 'privachain://newtab',
      title: 'New Tab',
      loading: false,
      secure: true,
      content: generateNewTabPage()
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId)
    setTabs(newTabs)
    
    if (tabId === activeTabId && newTabs.length > 0) {
      setActiveTabId(newTabs[0].id)
    } else if (newTabs.length === 0) {
      createNewTab()
    }
  }

  const navigateToUrl = useCallback(async (url: string, tabId?: string) => {
    const targetTabId = tabId || activeTabId
    if (!targetTabId) return

    // Clean and validate URL
    let cleanUrl = url.trim()
    
    // Check if this is a search query rather than a URL
    if (!cleanUrl.includes('://') && !cleanUrl.includes('.')) {
      // This is a search query - perform search instead of navigation
      await performSearch(cleanUrl)
      return
    }
    
    if (!cleanUrl.includes('://')) {
      if (cleanUrl.includes('.') && !cleanUrl.includes(' ')) {
        cleanUrl = `https://${cleanUrl}`
      } else {
        // Treat as search query
        await performSearch(cleanUrl)
        return
      }
    }

    // Hide search results when navigating to a URL
    setShowSearchResults(false)

    // Check if URL should be blocked
    if (contentFilter.shouldBlockRequest(cleanUrl)) {
      toast.error('Blocked by security filters')
      return
    }

    // Sanitize URL to remove tracking parameters
    cleanUrl = contentFilter.sanitizeUrl(cleanUrl)

    // Update tab with loading state
    setTabs(prev => prev.map(tab => 
      tab.id === targetTabId 
        ? { ...tab, loading: true, url: cleanUrl, error: undefined }
        : tab
    ))

    // Add to history (if not incognito)
    if (!incognitoMode) {
      setHistory(prev => [cleanUrl, ...prev.slice(0, 99)])
    }

    // Route through proxy if enabled
    try {
      setLoadingProgress(0)
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 100
          }
          return prev + Math.random() * 15
        })
      }, 100)

      // Check if domain is blocked and attempt bypass
      const domain = new URL(cleanUrl).hostname.replace('www.', '')
      let finalUrl = cleanUrl
      
      if (unblockingService.isDomainBlocked(domain)) {
        try {
          const bypassResult = await unblockingService.autoBypass(cleanUrl)
          if (bypassResult.success && bypassResult.bypassUrl) {
            finalUrl = bypassResult.bypassUrl
            toast.info(`Bypassing blocked content via ${bypassResult.method}`)
          }
        } catch (bypassError) {
          console.warn('Bypass failed, using original URL:', bypassError)
        }
      }

      // Use proxy service for actual requests
      let response: Response
      if (proxyVPN.isConnected()) {
        response = await proxyVPN.routeRequest(finalUrl)
      } else {
        response = await fetch(finalUrl)
      }
      
      clearInterval(progressInterval)
      setLoadingProgress(100)

      // Get content and check for security threats
      const content = await response.text()
      
      // Check for phishing and malware
      if (contentFilter.detectPhishing(finalUrl, content)) {
        throw new Error('Phishing site detected')
      }
      
      if (contentFilter.detectMalware(finalUrl, content)) {
        throw new Error('Malware detected')
      }

      // Sanitize content
      const sanitizedContent = contentFilter.sanitizeHTML(content)
      const finalContent = await generatePageContent(finalUrl, sanitizedContent)
      const title = extractTitle(finalContent) || new URL(finalUrl).hostname
      
      setTabs(prev => prev.map(tab => 
        tab.id === targetTabId 
          ? { 
              ...tab, 
              loading: false, 
              url: finalUrl,
              title,
              secure: finalUrl.startsWith('https://') || finalUrl.startsWith('privachain://'),
              content: finalContent
            }
          : tab
      ))

      const proxyStatus = proxyVPN.isConnected() ? 'Via encrypted proxy' : 'Direct connection'
      const bypassStatus = finalUrl !== cleanUrl ? ' (bypassed)' : ''
      toast.success(`Loaded ${title}`, {
        description: proxyStatus + bypassStatus
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed'
      
      // If loading failed, try to suggest bypass methods
      if (errorMessage.includes('blocked') || errorMessage.includes('403') || errorMessage.includes('451')) {
        const suggestions = unblockingService.generateBypassSuggestions(cleanUrl)
        toast.error(`Content blocked - ${suggestions[0] || 'Try using PrivaChain proxy'}`)
      }
      
      setTabs(prev => prev.map(tab => 
        tab.id === targetTabId 
          ? { 
              ...tab, 
              loading: false,
              error: errorMessage,
              content: generateErrorPage(cleanUrl, errorMessage)
            }
          : tab
      ))
      toast.error(`Failed to load page: ${errorMessage}`)
    }

    setTimeout(() => setLoadingProgress(0), 500)
  }, [activeTabId, setTabs, incognitoMode, performSearch])

  const refreshPage = () => {
    if (activeTab) {
      navigateToUrl(activeTab.url)
    }
  }

  const goBack = () => {
    // In a real implementation, this would use browser history
    toast.info('Back navigation')
  }

  const goForward = () => {
    // In a real implementation, this would use browser history
    toast.info('Forward navigation')
  }

  const addBookmark = () => {
    if (!activeTab) return
    
    const bookmark: Bookmark = {
      id: Date.now().toString(),
      url: activeTab.url,
      title: activeTab.title,
      favicon: activeTab.favicon
    }
    
    setBookmarks(prev => [...prev, bookmark])
    toast.success('Bookmark added')
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (urlInput.trim()) {
      navigateToUrl(urlInput)
      setUrlInput('')
    }
  }

  const getSearchIcon = (type: string) => {
    switch (type) {
      case 'message': return ChatCircle
      case 'email': return Envelope
      case 'contact': return User
      case 'file': return File
      case 'web': return Globe
      case 'domain': return Shield
      default: return File
    }
  }

  const getSearchTypeColor = (type: string) => {
    switch (type) {
      case 'message': return 'bg-blue-500/20 text-blue-400'
      case 'email': return 'bg-green-500/20 text-green-400'
      case 'contact': return 'bg-purple-500/20 text-purple-400'
      case 'file': return 'bg-orange-500/20 text-orange-400'
      case 'web': return 'bg-cyan-500/20 text-cyan-400'
      case 'domain': return 'bg-indigo-500/20 text-indigo-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const navigateToSearchResult = (result: SearchResult) => {
    if (result.url) {
      navigateToUrl(result.url)
    } else if (result.type === 'message') {
      // Switch to messenger view and open conversation
      toast.info('Opening in messenger...')
    } else if (result.type === 'email') {
      // Switch to email view and open email
      toast.info('Opening in email...')
    } else if (result.type === 'file') {
      // Open file viewer
      toast.info('Opening file...')
    }
    setShowSearchResults(false)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Browser Toolbar */}
      <div className="border-b border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goForward}>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={refreshPage}>
            <ArrowClockwise className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateToUrl('privachain://welcome')}>
            <House className="w-4 h-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {activeTab?.secure ? (
                  <Lock className="w-4 h-4 text-green-500" />
                ) : (
                  <LockOpen className="w-4 h-4 text-yellow-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {proxyEnabled && vpnEnabled ? 'Secure+VPN' : proxyEnabled ? 'Proxy' : 'Direct'}
                </span>
              </div>
              <Input
                value={urlInput || activeTab?.url || ''}
                onChange={(e) => {
                  setUrlInput(e.target.value)
                  // Trigger search suggestions as user types
                  if (e.target.value.trim() && !e.target.value.includes('://')) {
                    performSearch(e.target.value)
                  } else {
                    setShowSearchResults(false)
                  }
                }}
                placeholder="MagnifyingGlass or enter address..."
                className="pl-24 pr-12"
              />
              <Button type="submit" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2">
                <MagnifyingGlass className="w-4 h-4" />
              </Button>
            </div>
          </form>

          <Button variant="ghost" size="sm" onClick={addBookmark}>
            <BookmarkSimple className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Gear className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowExtensions(!showExtensions)}>
            <PuzzlePiece className="w-4 h-4" />
          </Button>
        </div>

        {/* Security Status Bar */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className={`w-3 h-3 ${proxyEnabled ? 'text-green-500' : 'text-gray-400'}`} />
            <span>Proxy: {proxyEnabled ? 'ON' : 'OFF'}</span>
          </div>
          <div className="flex items-center gap-1">
            <WifiHigh className={`w-3 h-3 ${vpnEnabled ? 'text-green-500' : 'text-gray-400'}`} />
            <span>VPN: {vpnEnabled ? 'ON' : 'OFF'}</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className={`w-3 h-3 ${adBlockEnabled ? 'text-green-500' : 'text-gray-400'}`} />
            <span>AdBlock: {adBlockEnabled ? 'ON' : 'OFF'}</span>
          </div>
          <div className="flex items-center gap-1">
            {incognitoMode ? <EyeSlash className="w-3 h-3 text-blue-500" /> : <Eye className="w-3 h-3" />}
            <span>Mode: {incognitoMode ? 'Incognito' : 'Normal'}</span>
          </div>
          {loadingProgress > 0 && loadingProgress < 100 && (
            <div className="flex-1 max-w-32">
              <Progress value={loadingProgress} className="h-1" />
            </div>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-border bg-muted/30 p-1">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 min-w-0 max-w-48 px-3 py-1.5 rounded-t cursor-pointer group ${
                tab.id === activeTabId ? 'bg-background border-l border-r border-t border-border' : 'hover:bg-muted'
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {tab.loading ? (
                  <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Globe className="w-3 h-3 flex-shrink-0" />
                )}
                <span className="text-xs truncate">{tab.title}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-4 h-4 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={createNewTab} className="ml-1">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* MagnifyingGlass Results Overlay */}
        {showSearchResults && (
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-background/95 backdrop-blur-sm z-50 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">PrivaChain MagnifyingGlass</h2>
                  <p className="text-muted-foreground">
                    Found {searchResults.length} results for "{searchQuery}"
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowSearchResults(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Zero-knowledge search • No tracking • Results from decentralized network</span>
              </div>

              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-4">
                  {searchResults.map(result => {
                    const IconComponent = getSearchIcon(result.type)
                    return (
                      <Card 
                        key={result.id} 
                        className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigateToSearchResult(result)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                            getSearchTypeColor(result.type)
                          )}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 space-y-2 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-lg hover:text-primary truncate">
                                {result.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="outline" className="capitalize">
                                  {result.type}
                                </Badge>
                                {result.encrypted && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Lock className="w-3 h-3" />
                                    Encrypted
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                              {result.content}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                {result.source}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(result.timestamp).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-primary rounded-full"></span>
                                {Math.round(result.relevance * 100)}% relevance
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Extension Manager Panel */}
        {showExtensions && (
          <div className="w-96 border-l border-border bg-background">
            <ExtensionManager />
          </div>
        )}

        {/* Gear Panel */}
        {showSettings && (
          <Card className="w-80 m-4 p-4 h-fit max-h-[calc(100vh-120px)] overflow-y-auto">
            <Tabs defaultValue="privacy" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="privacy">Privacy</TabsTrigger>
                <TabsTrigger value="codecs">Codecs</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
              </TabsList>
              
              <TabsContent value="privacy" className="space-y-4">
                <h3 className="font-semibold">Privacy & Security</h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Proxy Protection</span>
                    <Button
                      variant={proxyEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProxyEnabled(!proxyEnabled)}
                    >
                      {proxyEnabled ? 'ON' : 'OFF'}
                    </Button>
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">VPN Connection</span>
                    <Button
                      variant={vpnEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVpnEnabled(!vpnEnabled)}
                    >
                      {vpnEnabled ? 'ON' : 'OFF'}
                    </Button>
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Ad Blocker</span>
                    <Button
                      variant={adBlockEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAdBlockEnabled(!adBlockEnabled)}
                    >
                      {adBlockEnabled ? 'ON' : 'OFF'}
                    </Button>
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Tracking Protection</span>
                    <Button
                      variant={trackingProtection ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTrackingProtection(!trackingProtection)}
                    >
                      {trackingProtection ? 'ON' : 'OFF'}
                    </Button>
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Incognito Mode</span>
                    <Button
                      variant={incognitoMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIncognitoMode(!incognitoMode)}
                    >
                      {incognitoMode ? 'ON' : 'OFF'}
                    </Button>
                  </label>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Content Gear</h4>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center justify-between">
                      <span>JavaScript</span>
                      <Button
                        variant={javascriptEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => setJavascriptEnabled(!javascriptEnabled)}
                      >
                        {javascriptEnabled ? 'ON' : 'OFF'}
                      </Button>
                    </label>
                    <label className="flex items-center justify-between">
                      <span>Cookies</span>
                      <Button
                        variant={cookiesEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCookiesEnabled(!cookiesEnabled)}
                      >
                        {cookiesEnabled ? 'ON' : 'OFF'}
                      </Button>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Security Statistics</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted p-2 rounded">
                      <div className="font-medium">{contentFilter.getStats().adsBlocked}</div>
                      <div className="text-muted-foreground">Ads Blocked</div>
                    </div>
                    <div className="bg-muted p-2 rounded">
                      <div className="font-medium">{contentFilter.getStats().trackersBlocked}</div>
                      <div className="text-muted-foreground">Trackers Blocked</div>
                    </div>
                    <div className="bg-muted p-2 rounded">
                      <div className="font-medium">{Math.round(contentFilter.getStats().bytesBlocked / 1024)}KB</div>
                      <div className="text-muted-foreground">Data Saved</div>
                    </div>
                    <div className="bg-muted p-2 rounded">
                      <div className="font-medium">{contentFilter.getStats().loadTimeImproved}ms</div>
                      <div className="text-muted-foreground">Time Saved</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="codecs" className="space-y-4">
                <h3 className="font-semibold">Media Support</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">VideoCamera Codecs</h4>
                    <div className="space-y-1 text-xs">
                      {codecManager.getCapabilities() && Object.entries(codecManager.getCapabilities()!.video).map(([codec, supported]) => (
                        <div key={codec} className="flex items-center justify-between">
                          <span className="capitalize">{codec.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <Badge variant={supported ? "default" : "secondary"}>
                            {supported ? '✓' : '✗'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Audio Codecs</h4>
                    <div className="space-y-1 text-xs">
                      {codecManager.getCapabilities() && Object.entries(codecManager.getCapabilities()!.audio).map(([codec, supported]) => (
                        <div key={codec} className="flex items-center justify-between">
                          <span className="capitalize">{codec}</span>
                          <Badge variant={supported ? "default" : "secondary"}>
                            {supported ? '✓' : '✗'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Image Formats</h4>
                    <div className="space-y-1 text-xs">
                      {codecManager.getCapabilities() && Object.entries(codecManager.getCapabilities()!.image).map(([format, supported]) => (
                        <div key={format} className="flex items-center justify-between">
                          <span className="uppercase">{format}</span>
                          <Badge variant={supported ? "default" : "secondary"}>
                            {supported ? '✓' : '✗'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Streaming</h4>
                    <div className="space-y-1 text-xs">
                      {codecManager.getCapabilities() && Object.entries(codecManager.getCapabilities()!.streaming).map(([tech, supported]) => (
                        <div key={tech} className="flex items-center justify-between">
                          <span className="uppercase">{tech}</span>
                          <Badge variant={supported ? "default" : "secondary"}>
                            {supported ? '✓' : '✗'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">WebGL & WASM</h4>
                    <div className="space-y-1 text-xs">
                      {codecManager.getCapabilities() && [
                        ...Object.entries(codecManager.getCapabilities()!.webgl),
                        ...Object.entries(codecManager.getCapabilities()!.webassembly)
                      ].map(([tech, supported]) => (
                        <div key={tech} className="flex items-center justify-between">
                          <span className="capitalize">{tech.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <Badge variant={supported ? "default" : "secondary"}>
                            {supported ? '✓' : '✗'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="network" className="space-y-4">
                <h3 className="font-semibold">Network Status</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Connection Status</h4>
                    <div className="bg-muted p-3 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${proxyVPN.isConnected() ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium">
                          {proxyVPN.isConnected() ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      {proxyVPN.getActiveNode() && (
                        <div className="text-xs text-muted-foreground">
                          <div>Location: {proxyVPN.getActiveNode()?.location}</div>
                          <div>Encryption: {proxyVPN.getActiveNode()?.encryption}</div>
                          <div>Latency: {proxyVPN.getActiveNode()?.latency}ms</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Available Nodes</h4>
                    <div className="space-y-2">
                      {proxyNodes.map((node) => (
                        <div key={node.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${node.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span>{node.location}</span>
                            <Badge variant="outline" className="text-xs">{node.encryption}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{node.speed}%</Badge>
                            <Badge variant="outline" className="text-xs">{node.load}%</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={async () => {
                                if (proxyVPN.isConnected()) {
                                  await proxyVPN.switchNode(node.id)
                                  toast.success(`Switched to ${node.location}`)
                                }
                              }}
                              disabled={node.active}
                            >
                              {node.active ? 'Active' : 'Connect'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Traffic Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted p-2 rounded">
                        <div className="font-medium">{proxyVPN.getStats().totalRequests}</div>
                        <div className="text-muted-foreground">Requests</div>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <div className="font-medium">{Math.round(proxyVPN.getStats().totalDataTransferred / 1024)}KB</div>
                        <div className="text-muted-foreground">Data</div>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <div className="font-medium">{proxyVPN.getStats().averageSpeed}%</div>
                        <div className="text-muted-foreground">Speed</div>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <div className="font-medium">{proxyVPN.getStats().sessionsActive}</div>
                        <div className="text-muted-foreground">Sessions</div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        )}

        {/* Browser Content */}
        <div className="flex-1 bg-background">
          {activeTab?.content ? (
            <div 
              className="h-full w-full p-4 overflow-auto"
              dangerouslySetInnerHTML={{ __html: activeTab.content }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Loading...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper functions for content generation
async function generatePageContent(url: string, content?: string): Promise<string> {
  // If we have actual content, use it (with enhancements)
  if (content && !url.startsWith('privachain://')) {
    return enhanceWebContent(content, url)
  }

  // Otherwise generate demo content based on URL
  if (url.includes('duckduckgo.com')) {
    return generateSearchPage(url)
  } else if (url.startsWith('privachain://search')) {
    // This is handled separately by generateSearchResultsPage
    return generateNewTabPage()
  } else if (url.includes('github.com')) {
    return generateGitHubPage()
  } else if (url.includes('youtube.com')) {
    return generateYouTubePage()
  } else if (url.includes('wikipedia.org')) {
    return generateWikipediaPage()
  } else if (url.startsWith('privachain://welcome')) {
    return generateWelcomePage()
  } else if (url.startsWith('privachain://newtab')) {
    return generateNewTabPage()
  } else {
    return generateGenericPage(url)
  }
}

function generateSearchResultsPage(query: string, results: SearchResult[]): string {
  const resultsHtml = results.map(result => {
    const iconMap = {
      'message': '💬',
      'email': '✉️',
      'contact': '👤',
      'file': '📄',
      'web': '🌐',
      'domain': '🔒'
    }
    
    return `
      <div style="background: white; border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; margin-bottom: 15px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05);" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05)'">
        <div style="display: flex; align-items: start; gap: 15px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
            ${iconMap[result.type] || '📄'}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <h3 style="color: #1a0dab; margin: 0; font-size: 18px; font-weight: 500; text-decoration: none;">${result.title}</h3>
              <div style="display: flex; gap: 8px; align-items: center;">
                <span style="background: #f1f3f4; color: #5f6368; padding: 2px 8px; border-radius: 12px; font-size: 12px; text-transform: capitalize;">${result.type}</span>
                ${result.encrypted ? '<span style="background: #e8f5e8; color: #137333; padding: 2px 8px; border-radius: 12px; font-size: 12px;">🔒 Encrypted</span>' : ''}
              </div>
            </div>
            <p style="color: #006621; margin: 0 0 8px; font-size: 14px; font-family: monospace;">${result.source}</p>
            <p style="color: #4d5156; margin: 0 0 8px; line-height: 1.5;">${result.content}</p>
            <div style="display: flex; gap: 15px; font-size: 12px; color: #70757a;">
              <span>${new Date(result.timestamp).toLocaleDateString()}</span>
              <span>Relevance: ${Math.round(result.relevance * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    `
  }).join('')

  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 30px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
          🔍
        </div>
        <h1 style="color: #1a1a1a; margin: 0 0 10px; font-size: 28px; font-weight: 600;">PrivaChain MagnifyingGlass Results</h1>
        <p style="color: #666; margin: 0; font-size: 16px;">Found ${results.length} results for "${query}"</p>
      </div>

      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center; color: white;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px; font-size: 14px;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <span>🔒</span>
            <span>Zero-knowledge search</span>
          </div>
          <div style="display: flex; align-items: center; gap: 5px;">
            <span>🌐</span>
            <span>Decentralized network</span>
          </div>
          <div style="display: flex; align-items: center; gap: 5px;">
            <span>👤</span>
            <span>Anonymous results</span>
          </div>
        </div>
      </div>
      
      <div>
        ${resultsHtml || `
          <div style="text-center; padding: 60px 20px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
            <h3 style="margin: 0 0 10px; font-size: 18px;">No results found</h3>
            <p style="margin: 0;">Try different search terms or check your spelling</p>
          </div>
        `}
      </div>
      
      <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center;">
        <p style="color: #666; margin: 0; font-size: 14px;">
          🔒 MagnifyingGlass conducted anonymously via PrivaChain decentralized search network
        </p>
      </div>
    </div>
  `
}

function enhanceWebContent(content: string, url: string): string {
  // Add PrivaChain enhancements to actual web content
  const domain = new URL(url).hostname
  
  const enhancement = `
    <div style="position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; font-size: 12px; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
      <div style="display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 600;">🔒 PrivaChain Protected</span>
          <span>•</span>
          <span>${domain}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; font-size: 11px;">
          <span>🛡️ Encrypted</span>
          <span>🌐 Proxied</span>
          <span>👤 Anonymous</span>
        </div>
      </div>
    </div>
    <div style="margin-top: 40px;">
      ${content}
    </div>
  `
  
  return enhancement
}
function generateWelcomePage(): string {
  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 20px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 32px; font-weight: bold;">P</span>
        </div>
        <h1 style="color: #1a1a1a; margin: 0; font-size: 32px; font-weight: 700;">Welcome to PrivaChain Browser</h1>
        <p style="color: #666; margin: 10px 0 0; font-size: 18px;">Secure, Anonymous, Uncensorable</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
          <h3 style="color: #1a1a1a; margin: 0 0 10px; font-size: 16px; font-weight: 600;">🔒 Complete Privacy</h3>
          <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.5;">All traffic routed through encrypted proxy networks with no logging.</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
          <h3 style="color: #1a1a1a; margin: 0 0 10px; font-size: 16px; font-weight: 600;">🌐 Access Anything</h3>
          <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.5;">Bypass censorship and access any website globally.</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
          <h3 style="color: #1a1a1a; margin: 0 0 10px; font-size: 16px; font-weight: 600;">⚡ High Performance</h3>
          <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.5;">Optimized proxy infrastructure for fast browsing.</p>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; color: white;">
        <h2 style="margin: 0 0 10px; font-size: 24px; font-weight: 700;">Ready to Browse Anonymously?</h2>
        <p style="margin: 0 0 20px; opacity: 0.9;">Enter any URL in the address bar to start browsing securely.</p>
        <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; display: inline-block;">
          <span style="font-family: monospace;">https://example.com</span>
        </div>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #666; font-size: 12px; text-align: center;">
        <p>PrivaChain Browser • Secure by Design • Built on Cosmos</p>
      </div>
    </div>
  `
}

function generateNewTabPage(): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 60px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; text-align: center;">
      <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; margin: 0 auto 30px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 24px; font-weight: bold;">P</span>
      </div>
      <h1 style="color: #1a1a1a; margin: 0 0 20px; font-size: 24px; font-weight: 600;">New Tab</h1>
      <p style="color: #666; margin: 0 0 30px;">Start typing in the address bar to search or navigate</p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; max-width: 400px; margin: 0 auto;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; cursor: pointer; transition: all 0.2s;">
          <div style="font-size: 20px; margin-bottom: 5px;">🔍</div>
          <div style="font-size: 12px; color: #666;">DuckDuckGo</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; cursor: pointer; transition: all 0.2s;">
          <div style="font-size: 20px; margin-bottom: 5px;">📰</div>
          <div style="font-size: 12px; color: #666;">News</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; cursor: pointer; transition: all 0.2s;">
          <div style="font-size: 20px; margin-bottom: 5px;">💬</div>
          <div style="font-size: 12px; color: #666;">Social</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; cursor: pointer; transition: all 0.2s;">
          <div style="font-size: 20px; margin-bottom: 5px;">🛒</div>
          <div style="font-size: 12px; color: #666;">Shopping</div>
        </div>
      </div>
    </div>
  `
}

function generateSearchPage(url: string): string {
  const query = new URL(url).searchParams.get('q') || 'search'
  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a1a1a; margin: 0 0 10px;">DuckDuckGo</h1>
        <input style="width: 100%; max-width: 400px; padding: 12px 16px; border: 1px solid #ddd; border-radius: 24px; font-size: 16px;" value="${query}" readonly />
      </div>
      
      <div style="space-y: 20px;">
        <div style="background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
          <h3 style="color: #1a0dab; margin: 0 0 5px; font-size: 18px;"><a href="#" style="text-decoration: none; color: inherit;">${query} - Wikipedia</a></h3>
          <p style="color: #006621; margin: 0 0 10px; font-size: 14px;">https://en.wikipedia.org/wiki/${query}</p>
          <p style="color: #4d5156; margin: 0; line-height: 1.5;">Learn more about ${query} on Wikipedia, the free encyclopedia that anyone can edit...</p>
        </div>
        
        <div style="background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
          <h3 style="color: #1a0dab; margin: 0 0 5px; font-size: 18px;"><a href="#" style="text-decoration: none; color: inherit;">${query} - Official Site</a></h3>
          <p style="color: #006621; margin: 0 0 10px; font-size: 14px;">https://www.${query.toLowerCase().replace(/\s+/g, '')}.com</p>
          <p style="color: #4d5156; margin: 0; line-height: 1.5;">Official website for ${query}. Find the latest information, updates, and resources...</p>
        </div>
        
        <div style="background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
          <h3 style="color: #1a0dab; margin: 0 0 5px; font-size: 18px;"><a href="#" style="text-decoration: none; color: inherit;">${query} News</a></h3>
          <p style="color: #006621; margin: 0 0 10px; font-size: 14px;">https://news.google.com/search?q=${query}</p>
          <p style="color: #4d5156; margin: 0; line-height: 1.5;">Latest news and updates about ${query} from trusted sources around the world...</p>
        </div>
      </div>
      
      <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center;">
        <p style="color: #666; margin: 0; font-size: 14px;">🔒 Your search was conducted anonymously via PrivaChain proxy</p>
      </div>
    </div>
  `
}

function generateGitHubPage(): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
      <div style="background: #24292f; color: white; padding: 16px 0;">
        <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; align-items: center; gap: 20px;">
          <div style="font-size: 24px; font-weight: bold;">GitHub</div>
          <input style="flex: 1; max-width: 400px; padding: 8px 12px; border: 1px solid #444; border-radius: 6px; background: #1c2128; color: white;" placeholder="MagnifyingGlass or jump to..." />
        </div>
      </div>
      
      <div style="max-width: 1200px; margin: 0 auto; padding: 40px 20px;">
        <div style="margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0 0 10px; font-size: 32px; font-weight: 600;">Where the world builds software</h1>
          <p style="color: #666; margin: 0; font-size: 18px;">Millions of developers and companies build, ship, and maintain their software on GitHub—the largest and most advanced development platform in the world.</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
          <div style="background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px;">
            <h3 style="color: #1a1a1a; margin: 0 0 15px; font-size: 18px;">🚀 Popular Repositories</h3>
            <div style="space-y: 10px;">
              <div style="padding: 10px; background: #f8f9fa; border-radius: 6px; margin-bottom: 8px;">
                <div style="font-weight: 600; color: #0969da;">microsoft/vscode</div>
                <div style="font-size: 12px; color: #666;">Visual Studio CodeSimple</div>
              </div>
              <div style="padding: 10px; background: #f8f9fa; border-radius: 6px; margin-bottom: 8px;">
                <div style="font-weight: 600; color: #0969da;">facebook/react</div>
                <div style="font-size: 12px; color: #666;">A declarative, efficient, and flexible JavaScript library</div>
              </div>
            </div>
          </div>
          
          <div style="background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px;">
            <h3 style="color: #1a1a1a; margin: 0 0 15px; font-size: 18px;">📈 Trending</h3>
            <div style="space-y: 10px;">
              <div style="padding: 10px; background: #f8f9fa; border-radius: 6px; margin-bottom: 8px;">
                <div style="font-weight: 600; color: #0969da;">openai/chatgpt</div>
                <div style="font-size: 12px; color: #666;">ChatGPT API implementation</div>
              </div>
              <div style="padding: 10px; background: #f8f9fa; border-radius: 6px; margin-bottom: 8px;">
                <div style="font-weight: 600; color: #0969da;">vercel/next.js</div>
                <div style="font-size: 12px; color: #666;">The React Framework</div>
              </div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 40px; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; text-align: center; color: white;">
          <h2 style="margin: 0 0 10px; font-size: 24px; font-weight: 700;">Start building today</h2>
          <p style="margin: 0 0 20px; opacity: 0.9;">Join millions of developers already using GitHub</p>
          <button style="background: white; color: #333; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer;">Sign up for GitHub</button>
        </div>
      </div>
    </div>
  `
}

function generateYouTubePage(): string {
  return `
    <div style="font-family: Roboto, Arial, sans-serif;">
      <div style="background: white; padding: 12px 20px; border-bottom: 1px solid #e5e5e5; display: flex; align-items: center; gap: 20px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="color: #ff0000; font-size: 24px; font-weight: bold;">YouTube</div>
        </div>
        <input style="flex: 1; max-width: 500px; padding: 8px 16px; border: 1px solid #ccc; border-radius: 20px;" placeholder="MagnifyingGlass" />
      </div>
      
      <div style="padding: 20px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
          <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="width: 100%; height: 180px; background: linear-gradient(45deg, #ff6b6b, #4ecdc4); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
              📹 VideoCamera Thumbnail
            </div>
            <div style="padding: 15px;">
              <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 500; line-height: 1.3;">Privacy-First Web Browsing in 2024</h3>
              <p style="margin: 0; color: #606060; font-size: 14px;">TechChannel • 2.1M views • 2 days ago</p>
            </div>
          </div>
          
          <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="width: 100%; height: 180px; background: linear-gradient(45deg, #a8edea, #fed6e3); display: flex; align-items: center; justify-content: center; color: #333; font-size: 18px;">
              🔒 Security Guide
            </div>
            <div style="padding: 15px;">
              <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 500; line-height: 1.3;">Complete Guide to Anonymous Internet</h3>
              <p style="margin: 0; color: #606060; font-size: 14px;">PrivacyPro • 856K views • 1 week ago</p>
            </div>
          </div>
          
          <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="width: 100%; height: 180px; background: linear-gradient(45deg, #ffecd2, #fcb69f); display: flex; align-items: center; justify-content: center; color: #333; font-size: 18px;">
              🌐 Web3 Tutorial
            </div>
            <div style="padding: 15px;">
              <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 500; line-height: 1.3;">Building Decentralized Apps</h3>
              <p style="margin: 0; color: #606060; font-size: 14px;">Web3Dev • 1.3M views • 3 days ago</p>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 40px; padding: 20px; background: #f9f9f9; border-radius: 8px; text-align: center;">
          <p style="color: #666; margin: 0; font-size: 14px;">🔒 Browsing YouTube via PrivaChain secure proxy</p>
        </div>
      </div>
    </div>
  `
}

function generateWikipediaPage(): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
      <div style="background: white; padding: 12px 20px; border-bottom: 1px solid #a2a9b1;">
        <div style="display: flex; align-items: center; gap: 20px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: normal;">Wikipedia</h1>
          <input style="flex: 1; max-width: 400px; padding: 6px 12px; border: 1px solid #a2a9b1; border-radius: 2px;" placeholder="MagnifyingGlass Wikipedia" />
        </div>
      </div>
      
      <div style="max-width: 900px; margin: 0 auto; padding: 30px 20px;">
        <h1 style="color: #000; margin: 0 0 20px; font-size: 32px; font-weight: normal; border-bottom: 3px solid #a2a9b1; padding-bottom: 5px;">
          Blockchain Technology
        </h1>
        
        <div style="background: #f8f9fa; border: 1px solid #a2a9b1; border-radius: 3px; padding: 15px; margin: 0 0 20px; float: right; width: 300px; margin-left: 20px;">
          <div style="background: #c8ccd1; height: 200px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; color: #666;">
            📊 Blockchain Diagram
          </div>
          <div style="font-size: 14px; line-height: 1.5;">
            <p style="margin: 0 0 10px;"><strong>Type:</strong> Distributed ledger technology</p>
            <p style="margin: 0 0 10px;"><strong>Invented:</strong> 2008</p>
            <p style="margin: 0;"><strong>Creator:</strong> Satoshi Nakamoto</p>
          </div>
        </div>
        
        <p style="color: #000; line-height: 1.6; margin: 0 0 15px; font-size: 16px;">
          A <strong>blockchain</strong> is a growing list of records, called blocks, that are linked and secured using cryptography. Each block contains a cryptographic hash of the previous block, a timestamp, and transaction data.
        </p>
        
        <p style="color: #000; line-height: 1.6; margin: 0 0 15px; font-size: 16px;">
          By design, a blockchain is resistant to modification of its data. This is because once recorded, the data in any given block cannot be altered retroactively without alteration of all subsequent blocks.
        </p>
        
        <h2 style="color: #000; margin: 30px 0 15px; font-size: 24px; font-weight: normal; border-bottom: 1px solid #a2a9b1; padding-bottom: 3px;">
          Key Features
        </h2>
        
        <ul style="color: #000; line-height: 1.6; margin: 0 0 15px; padding-left: 30px;">
          <li style="margin-bottom: 8px;"><strong>Decentralization:</strong> No central authority controls the network</li>
          <li style="margin-bottom: 8px;"><strong>Immutability:</strong> Once data is recorded, it cannot be easily changed</li>
          <li style="margin-bottom: 8px;"><strong>Transparency:</strong> All transactions are visible to network participants</li>
          <li style="margin-bottom: 8px;"><strong>Security:</strong> Cryptographic hashing protects data integrity</li>
        </ul>
        
        <h2 style="color: #000; margin: 30px 0 15px; font-size: 24px; font-weight: normal; border-bottom: 1px solid #a2a9b1; padding-bottom: 3px;">
          Applications
        </h2>
        
        <p style="color: #000; line-height: 1.6; margin: 0 0 15px; font-size: 16px;">
          Blockchain technology has found applications in various fields including cryptocurrency, supply chain management, digital identity verification, smart contracts, and decentralized finance (DeFi).
        </p>
        
        <div style="margin-top: 40px; padding: 15px; background: #f6f6f6; border-left: 4px solid #36c; color: #000;">
          <p style="margin: 0; font-size: 14px;"><strong>Note:</strong> This article is being viewed through PrivaChain's secure proxy network.</p>
        </div>
      </div>
    </div>
  `
}

function generateGenericPage(url: string): string {
  const domain = new URL(url).hostname
  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
          ${domain.charAt(0).toUpperCase()}
        </div>
        <h1 style="color: #1a1a1a; margin: 0 0 10px; font-size: 32px; font-weight: 700;">${domain}</h1>
        <p style="color: #666; margin: 0; font-size: 16px;">Successfully loaded via PrivaChain proxy</p>
      </div>
      
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
        <h2 style="color: #1a1a1a; margin: 0 0 15px; font-size: 24px; font-weight: 600;">Welcome to ${domain}</h2>
        <p style="color: #666; margin: 0 0 20px; line-height: 1.6;">
          This website has been successfully loaded through PrivaChain's secure proxy network. 
          Your connection is encrypted and your identity remains anonymous.
        </p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500;">🔒 Encrypted</span>
          <span style="background: #6366f1; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500;">🌐 Proxied</span>
          <span style="background: #8b5cf6; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500;">👤 Anonymous</span>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
        <div style="background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px;">
          <h3 style="color: #1a1a1a; margin: 0 0 10px; font-size: 16px; font-weight: 600;">🚀 Fast Loading</h3>
          <p style="color: #666; margin: 0; font-size: 14px;">Optimized proxy infrastructure ensures fast page loads.</p>
        </div>
        <div style="background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px;">
          <h3 style="color: #1a1a1a; margin: 0 0 10px; font-size: 16px; font-weight: 600;">🛡️ Secure</h3>
          <p style="color: #666; margin: 0; font-size: 14px;">All traffic encrypted with military-grade security.</p>
        </div>
        <div style="background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px;">
          <h3 style="color: #1a1a1a; margin: 0 0 10px; font-size: 16px; font-weight: 600;">🌍 Global</h3>
          <p style="color: #666; margin: 0; font-size: 14px;">Access content from anywhere in the world.</p>
        </div>
      </div>
      
      <div style="margin-top: 40px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; text-align: center; color: white;">
        <p style="margin: 0; font-size: 14px; opacity: 0.9;">
          Protected by PrivaChain • Your privacy is our priority
        </p>
      </div>
    </div>
  `
}

function generateErrorPage(url: string, error: string): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 60px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; text-align: center;">
      <div style="width: 80px; height: 80px; background: #fee2e2; border-radius: 16px; margin: 0 auto 30px; display: flex; align-items: center; justify-content: center;">
        <span style="color: #dc2626; font-size: 32px;">⚠️</span>
      </div>
      <h1 style="color: #1a1a1a; margin: 0 0 10px; font-size: 24px; font-weight: 600;">Page Could Not Be Loaded</h1>
      <p style="color: #666; margin: 0 0 20px;">There was an error loading: ${url}</p>
      <p style="color: #dc2626; margin: 0 0 30px; font-size: 14px; background: #fee2e2; padding: 10px; border-radius: 6px;">${error}</p>
      <button style="background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Try Again</button>
    </div>
  `
}

function extractTitle(content: string): string | null {
  const match = content.match(/<h1[^>]*>([^<]+)<\/h1>/)
  return match ? match[1] : null
}