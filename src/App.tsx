import { useState, useEffect } from 'react'
import './lib/kvStorage' // Initialize KV storage early
import { VideoCallProvider } from './components/VideoCallProvider'
import { AppStateProvider } from './lib/app_state'
import { Sidebar } from './components/Sidebar'
import { MessengerView } from './components/MessengerView'
import { EmailView } from './components/EmailView'
import { SearchView } from './components/SearchView'
import { ProfileView } from './components/ProfileView'
import { DeploymentView } from './components/DeploymentView'
import { BrowserView } from './components/BrowserView'
import ProductReadinessDashboard from './components/ProductReadinessDashboard'
import { Toaster } from './components/ui/sonner'
import { usePlanSystem } from './hooks/usePlanSystem'
import { toast } from 'sonner'
import proxyVPN from './services/proxyVPN'

export type View = 'messenger' | 'email' | 'search' | 'profile' | 'deployment' | 'browser' | 'readiness'

function App() {
  const [currentView, setCurrentView] = useState<View>('messenger')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [browserUrl, setBrowserUrl] = useState<string>('')
  
  // Initialize plan system on app start
  const { planStatus, loading: planLoading, error: planError } = usePlanSystem()

  // Initialize DPI bypass killswitch on app start
  useEffect(() => {
    proxyVPN.enableKillSwitch()
    return () => proxyVPN.disableKillSwitch()
  }, [])

  // Show welcome message when plan is loaded
  useEffect(() => {
    if (planStatus && !planLoading) {
      const planName = planStatus.planType === 'premium' ? 'Premium' : 'Starter'
      toast.success(`Welcome to PrivaChain! ${planName} plan active.`, {
        duration: 3000,
        description: 'All gas fees are sponsored by the developer using ATOM.'
      })
    }
  }, [planStatus, planLoading])

  // Show error if plan initialization fails
  useEffect(() => {
    if (planError) {
      toast.error('Plan system initialization failed', {
        description: planError,
        duration: 5000
      })
    }
  }, [planError])

  const navigateToBrowser = (url: string) => {
    setBrowserUrl(url)
    setCurrentView('browser')
  }

  const renderView = () => {
    switch (currentView) {
      case 'messenger':
        return <MessengerView />
      case 'email':
        return <EmailView />
      case 'search':
        return <SearchView onNavigateToBrowser={navigateToBrowser} />
      case 'browser':
        return <BrowserView initialUrl={browserUrl} />
      case 'profile':
        return <ProfileView />
      case 'deployment':
        return <DeploymentView />
      case 'readiness':
        return <ProductReadinessDashboard />
      default:
        return <MessengerView />
    }
  }

  return (
    <AppStateProvider>
      <VideoCallProvider>
        <div className="h-screen bg-background text-foreground flex overflow-hidden">
          {planLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <div>
                  <h3 className="text-lg font-semibold">Initializing PrivaChain</h3>
                  <p className="text-muted-foreground">Setting up your plan and developer-sponsored gas...</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Sidebar 
                currentView={currentView}
                onViewChange={setCurrentView}
                open={sidebarOpen}
                onOpenChange={setSidebarOpen}
              />
              
              <main className="flex-1 flex flex-col min-w-0">
                {renderView()}
              </main>
            </>
          )}
          
          <Toaster />
        </div>
      </VideoCallProvider>
    </AppStateProvider>
  )
}

export default App