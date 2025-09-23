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
  Coins, 
  ListTodo, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Wallet,
  ExternalLink,
  Plus
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
  const [userGTKBalance, setUserGTKBalance] = useState(null)
  const [approvalStep, setApprovalStep] = useState('') // Track approval progress
  
  const [bountyData, setBountyData] = useState({
    title: '',
    description: '',
    amount: '',
    requirements: ['']
  })

  useEffect(() => {
    fetchWalletInfo()
    fetchUserGTKBalance()
  }, [])

  const fetchWalletInfo = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/health`)
      if (response.ok) {
        const data = await response.json()
        setWalletInfo(data)
      }
    } catch (error) {
      console.error('Error fetching wallet info:', error)
    }
  }

  const fetchUserGTKBalance = async () => {
    try {
      const token = await getToken()
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/gtk-balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUserGTKBalance(data)
      }
    } catch (error) {
      console.error('Error fetching user GTK balance:', error)
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

  // Function to get ERC20 approve transaction data
  const getApproveTransactionData = (spenderAddress, amountWei) => {
    // ERC20 approve function signature: approve(address,uint256)
    const functionSignature = '0x095ea7b3'
    const paddedSpender = spenderAddress.slice(2).padStart(64, '0')
    const paddedAmount = amountWei.toString(16).padStart(64, '0')
    return functionSignature + paddedSpender + paddedAmount
  }

  // Function to get deposit transaction data
  const getDepositTransactionData = (amountWei) => {
    // Escrow deposit function signature: deposit(uint256)
    const functionSignature = '0xb6b55f25'
    const paddedAmount = amountWei.toString(16).padStart(64, '0')
    return functionSignature + paddedAmount
  }

  // Main function to create bounty with automatic token handling
  const createBountyWithTokenHandling = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask Required', {
        description: 'Please install MetaMask to create bounties'
      })
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Validate form data
      const amount = parseFloat(bountyData.amount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid bounty amount')
      }

      if (amount < 0.1) {
        throw new Error('Minimum bounty amount is 0.1 GTK')
      }

      if (userGTKBalance && parseFloat(userGTKBalance.gtkBalance) < amount) {
        throw new Error('Insufficient GTK token balance')
      }

      // Get contract addresses
      if (!walletInfo) {
        throw new Error('Contract information not loaded')
      }

      const { gtkTokenAddress, escrowContractAddress } = walletInfo
      
      // Convert amount to wei (18 decimals)
      const amountWei = BigInt(Math.floor(amount * Math.pow(10, 18)))
      
      // Get user's wallet address
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length === 0) {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        const newAccounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (newAccounts.length === 0) {
          throw new Error('Please connect your MetaMask wallet')
        }
      }

      const userAddress = accounts[0]

      // Step 1: Approve tokens
      setApprovalStep('Approving GTK tokens...')
      toast.info('Step 1/3: Approve GTK Tokens', {
        description: 'Please confirm the approval transaction in MetaMask'
      })

      const approveData = getApproveTransactionData(escrowContractAddress, amountWei)
      
      const approveTxHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: gtkTokenAddress,
          data: approveData,
          gas: '0x15F90' // 90000 gas limit
        }]
      })

      console.log('Approval transaction:', approveTxHash)
      
      // Wait for approval confirmation
      setApprovalStep('Waiting for approval confirmation...')
      await waitForTransaction(approveTxHash)
      
      toast.success('GTK Tokens Approved!', {
        description: 'Approval confirmed. Now depositing to escrow...'
      })

      // Step 2: Deposit tokens to escrow
      setApprovalStep('Depositing GTK tokens to escrow...')
      toast.info('Step 2/3: Deposit to Escrow', {
        description: 'Please confirm the deposit transaction in MetaMask'
      })

      const depositData = getDepositTransactionData(amountWei)
      
      const depositTxHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: escrowContractAddress,
          data: depositData,
          gas: '0x30D40' // 200000 gas limit
        }]
      })

      console.log('Deposit transaction:', depositTxHash)
      
      // Wait for deposit confirmation
      setApprovalStep('Waiting for deposit confirmation...')
      await waitForTransaction(depositTxHash)
      
      toast.success('GTK Tokens Deposited!', {
        description: 'Tokens successfully escrowed. Creating bounty...'
      })

      // Step 3: Create bounty in backend
      setApprovalStep('Creating bounty record...')
      toast.info('Step 3/3: Creating Bounty', {
        description: 'Saving bounty details to database...'
      })

      const token = await getToken()
      const bountyPayload = {
        title: bountyData.title,
        description: bountyData.description,
        amount: amount,
        repositoryFullName: repoFullName,
        requirements: bountyData.requirements.filter(req => req.trim() !== ''),
        txHashes: {
          approval: approveTxHash,
          deposit: depositTxHash
        }
      }
      
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
        throw new Error(responseData.error || 'Failed to create bounty')
      }

      // Success!
      toast.success('🎉 GTK Bounty Created Successfully!', {
        description: `${amount} GTK bounty is now active and ready for contributors`,
        duration: 5000,
        action: {
          label: 'View Bounty',
          onClick: () => navigate(`/bounties/${responseData.bountyId}`)
        }
      })
      
      setSuccess(`GTK bounty created successfully! ${amount} GTK tokens are now escrowed and ready.`)
      
      // Refresh balance
      await fetchUserGTKBalance()
      
      // Navigate to bounties page after delay
      setTimeout(() => {
        navigate('/bounties')
      }, 3000)
      
    } catch (err) {
      console.error('Bounty creation error:', err)
      setError(err.message)
      
      // Different error messages for different scenarios
      if (err.code === 4001) {
        toast.error('Transaction Cancelled', {
          description: 'User cancelled the transaction in MetaMask'
        })
      } else if (err.message.includes('insufficient funds')) {
        toast.error('Insufficient Funds', {
          description: 'Not enough ETH for gas fees or GTK tokens for bounty'
        })
      } else {
        toast.error('Bounty Creation Failed', {
          description: err.message
        })
      }
    } finally {
      setLoading(false)
      setApprovalStep('')
    }
  }

  // Helper function to wait for transaction confirmation
  const waitForTransaction = async (txHash, maxWait = 60000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      const checkTransaction = async () => {
        try {
          const receipt = await window.ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash]
          })
          
          if (receipt) {
            if (receipt.status === '0x1') {
              resolve(receipt)
            } else {
              reject(new Error('Transaction failed'))
            }
          } else if (Date.now() - startTime > maxWait) {
            reject(new Error('Transaction timeout'))
          } else {
            // Check again in 2 seconds
            setTimeout(checkTransaction, 2000)
          }
        } catch (error) {
          reject(error)
        }
      }
      
      checkTransaction()
    })
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
              <h1 className="text-3xl font-bold tracking-tight">Create GTK Bounty</h1>
              <p className="text-muted-foreground">
                Set up a GTK token bounty for <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{repoFullName}</span>
              </p>
            </div>
          </div>

          {userGTKBalance && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">GTK Balance</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{parseFloat(userGTKBalance.gtkBalance || 0).toFixed(2)} GTK</p>
                    <p className="text-xs text-muted-foreground">Available for bounties</p>
                  </div>
                </div>
                {userGTKBalance.escrowBalance && parseFloat(userGTKBalance.escrowBalance) > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Escrowed</span>
                      <span className="text-xs font-medium">{parseFloat(userGTKBalance.escrowBalance).toFixed(2)} GTK</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
              <span>GTK Bounty Details</span>
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

          {approvalStep && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{approvalStep}</AlertDescription>
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
                  Create a webhook to monitor repository events for automatic GTK token payments
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
                    <li>Pull request merges (triggers automatic GTK payment)</li>
                    <li>Push events (new commits)</li>
                    <li>Issue events and comments</li>
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

          {step === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  <CardTitle>GTK Bounty Configuration</CardTitle>
                </div>
                <CardDescription>
                  Configure bounty details and GTK token reward amount
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
                      <Coins className="w-4 h-4" />
                      Bounty Amount (GTK)
                    </Label>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="number"
                        placeholder="10"
                        min="0.1"
                        max="1000"
                        step="0.1"
                        value={bountyData.amount}
                        onChange={(e) => setBountyData(prev => ({...prev, amount: e.target.value}))}
                        className="pr-16"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-sm text-muted-foreground font-mono">GTK</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      GTK tokens will be automatically approved, deposited, and sent to contributor when PR is merged
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

                <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-primary flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    One-Click GTK Bounty Creation
                  </h4>
                  <div className="text-sm text-primary/80 space-y-1">
                    <p>• Automatically approve {bountyData.amount || '0'} GTK for escrow</p>
                    <p>• Deposit tokens to secure escrow contract</p>
                    <p>• Create bounty and activate automatic payments</p>
                    <p>• All transactions handled through MetaMask</p>
                  </div>
                </div>

                {userGTKBalance && parseFloat(bountyData.amount || 0) > parseFloat(userGTKBalance.gtkBalance || 0) && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Warning:</strong> Insufficient GTK balance. You have {parseFloat(userGTKBalance.gtkBalance || 0).toFixed(2)} GTK 
                      but need {bountyData.amount || '0'} GTK for this bounty.
                    </p>
                  </div>
                )}

                <Button 
                  onClick={createBountyWithTokenHandling} 
                  disabled={loading || !bountyData.title || !bountyData.description || !bountyData.amount || 
                    (userGTKBalance && parseFloat(bountyData.amount || 0) > parseFloat(userGTKBalance.gtkBalance || 0))}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {approvalStep || 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4 mr-2" />
                      Create GTK Bounty ({bountyData.amount || '0'} GTK)
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  This will open MetaMask twice: once to approve GTK tokens, then to deposit them to escrow. 
                  Your bounty will be active immediately after both transactions confirm.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
