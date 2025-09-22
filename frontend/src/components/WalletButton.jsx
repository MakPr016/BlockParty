import { useState, useEffect } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Wallet, Plus, Copy, Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react'

export default function WalletButton() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [network, setNetwork] = useState(null)

  const hasWallet = userProfile?.wallet_id && userProfile.wallet_id !== ''
  const walletAddress = userProfile?.wallet_id

  // Network configurations
  const networks = {
    '0x1': { name: 'Ethereum Mainnet', symbol: 'ETH', isTestnet: false },
    '0x5': { name: 'Goerli Testnet', symbol: 'GoerliETH', isTestnet: true },
    '0xaa36a7': { name: 'Sepolia Testnet', symbol: 'SepoliaETH', isTestnet: true },
    '0x89': { name: 'Polygon Mainnet', symbol: 'MATIC', isTestnet: false },
    '0x13881': { name: 'Mumbai Testnet', symbol: 'MATIC', isTestnet: true },
    '0x38': { name: 'BSC Mainnet', symbol: 'BNB', isTestnet: false },
    '0x61': { name: 'BSC Testnet', symbol: 'tBNB', isTestnet: true },
    '0xa4b1': { name: 'Arbitrum One', symbol: 'ETH', isTestnet: false },
    '0x421613': { name: 'Arbitrum Goerli', symbol: 'ETH', isTestnet: true },
  }

  const fetchUserProfile = async () => {
    if (!user || !isLoaded) return
    
    try {
      const token = await getToken()
      
      const response = await fetch('http://localhost:3000/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.user)
        setError(null)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setError(`Failed to fetch profile: ${error.message}`)
    }
  }

  const updateWalletAddress = async (address) => {
    if (!user || !isLoaded) return false
    
    try {
      setUpdating(true)
      setError(null)
      const token = await getToken()
      
      const response = await fetch('http://localhost:3000/api/users/wallet', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ walletAddress: address })
      })
      
      if (response.ok) {
        await fetchUserProfile()
        return true
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update wallet')
      }
    } catch (error) {
      console.error('Error updating wallet:', error)
      setError(error.message)
      return false
    } finally {
      setUpdating(false)
    }
  }

  const detectNetwork = async () => {
    if (!window.ethereum) return
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      const networkInfo = networks[chainId] || { 
        name: 'Unknown Network', 
        symbol: 'ETH', 
        isTestnet: false 
      }
      setNetwork({ chainId, ...networkInfo })
    } catch (error) {
      console.error('Error detecting network:', error)
    }
  }

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
      
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in MetaMask')
      }
      
      const selectedAccount = accounts[0]
      
      // Detect network after connecting
      await detectNetwork()
      
      const message = `Connect wallet ${selectedAccount} to BlockParty at ${new Date().toISOString()}`
      
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, selectedAccount]
      })
      
      if (signature) {
        const success = await updateWalletAddress(selectedAccount)
        
        if (success) {
          toast.success('Wallet Connected Successfully!', {
            description: `Connected ${selectedAccount.slice(0,6)}...${selectedAccount.slice(-4)}`
          })
          setModalOpen(false)
        }
      }
      
    } catch (error) {
      console.error('Error connecting wallet:', error)
      const errorMessage = error.code === 4001 
        ? 'Connection cancelled by user'
        : error.message || 'Failed to connect wallet'
      
      setError(errorMessage)
      toast.error('Connection Failed', {
        description: errorMessage
      })
    } finally {
      setConnecting(false)
    }
  }

  const fetchBalance = async () => {
    if (!walletAddress || !window.ethereum) return
    
    try {
      // Detect current network
      await detectNetwork()
      
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

  const disconnectWallet = async () => {
    try {
      setUpdating(true)
      const success = await updateWalletAddress('')
      
      if (success) {
        setBalance(null)
        setNetwork(null)
        toast.success('Wallet Disconnected', {
          description: 'Your wallet has been removed from your account'
        })
      }
    } catch (error) {
      toast.error('Disconnection Failed', {
        description: 'Failed to disconnect wallet'
      })
    } finally {
      setUpdating(false)
    }
  }

  const switchToTestnet = async () => {
    if (!window.ethereum) return
    
    try {
      // Switch to Sepolia testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia
      })
      
      // Refresh balance after network switch
      setTimeout(() => {
        detectNetwork()
        fetchBalance()
      }, 1000)
      
      toast.success('Switched to Sepolia Testnet', {
        description: 'You can now see your testnet balance'
      })
      
    } catch (error) {
      if (error.code === 4902) {
        // Network not added to MetaMask
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'SepoliaETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/'],
            }],
          })
        } catch (addError) {
          toast.error('Failed to add Sepolia network')
        }
      } else {
        toast.error('Failed to switch network')
      }
    }
  }

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserProfile()
    }
  }, [isLoaded, user])

  useEffect(() => {
    if (modalOpen && hasWallet) {
      detectNetwork()
      fetchBalance()
    }
  }, [modalOpen, hasWallet])

  // Listen for network changes
  useEffect(() => {
    if (window.ethereum && hasWallet) {
      const handleChainChanged = (chainId) => {
        detectNetwork()
        fetchBalance()
      }
      
      window.ethereum.on('chainChanged', handleChainChanged)
      
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [hasWallet])

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      toast.success('Address Copied!', {
        description: 'Wallet address copied to clipboard'
      })
    }
  }

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!isLoaded) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    )
  }

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
        >
          <Wallet className="w-4 h-4" />
          {hasWallet ? formatAddress(walletAddress) : 'Wallet'}
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
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/15 border border-destructive/20 rounded-lg text-destructive">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {hasWallet ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-medium">Connected Wallet</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
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

              {network && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Network</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{network.name}</p>
                        {network.isTestnet && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            Testnet
                          </span>
                        )}
                      </div>
                    </div>
                    {!network.isTestnet && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={switchToTestnet}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Testnet
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="text-lg font-semibold">
                      {balance !== null ? `${balance} ${network?.symbol || 'ETH'}` : 'Loading...'}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fetchBalance}
                    disabled={!window.ethereum}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={disconnectWallet}
                  disabled={updating}
                  className="flex-1"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Disconnect'
                  )}
                </Button>
              </div>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground text-center">
                  Wallet connected via MetaMask • {network?.isTestnet ? 'Testnet' : 'Mainnet'} • Stored securely
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground mb-6">
                Link your MetaMask wallet to enable Web3 features and receive bounty payments
              </p>
              
              <Button 
                onClick={connectWallet} 
                disabled={connecting || updating}
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
                    Connect MetaMask
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground mt-4">
                Make sure MetaMask is installed and unlocked
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
