import { SignInButton } from '@clerk/clerk-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import ModeToggle from '@/components/mode-toggle'
import { Github, Webhook, Zap, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="h-6 w-6" />
              <span className="font-bold text-lg">Webhook Manager</span>
            </div>
            <ModeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
            GitHub Webhook Manager
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Easily manage webhooks for your GitHub repositories. 
            Connect, configure, and monitor all your webhooks in one place.
          </p>
          
          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            <Button size="lg" className="gap-2">
              <Github className="w-5 h-5" />
              Sign in with GitHub
            </Button>
          </SignInButton>
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
              <Webhook className="w-12 h-12 mx-auto mb-4 text-primary" />
              <CardTitle>Easy Webhook Setup</CardTitle>
              <CardDescription>
                Create and manage webhooks for your repositories with just a few clicks
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
              <CardTitle>Secure & Reliable</CardTitle>
              <CardDescription>
                Built with security in mind using modern authentication and best practices
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  )
}
