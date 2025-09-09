import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Target, LayoutDashboard, Home } from 'lucide-react'
import ModeToggle from '@/components/mode-toggle'

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <header className='header sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => navigate('/')}
          >
            <img 
              src="/logo.png" 
              alt="Block Party Logo" 
              className="h-8 w-8 object-contain"
            />
            <span className="font-bold text-xl text-primary">
              Block Party
            </span>
          </div>

          {/* Navigation - Only show when signed in */}
          <SignedIn>
            <nav className="hidden md:flex items-center space-x-1">
              <Button
                variant={isActive('/') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
              <Button
                variant={isActive('/dashboard') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
              <Button
                variant={isActive('/bounties') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/bounties')}
                className="gap-2"
              >
                <Target className="w-4 h-4" />
                Bounties
              </Button>
            </nav>
          </SignedIn>

          {/* Right side - Auth + Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ModeToggle />
            
            {/* Auth Section */}
            <div className="auth flex items-center gap-2">
              <SignedOut>
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <Button variant="default" size="sm" className="gap-2">
                    <img 
                      src="/logo.png" 
                      alt="GitHub" 
                      className="w-4 h-4"
                    />
                    Sign In
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9",
                      userButtonPopoverCard: "shadow-lg border",
                      userButtonPopoverActionButton: "hover:bg-muted"
                    }
                  }}
                  userProfileMode="modal"
                  afterSignOutUrl="/"
                />
              </SignedIn>
            </div>
          </div>
        </div>

        {/* Mobile Navigation - Only show when signed in */}
        <SignedIn>
          <nav className="md:hidden border-t py-2">
            <div className="flex justify-around">
              <Button
                variant={isActive('/') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2 flex-1 max-w-32"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
              <Button
                variant={isActive('/dashboard') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2 flex-1 max-w-32"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
              <Button
                variant={isActive('/bounties') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/bounties')}
                className="gap-2 flex-1 max-w-32"
              >
                <Target className="w-4 h-4" />
                Bounties
              </Button>
            </div>
          </nav>
        </SignedIn>
      </div>
    </header>
  )
}

export default Header
