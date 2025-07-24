import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { VideoCallProvider } from './components/VideoCallProvider'
import { Sidebar } from './components/Sidebar'
import { MessengerView } from './components/MessengerView'
import { EmailView } from './components/EmailView'
import { SearchView } from './components/SearchView'
import { ProfileView } from './components/ProfileView'
import { Toaster } from './components/ui/sonner'

export type View = 'messenger' | 'email' | 'search' | 'profile'

function App() {
  const [currentView, setCurrentView] = useKV<View>('current-view', 'messenger')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const renderView = () => {
    switch (currentView) {
      case 'messenger':
        return <MessengerView />
      case 'email':
        return <EmailView />
      case 'search':
        return <SearchView />
      case 'profile':
        return <ProfileView />
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