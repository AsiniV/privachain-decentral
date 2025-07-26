import { 
  ChatCircle, 
  Envelope, 
  MagnifyingGlass, 
  User, 
  Shield,
  Plus,
  List,
  X,
  Rocket,
  Globe
} from '@phosphor-icons/react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'
import { useKV } from '../hooks/useKV'
import { useIsMobile } from '../hooks/use-mobile'

interface SidebarProps {
  currentView: string
  onViewChange: (view: 'messenger' | 'email' | 'search' | 'browser' | 'profile' | 'deployment') => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ currentView, onViewChange, open, onOpenChange }: SidebarProps) {
  const isMobile = useIsMobile()
  const [unreadMessages] = useKV('unread-messages', 0)
  const [unreadEmails] = useKV('unread-emails', 0)

  const menuItems = [
    {
      id: 'messenger',
      label: 'Messenger',
      icon: ChatCircle,
      badge: unreadMessages > 0 ? unreadMessages : null
    },
    {
      id: 'email',
      label: 'Email',
      icon: Envelope,
      badge: unreadEmails > 0 ? unreadEmails : null
    },
    {
      id: 'search',
      label: 'Search',
      icon: MagnifyingGlass,
      badge: null
    },
    {
      id: 'browser',
      label: 'Browser',
      icon: Globe,
      badge: null
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      badge: null
    },
    {
      id: 'deployment',
      label: 'Deploy',
      icon: Rocket,
      badge: null
    }
  ]

  const sidebarContent = (
    <div className="h-full bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-accent-foreground" weight="bold" />
          </div>
          <div>
            <h1 className="text-lg font-bold">PrivaChain</h1>
            <p className="text-sm text-muted-foreground">Secure Communications</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={currentView === item.id ? 'secondary' : 'ghost'}
            className={cn(
              "w-full justify-start gap-3 h-12",
              currentView === item.id && "bg-accent text-accent-foreground"
            )}
            onClick={() => {
              onViewChange(item.id as 'messenger' | 'email' | 'search' | 'browser' | 'profile' | 'deployment')
              if (isMobile) onOpenChange(false)
            }}
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <Badge variant="destructive" className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </Button>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full gap-2">
          <Plus className="w-4 h-4" />
          New Conversation
        </Button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden"
          onClick={() => onOpenChange(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
        </Button>
        
        {open && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
            <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw]">
              {sidebarContent}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="w-80 hidden md:block">
      {sidebarContent}
    </div>
  )
}