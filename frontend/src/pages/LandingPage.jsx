import { SignInButton, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import ModeToggle from '@/components/mode-toggle'
import { Github, Webhook, Zap, Shield, Target, LayoutDashboard } from 'lucide-react'

export default function LandingPage() {
  const { isSignedIn, user } = useUser()
  const navigate = useNavigate()

  // If user is signed in, redirect them or show signed-in state
  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
              Welcome back, {user.firstName || 'there'}!
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Ready to manage your GitHub webhooks and bounties? 
              Choose where you'd like to go.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="gap-2"
                onClick={() => navigate('/dashboard')}
              >
                <LayoutDashboard className="w-5 h-5" />
                Go to Dashboard
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2"
                onClick={() => navigate('/bounties')}
              >
                <Target className="w-5 h-5" />
                View Bounties
              </Button>
            </div>
          </div>

          {/* Quick Stats or Recent Activity */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/dashboard')}>
              <CardHeader className="text-center">
                <LayoutDashboard className="w-12 h-12 mx-auto mb-4 text-primary" />
                <CardTitle>Dashboard</CardTitle>
                <CardDescription>
                  Manage your repositories and create webhooks
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/bounties')}>
              <CardHeader className="text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-primary" />
                <CardTitle>Bounties</CardTitle>
                <CardDescription>
                  Browse and apply for development bounties
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Webhook className="w-12 h-12 mx-auto mb-4 text-primary" />
                <CardTitle>Your Webhooks</CardTitle>
                <CardDescription>
                  Monitor and manage your active webhooks
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Show landing page for non-signed-in users
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
            GitHub Bounty Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create bounties for your GitHub repositories and manage webhooks. 
            Connect developers with projects and get work done efficiently.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <Button size="lg" className="gap-2">
                <Github className="w-5 h-5" />
                Sign in with GitHub
              </Button>
            </SignInButton>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2"
              onClick={() => navigate('/bounties')}
            >
              <Target className="w-5 h-5" />
              Browse Bounties
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Github className="w-12 h-12 mx-auto mb-4 text-primary" />
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>
                Seamlessly connect with your GitHub account and access all your repositories
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-primary" />
              <CardTitle>Bounty System</CardTitle>
              <CardDescription>
                Create bounties for your projects and connect with talented developers
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Webhook className="w-12 h-12 mx-auto mb-4 text-primary" />
              <CardTitle>Webhook Management</CardTitle>
              <CardDescription>
                Automated webhook creation and monitoring for seamless integration
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Additional Info Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-lg font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold">Connect GitHub</h3>
              <p className="text-muted-foreground">
                Sign in with your GitHub account to access your repositories
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-lg font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold">Create Bounties</h3>
              <p className="text-muted-foreground">
                Set up bounties for your projects with tasks, prizes, and deadlines
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-lg font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold">Get Results</h3>
              <p className="text-muted-foreground">
                Developers apply for bounties and complete your project requirements
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
