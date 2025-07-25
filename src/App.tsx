import { useState } from 'react'
import { VideoCallProvider } from './components/VideoCallProvider'
import { Sidebar } from './components/Sidebar'
import { MessengerView } from './components/MessengerView'
import { EmailView } from './components/EmailView'
import { SearchView } from './components/SearchView'
import { ProfileView } from './components/ProfileView'
import { DeploymentView } from './components/DeploymentView'
import { BrowserView } from './components/BrowserView'
import { Toaster } from './components/ui/sonner'

export type View = 'messenger' | 'email' | 'search' | 'profile' | 'deployment' | 'browser'

function App() {
  const [currentView, setCurrentView] = useState<View>('messenger')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [browserUrl, setBrowserUrl] = useState<string>('')

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
      default:
        return <MessengerView />
    }
  }

  return (
    <VideoCallProvider>
      <div className="h-screen bg-background text-foreground flex overflow-hidden">
        <Sidebar 
          currentView={currentView}
          onViewChange={setCurrentView}
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
        />
        
        <main className="flex-1 flex flex-col min-w-0">
          {renderView()}
        </main>
        
        <Toaster />
      </div>
    </VideoCallProvider>
  )
}

export default App