import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Github, 
  Webhook, 
  DollarSign, 
  ListTodo, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

export default function CreateBounty() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  // Get repository info from URL params
  const repoFullName = searchParams.get('repo')
  const owner = searchParams.get('owner')
  const repoName = searchParams.get('repoName')
  
  const [step, setStep] = useState(1) // 1: webhook, 2: bounty details
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [webhookCreated, setWebhookCreated] = useState(false)
  
  // Bounty form data
  const [bountyData, setBountyData] = useState({
    title: '',
    description: '',
    tasks: [''],
    prize: '',
    currency: 'USD',
    deadline: '',
    requirements: ''
  })

  const createWebhook = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/repositories/${owner}/${repoName}/webhook`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create webhook')
      }

      const data = await response.json()
      setSuccess('Webhook created successfully!')
      setWebhookCreated(true)
      setTimeout(() => setStep(2), 1500)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addTask = () => {
    setBountyData(prev => ({
      ...prev,
      tasks: [...prev.tasks, '']
    }))
  }

  const removeTask = (index) => {
    setBountyData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }))
  }

  const updateTask = (index, value) => {
    setBountyData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => i === index ? value : task)
    }))
  }

  const saveBounty = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      
      const bountyPayload = {
        ...bountyData,
        repositoryFullName: repoFullName,
        owner,
        repoName,
        createdBy: user.id,
        status: 'active',
        tasks: bountyData.tasks.filter(task => task.trim() !== '')
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bounties`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bountyPayload)
      })

      if (!response.ok) {
        throw new Error('Failed to create bounty')
      }

      setSuccess('Bounty created successfully!')
      setTimeout(() => {
        navigate('/bounties')
      }, 2000)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create Bounty</h1>
              <p className="text-muted-foreground">
                Set up a bounty for <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{repoFullName}</span>
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                webhookCreated ? 'bg-primary border-primary text-primary-foreground' : 
                step >= 1 ? 'border-primary' : 'border-muted-foreground'
              }`}>
                {webhookCreated ? <CheckCircle className="w-4 h-4" /> : '1'}
              </div>
              <span>Create Webhook</span>
            </div>
            <div className="flex-1 h-px bg-muted"></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                step >= 2 ? 'border-primary' : 'border-muted-foreground'
              }`}>
                2
              </div>
              <span>Bounty Details</span>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Create Webhook */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Webhook className="w-5 h-5" />
                  <CardTitle>Setup Repository Webhook</CardTitle>
                </div>
                <CardDescription>
                  Create a webhook to monitor repository events for your bounty
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Repository Details</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Github className="w-4 h-4" />
                    <span className="font-mono">{repoFullName}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Webhook will monitor:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Push events (new commits)</li>
                    <li>Pull request events</li>
                    <li>Issue events</li>
                    <li>Issue comment events</li>
                  </ul>
                </div>

                <Button 
                  onClick={createWebhook} 
                  disabled={loading || webhookCreated}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Webhook...
                    </>
                  ) : webhookCreated ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Webhook Created
                    </>
                  ) : (
                    <>
                      <Webhook className="w-4 h-4 mr-2" />
                      Create Webhook
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Bounty Details */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  <CardTitle>Bounty Configuration</CardTitle>
                </div>
                <CardDescription>
                  Set up the bounty details, tasks, and prize
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Bounty Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Fix authentication bug"
                      value={bountyData.title}
                      onChange={(e) => setBountyData(prev => ({...prev, title: e.target.value}))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what needs to be done..."
                      value={bountyData.description}
                      onChange={(e) => setBountyData(prev => ({...prev, description: e.target.value}))}
                      rows={4}
                    />
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <ListTodo className="w-4 h-4" />
                      Tasks to Complete
                    </Label>
                    <Button variant="outline" size="sm" onClick={addTask}>
                      Add Task
                    </Button>
                  </div>
                  
                  {bountyData.tasks.map((task, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Task ${index + 1}`}
                        value={task}
                        onChange={(e) => updateTask(index, e.target.value)}
                      />
                      {bountyData.tasks.length > 1 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeTask(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Prize */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prize">Prize Amount</Label>
                    <Input
                      id="prize"
                      type="number"
                      placeholder="100"
                      value={bountyData.prize}
                      onChange={(e) => setBountyData(prev => ({...prev, prize: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={bountyData.currency}
                      onChange={(e) => setBountyData(prev => ({...prev, currency: e.target.value}))}
                    >
                      <option value="USD">USD</option>
                      <option value="ETH">ETH</option>
                      <option value="BTC">BTC</option>
                    </select>
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <Label htmlFor="deadline">Deadline (Optional)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={bountyData.deadline}
                    onChange={(e) => setBountyData(prev => ({...prev, deadline: e.target.value}))}
                  />
                </div>

                {/* Requirements */}
                <div>
                  <Label htmlFor="requirements">Additional Requirements</Label>
                  <Textarea
                    id="requirements"
                    placeholder="Any additional requirements or guidelines..."
                    value={bountyData.requirements}
                    onChange={(e) => setBountyData(prev => ({...prev, requirements: e.target.value}))}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={saveBounty} 
                  disabled={loading || !bountyData.title || !bountyData.description}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Bounty...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Create Bounty
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
