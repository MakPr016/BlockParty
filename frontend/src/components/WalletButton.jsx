import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Wallet, Plus, Copy, Loader2, AlertCircle } from 'lucide-react'

export default function WalletButton() {
  const { user, isLoaded } = useUser()
  const [modalOpen, setModalOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState(null)

  // Fixed: Correct way to check for wallet and get address
  const hasWallet = user?.web3Wallets?.length > 0
  const walletAddress = hasWallet ? user.web3Wallets[0].web3Wallet : null

  const connectWallet = async () => {
    setError(null)
    
    if (!window.ethereum) {
      setError('Please install MetaMask extension to connect your wallet.')
      return
    }

    if (!user || !isLoaded) {
      setError('Please wait for user data to load.')
      return
    }

    try {
      setConnecting(true)
      
      // Request account access from MetaMask
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      // Get current accounts
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in MetaMask')
      }
      
      // Fixed: Get the first account address
      const selectedAccount = accounts[0]
      
      // For now, let's use a simplified approach since Clerk's Web3 API has issues
      // Just store the wallet info and show success
      console.log('Connected wallet address:', selectedAccount)
      
      // Create a simple message to sign for verification
      const message = `Connect wallet ${selectedAccount} to BlockParty at ${new Date().toISOString()}`
      
      // Request signature from MetaMask
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, selectedAccount]
      })
      
      if (signature) {
        // For now, we'll just show success
        // Later you can implement proper Clerk integration or custom backend storage
        alert(`Wallet connected successfully!\n\nAddress: ${selectedAccount.slice(0,6)}...${selectedAccount.slice(-4)}`)
        setModalOpen(false)
      }
      
    } catch (error) {
      console.error('Error connecting wallet:', error)
      setError(error.message || 'Failed to connect wallet')
    } finally {
      setConnecting(false)
    }
  }

  const fetchBalance = async () => {
    if (!walletAddress || !window.ethereum) return
    
    try {
      const balanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [walletAddress, 'latest']
      })
      const balanceEth = parseInt(balanceHex, 16) / Math.pow(10, 18)
      setBalance(balanceEth.toFixed(4))
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance('Error')
    }
  }

  // Fetch balance when modal opens and wallet is connected
  useEffect(() => {
    if (modalOpen && hasWallet) {
      fetchBalance()
    }
  }, [modalOpen, hasWallet])

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      alert('Address copied to clipboard!')
    }
  }

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!isLoaded) {
    return null
  }

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 text-white hover:bg-gray-800"
        >
          <Wallet className="w-4 h-4" />
          Wallet
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Wallet</DialogTitle>
          <DialogDescription>
            Connect or manage your Web3 wallet for bounty payments
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {hasWallet ? (
            // Show wallet details if connected
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Wallet Address</p>
                    <p className="font-mono text-sm">{formatAddress(walletAddress)}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={copyAddress}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ETH Balance</p>
                    <p className="text-lg font-semibold">
                      {balance !== null ? `${balance} ETH` : 'Loading...'}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fetchBalance}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground text-center">
                  Wallet connected via MetaMask
                </p>
              </div>
            </div>
          ) : (
            // Show add wallet button if not connected
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground mb-6">
                Link your MetaMask wallet to enable Web3 features and receive bounty payments
              </p>
              
              <Button 
                onClick={connectWallet} 
                disabled={connecting}
                className="w-full gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Wallet
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
