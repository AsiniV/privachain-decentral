import { useState, useEffect } from 'react'
import { useKV } from '../hooks/useKV'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { Progress } from './ui/progress'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import {
  Shield,
  ShieldWarning,
  Warning,
  Info,
  CheckCircle,
  X,
  Download,
  Upload,
  Gear,
  Eye,
  EyeSlash,
  Lock,
  LockOpen,
  Globe,
  User,
  Fingerprint,
  Lightning,
  Question
} from '@phosphor-icons/react'

interface Extension {
  id: string
  name: string
  version: string
  enabled: boolean
  permissions: string[]
  privacyRisk: 'low' | 'medium' | 'high' | 'critical'
  description: string
  developer: string
  category: ExtensionCategory
  installDate: number
  size: number
  updateAvailable: boolean
  webStoreUrl?: string
}

type ExtensionCategory = 
  | 'productivity' 
  | 'privacy' 
  | 'security' 
  | 'developer' 
  | 'entertainment' 
  | 'shopping' 
  | 'social'
  | 'ad-blocker'
  | 'password-manager'

interface PrivacyAnalysis {
  dataAccess: string[]
  networkRequests: string[]
  storageUsage: string[]
  permissionRisks: string[]
  anonymityImpact: 'none' | 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
}

export function ExtensionManager() {
  const [extensions, setExtensions] = useKV<Extension[]>('installed-extensions', [])
  const [showPrivacyWarnings, setShowPrivacyWarnings] = useKV('show-extension-privacy-warnings', true)
  const [extensionPermissions, setExtensionPermissions] = useKV('extension-permissions-granted', {})
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null)
  const [privacyAnalysis, setPrivacyAnalysis] = useState<PrivacyAnalysis | null>(null)
  const [installProgress, setInstallProgress] = useState(0)
  const [isInstalling, setIsInstalling] = useState(false)

  // Mock extensions data for demonstration
  const mockExtensions: Extension[] = [
    {
      id: 'ublock-origin',
      name: 'uBlock Origin',
      version: '1.54.0',
      enabled: true,
      permissions: ['activeTab', 'storage', 'webRequest'],
      privacyRisk: 'low',
      description: 'Efficient wide-spectrum content blocker',
      developer: 'Raymond Hill',
      category: 'ad-blocker',
      installDate: Date.now() - 86400000,
      size: 3.2,
      updateAvailable: false
    },
    {
      id: 'metamask',
      name: 'MetaMask',
      version: '11.5.0',
      enabled: true,
      permissions: ['activeTab', 'storage', 'background', 'webRequest', 'tabs'],
      privacyRisk: 'medium',
      description: 'Ethereum Wallet & Web3 Gateway',
      developer: 'ConsenSys',
      category: 'developer',
      installDate: Date.now() - 172800000,
      size: 15.8,
      updateAvailable: true,
      webStoreUrl: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn'
    },
    {
      id: 'privacy-badger',
      name: 'Privacy Badger',
      version: '2023.10.17',
      enabled: true,
      permissions: ['activeTab', 'storage', 'webRequest', 'tabs'],
      privacyRisk: 'low',
      description: 'Automatically learns to block invisible trackers',
      developer: 'Electronic Frontier Foundation',
      category: 'privacy',
      installDate: Date.now() - 259200000,
      size: 2.1,
      updateAvailable: false
    },
    {
      id: 'dark-reader',
      name: 'Dark Reader',
      version: '4.9.63',
      enabled: false,
      permissions: ['activeTab', 'storage'],
      privacyRisk: 'low',
      description: 'Dark mode for every website',
      developer: 'Alexander Shutau',
      category: 'productivity',
      installDate: Date.now() - 345600000,
      size: 1.5,
      updateAvailable: false
    },
    {
      id: 'lastpass',
      name: 'LastPass',
      version: '4.124.0',
      enabled: true,
      permissions: ['activeTab', 'storage', 'background', 'webRequest', 'tabs', 'identity'],
      privacyRisk: 'high',
      description: 'Password Manager',
      developer: 'LastPass',
      category: 'password-manager',
      installDate: Date.now() - 432000000,
      size: 8.7,
      updateAvailable: false
    }
  ]

  useEffect(() => {
    if (extensions.length === 0) {
      setExtensions(mockExtensions)
    }
  }, [extensions.length, setExtensions])

  const analyzeExtensionPrivacy = (extension: Extension): PrivacyAnalysis => {
    const analysis: PrivacyAnalysis = {
      dataAccess: [],
      networkRequests: [],
      storageUsage: [],
      permissionRisks: [],
      anonymityImpact: 'none',
      recommendations: []
    }

    // Analyze permissions
    extension.permissions.forEach(permission => {
      switch (permission) {
        case 'activeTab':
          analysis.dataAccess.push('Current tab content and URL')
          break
        case 'tabs':
          analysis.dataAccess.push('All open tabs and browsing history')
          analysis.anonymityImpact = 'medium'
          analysis.permissionRisks.push('Can track your browsing patterns')
          break
        case 'webRequest':
          analysis.networkRequests.push('Monitor all network requests')
          analysis.anonymityImpact = 'high'
          analysis.permissionRisks.push('Can see all websites you visit')
          break
        case 'storage':
          analysis.storageUsage.push('Local storage access')
          break
        case 'background':
          analysis.networkRequests.push('Runs continuously in background')
          analysis.permissionRisks.push('Always active, even when not browsing')
          break
        case 'identity':
          analysis.dataAccess.push('Google account information')
          analysis.anonymityImpact = 'critical'
          analysis.permissionRisks.push('Can access your identity information')
          break
      }
    })

    // Generate recommendations based on privacy risk
    switch (extension.privacyRisk) {
      case 'critical':
        analysis.recommendations.push('⚠️ Consider disabling this extension for anonymous browsing')
        analysis.recommendations.push('🔒 Review permissions carefully before using')
        analysis.recommendations.push('🚫 May compromise your anonymity completely')
        break
      case 'high':
        analysis.recommendations.push('⚠️ Use with caution during private browsing')
        analysis.recommendations.push('🔍 Monitor extension activity regularly')
        analysis.recommendations.push('⚙️ Consider disabling for sensitive activities')
        break
      case 'medium':
        analysis.recommendations.push('ℹ️ Review permissions periodically')
        analysis.recommendations.push('🔒 Ensure extension is from trusted developer')
        break
      case 'low':
        analysis.recommendations.push('✅ Generally safe for privacy-focused browsing')
        break
    }

    return analysis
  }

  const getPrivacyRiskColor = (risk: Extension['privacyRisk']) => {
    switch (risk) {
      case 'low': return 'text-green-500'
      case 'medium': return 'text-yellow-500'
      case 'high': return 'text-orange-500'
      case 'critical': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getPrivacyRiskIcon = (risk: Extension['privacyRisk']) => {
    switch (risk) {
      case 'low': return CheckCircle
      case 'medium': return Info
      case 'high': return Warning
      case 'critical': return ShieldWarning
      default: return Question
    }
  }

  const getCategoryIcon = (category: ExtensionCategory) => {
    switch (category) {
      case 'ad-blocker': return Shield
      case 'privacy': return EyeSlash
      case 'security': return Lock
      case 'password-manager': return Fingerprint
      case 'developer': return Gear
      case 'productivity': return Lightning
      default: return Globe
    }
  }

  const toggleExtension = (extensionId: string) => {
    setExtensions(prev => prev.map(ext => 
      ext.id === extensionId 
        ? { ...ext, enabled: !ext.enabled }
        : ext
    ))

    const extension = extensions.find(ext => ext.id === extensionId)
    if (extension) {
      if (extension.enabled) {
        toast.success(`${extension.name} disabled`)
      } else {
        // Show privacy warning for high-risk extensions
        if (extension.privacyRisk === 'high' || extension.privacyRisk === 'critical') {
          toast.warning(`${extension.name} enabled - Privacy risk: ${extension.privacyRisk}`, {
            description: 'This extension may impact your anonymity'
          })
        } else {
          toast.success(`${extension.name} enabled`)
        }
      }
    }
  }

  const removeExtension = (extensionId: string) => {
    setExtensions(prev => prev.filter(ext => ext.id !== extensionId))
    const extension = extensions.find(ext => ext.id === extensionId)
    if (extension) {
      toast.success(`${extension.name} removed`)
    }
  }

  const installExtension = async (extensionFile: File) => {
    setIsInstalling(true)
    setInstallProgress(0)

    try {
      // Simulate installation process
      const progressInterval = setInterval(() => {
        setInstallProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return 100
          }
          return prev + Math.random() * 15
        })
      }, 100)

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock extension data from file
      const newExtension: Extension = {
        id: `ext-${Date.now()}`,
        name: extensionFile.name.replace('.crx', '').replace('.zip', ''),
        version: '1.0.0',
        enabled: false,
        permissions: ['activeTab', 'storage'],
        privacyRisk: 'medium',
        description: 'User installed extension',
        developer: 'Unknown',
        category: 'productivity',
        installDate: Date.now(),
        size: extensionFile.size / (1024 * 1024),
        updateAvailable: false
      }

      clearInterval(progressInterval)
      setInstallProgress(100)

      setExtensions(prev => [...prev, newExtension])
      
      toast.success(`${newExtension.name} installed successfully`, {
        description: 'Review permissions before enabling'
      })

    } catch (error) {
      toast.error('Failed to install extension', {
        description: 'Please check the extension file and try again'
      })
    } finally {
      setIsInstalling(false)
      setTimeout(() => setInstallProgress(0), 1000)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.crx') || file.name.endsWith('.zip')) {
        installExtension(file)
      } else {
        toast.error('Invalid file type', {
          description: 'Please select a .crx or .zip extension file'
        })
      }
    }
  }

  const highRiskExtensions = extensions.filter(ext => ext.enabled && (ext.privacyRisk === 'high' || ext.privacyRisk === 'critical'))

  return (
    <div className="h-full flex flex-col">
      {/* Privacy Warning Banner */}
      {showPrivacyWarnings && highRiskExtensions.length > 0 && (
        <Alert className="m-4 border-orange-200 bg-orange-50">
          <ShieldWarning className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Privacy Warning:</strong> {highRiskExtensions.length} enabled extension(s) may compromise your anonymity.
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPrivacyWarnings(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Extension Manager</h2>
            <p className="text-muted-foreground">Manage Chrome OS compatible browser extensions</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".crx,.zip"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="extension-upload"
            />
            <Button 
              variant="outline" 
              onClick={() => document.getElementById('extension-upload')?.click()}
              disabled={isInstalling}
            >
              <Upload className="w-4 h-4 mr-2" />
              Install Extension
            </Button>
          </div>
        </div>

        {isInstalling && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Installing extension...</span>
              <span className="text-sm">{Math.round(installProgress)}%</span>
            </div>
            <Progress value={installProgress} className="h-2" />
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4" />
            <span>{extensions.filter(ext => ext.enabled).length} enabled</span>
          </div>
          <div className="flex items-center gap-1">
            <Warning className="w-4 h-4" />
            <span>{highRiskExtensions.length} high risk</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            <span>{extensions.filter(ext => ext.updateAvailable).length} updates</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <Tabs defaultValue="installed" className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="installed">Installed ({extensions.length})</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Analysis</TabsTrigger>
            <TabsTrigger value="store">Extension Store</TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="mt-6">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-4">
                {extensions.map(extension => {
                  const PrivacyIcon = getPrivacyRiskIcon(extension.privacyRisk)
                  const CategoryIcon = getCategoryIcon(extension.category)
                  
                  return (
                    <Card key={extension.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center",
                            extension.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            <CategoryIcon className="w-6 h-6" />
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{extension.name}</h3>
                              <Badge variant="outline">{extension.version}</Badge>
                              {extension.updateAvailable && (
                                <Badge variant="secondary">Update Available</Badge>
                              )}
                              <div className="flex items-center gap-1">
                                <PrivacyIcon className={cn("w-4 h-4", getPrivacyRiskColor(extension.privacyRisk))} />
                                <span className={cn("text-xs font-medium", getPrivacyRiskColor(extension.privacyRisk))}>
                                  {extension.privacyRisk.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {extension.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>By {extension.developer}</span>
                              <span>{extension.size.toFixed(1)} MB</span>
                              <span>{extension.permissions.length} permissions</span>
                              <span>Installed {new Date(extension.installDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedExtension(extension)
                              setPrivacyAnalysis(analyzeExtensionPrivacy(extension))
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={extension.enabled ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleExtension(extension.id)}
                          >
                            {extension.enabled ? (
                              <>
                                <LockOpen className="w-4 h-4 mr-1" />
                                Enabled
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 mr-1" />
                                Disabled
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExtension(extension.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            {selectedExtension && privacyAnalysis ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    {getCategoryIcon(selectedExtension.category)({ className: "w-6 h-6 text-primary" })}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedExtension.name}</h3>
                    <p className="text-muted-foreground">Privacy Analysis</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Data Access
                    </h4>
                    <div className="space-y-2">
                      {privacyAnalysis.dataAccess.length > 0 ? (
                        privacyAnalysis.dataAccess.map((access, index) => (
                          <div key={index} className="text-sm bg-muted p-2 rounded">
                            {access}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No data access detected</p>
                      )}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Network Requests
                    </h4>
                    <div className="space-y-2">
                      {privacyAnalysis.networkRequests.length > 0 ? (
                        privacyAnalysis.networkRequests.map((request, index) => (
                          <div key={index} className="text-sm bg-muted p-2 rounded">
                            {request}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No network access detected</p>
                      )}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Warning className="w-4 h-4" />
                      Permission Risks
                    </h4>
                    <div className="space-y-2">
                      {privacyAnalysis.permissionRisks.length > 0 ? (
                        privacyAnalysis.permissionRisks.map((risk, index) => (
                          <div key={index} className="text-sm bg-yellow-50 border border-yellow-200 p-2 rounded">
                            {risk}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No significant risks detected</p>
                      )}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Recommendations
                    </h4>
                    <div className="space-y-2">
                      {privacyAnalysis.recommendations.map((rec, index) => (
                        <div key={index} className="text-sm bg-blue-50 border border-blue-200 p-2 rounded">
                          {rec}
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Extension Selected</h3>
                <p className="text-muted-foreground">Select an extension from the Installed tab to view privacy analysis</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="store" className="mt-6">
            <div className="text-center py-12">
              <Download className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Extension Store</h3>
              <p className="text-muted-foreground mb-4">
                Browse and install Chrome OS compatible extensions from trusted sources
              </p>
              <Button variant="outline">
                Open Chrome Web Store
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}