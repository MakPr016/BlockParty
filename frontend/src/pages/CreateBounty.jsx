import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { 
  Github, 
  Webhook, 
  DollarSign, 
  ListTodo, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Wallet,
  ExternalLink
} from 'lucide-react'

export default function CreateBounty() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const repoFullName = searchParams.get('repo')
  const owner = searchParams.get('owner')
  const repoName = searchParams.get('repoName')
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [webhookCreated, setWebhookCreated] = useState(false)
  const [walletInfo, setWalletInfo] = useState(null)
  
  const [bountyData, setBountyData] = useState({
    title: '',
    description: '',
    amount: '',
    requirements: ['']
  })

  useEffect(() => {
    fetchWalletInfo()
  }, [])

  const fetchWalletInfo = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/wallet/balance`)
      if (response.ok) {
        const data = await response.json()
        setWalletInfo(data)
      }
    } catch (error) {
      console.error('Error fetching wallet info:', error)
    }
  }

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
      toast.success('Webhook Created Successfully!', {
        description: data.isExisting ? 'Using existing webhook for this repository' : 'New webhook has been created'
      })
      
      setSuccess('Webhook created successfully!')
      setWebhookCreated(true)
      setTimeout(() => setStep(2), 1500)
      
    } catch (err) {
      setError(err.message)
      toast.error('Webhook Creation Failed', {
        description: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const addRequirement = () => {
    setBountyData(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }))
  }

  const removeRequirement = (index) => {
    setBountyData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }))
  }

  const updateRequirement = (index, value) => {
    setBountyData(prev => ({
      ...prev,
      requirements: prev.requirements.map((req, i) => i === index ? value : req)
    }))
  }

  const saveBounty = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      
      const amount = parseFloat(bountyData.amount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid bounty amount')
      }

      if (amount < 0.001) {
        throw new Error('Minimum bounty amount is 0.001 ETH')
      }

      if (amount > 1) {
        throw new Error('Maximum bounty amount is 1 ETH for testing')
      }

      if (walletInfo && parseFloat(walletInfo.balance) < amount) {
        toast.error('Insufficient Balance', {
          description: `Your wallet has ${walletInfo.balance} ETH, but bounty requires ${amount} ETH`
        })
        throw new Error('Insufficient wallet balance')
      }
      
      const bountyPayload = {
        title: bountyData.title,
        description: bountyData.description,
        amount: amount,
        repositoryFullName: repoFullName,
        requirements: bountyData.requirements.filter(req => req.trim() !== '')
      }
      
      console.log('Creating bounty with payload:', bountyPayload)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bounties`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bountyPayload)
      })

      const responseData = await response.json()

      if (!response.ok) {
        if (responseData.bountyId && responseData.error.includes('escrow')) {
          toast.error('Escrow Setup Failed', {
            description: 'Bounty was created but setup failed. Please contact support.',
            action: {
              label: 'View Bounty',
              onClick: () => navigate(`/bounties/${responseData.bountyId}`)
            }
          })
        }
        throw new Error(responseData.error || 'Failed to create bounty')
      }

      toast.success('Bounty Created Successfully!', {
        description: `${amount} ETH bounty created and ready for contributors`,
        action: {
          label: 'View Bounty',
          onClick: () => navigate(`/bounties/${responseData.bountyId}`)
        }
      })
      
      setSuccess(`Bounty created successfully! ${amount} ETH reward ready.`)
      
      await fetchWalletInfo()
      
      setTimeout(() => {
        navigate('/bounties')
      }, 3000)
      
    } catch (err) {
      setError(err.message)
      toast.error('Bounty Creation Failed', {
        description: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
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

          {walletInfo && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Wallet Balance</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{parseFloat(walletInfo.balance).toFixed(4)} ETH</p>
                    <p className="text-xs text-muted-foreground">Sepolia Testnet</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Wallet: {walletInfo.walletAddress}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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

          {step === 1 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Webhook className="w-5 h-5" />
                  <CardTitle>Setup Repository Webhook</CardTitle>
                </div>
                <CardDescription>
                  Create a webhook to monitor repository events for automatic ETH payments
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
                    <li>Pull request merges (triggers automatic ETH payment)</li>
                    <li>Push events (new commits)</li>
                    <li>Issue events and comments</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> When a pull request is merged, the bounty amount will be automatically 
                    transferred in ETH to the contributor's wallet address.
                  </p>
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

          {step === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  <CardTitle>Bounty Configuration</CardTitle>
                </div>
                <CardDescription>
                  Configure bounty details and ETH reward amount
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Bounty Amount (ETH)
                    </Label>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.01"
                        min="0.001"
                        max="1"
                        step="0.001"
                        value={bountyData.amount}
                        onChange={(e) => setBountyData(prev => ({...prev, amount: e.target.value}))}
                        className="pr-16"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-sm text-muted-foreground font-mono">ETH</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This ETH amount will be sent directly to the contributor when PR is merged (Min: 0.001 ETH, Max: 1 ETH)
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <ListTodo className="w-4 h-4" />
                      Requirements
                    </Label>
                    <Button variant="outline" size="sm" onClick={addRequirement}>
                      Add Requirement
                    </Button>
                  </div>
                  
                  {bountyData.requirements.map((requirement, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Requirement ${index + 1}`}
                        value={requirement}
                        onChange={(e) => updateRequirement(index, e.target.value)}
                      />
                      {bountyData.requirements.length > 1 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeRequirement(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-green-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    ETH Payment System
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• {bountyData.amount || '0'} ETH will be sent directly to contributor</p>
                    <p>• Payment is automatic when PR is successfully merged</p>
                    <p>• No smart contract complexity - simple ETH transfer</p>
                    <p>• All transactions recorded on Sepolia testnet</p>
                  </div>
                  {walletInfo && (
                    <div className="pt-2 border-t border-green-300">
                      <p className="text-xs text-green-600">
                        Payment Wallet: {walletInfo.walletAddress}
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-auto p-0 ml-1 text-green-600"
                          onClick={() => window.open(`https://sepolia.etherscan.io/address/${walletInfo.walletAddress}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </p>
                    </div>
                  )}
                </div>

                {walletInfo && parseFloat(bountyData.amount || 0) > parseFloat(walletInfo.balance) && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Warning:</strong> Insufficient balance. You have {parseFloat(walletInfo.balance).toFixed(4)} ETH 
                      but need {bountyData.amount || '0'} ETH for this bounty.
                    </p>
                  </div>
                )}

                <Button 
                  onClick={saveBounty} 
                  disabled={loading || !bountyData.title || !bountyData.description || !bountyData.amount || 
                    (walletInfo && parseFloat(bountyData.amount || 0) > parseFloat(walletInfo.balance))}
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
                      Create Bounty ({bountyData.amount || '0'} ETH)
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By creating this bounty, you commit to paying {bountyData.amount || '0'} ETH 
                  when a pull request is successfully merged.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
