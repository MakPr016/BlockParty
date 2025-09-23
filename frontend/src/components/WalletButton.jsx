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
import { Wallet, Plus, Copy, Loader2, AlertCircle, CheckCircle, ExternalLink, Coins } from 'lucide-react'

export default function WalletButton() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [balance, setBalance] = useState(null)
  const [gtkBalance, setGtkBalance] = useState(null)
  const [escrowBalance, setEscrowBalance] = useState(null)
  const [error, setError] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [network, setNetwork] = useState(null)

  const hasWallet = userProfile?.wallet_id && userProfile.wallet_id !== ''
  const walletAddress = userProfile?.wallet_id

  const fetchUserProfile = async () => {
    if (!user || !isLoaded) return
    
    try {
      const token = await getToken()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
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

  const fetchGTKBalance = async () => {
    if (!hasWallet) return
    
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
        setGtkBalance(data.gtkBalance)
        setEscrowBalance(data.escrowBalance)
      }
    } catch (error) {
      console.error('Error fetching GTK balance:', error)
      setGtkBalance('Error')
      setEscrowBalance('Error')
    }
  }

  const addGTKTokenToMetaMask = async () => {
    if (!window.ethereum) return
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/health`)
      const data = await response.json()
      
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: data.gtkTokenAddress,
            symbol: 'GTK',
            decimals: 18,
            image: 'https://via.placeholder.com/32x32.png'
          }
        }
      })
      
      toast.success('GTK Token Added!', {
        description: 'GTK token has been added to your MetaMask wallet'
      })
    } catch (error) {
      toast.error('Failed to add GTK token to MetaMask')
    }
  }

  const switchToSepolia = async () => {
    if (!window.ethereum) return
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }]
      })
      
      setTimeout(() => {
        detectNetwork()
        fetchBalance()
        fetchGTKBalance()
      }, 1000)
      
      toast.success('Switched to Sepolia Testnet')
      
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'SepoliaETH',
                decimals: 18
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/']
            }]
          })
        } catch (addError) {
          toast.error('Failed to add Sepolia network')
        }
      } else {
        toast.error('Failed to switch network')
      }
    }
  }

  const detectNetwork = async () => {
    if (!window.ethereum) return
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      const isSepolia = chainId === '0xaa36a7'
      setNetwork({ 
        chainId, 
        name: isSepolia ? 'Sepolia Testnet' : 'Other Network',
        isSepolia 
      })
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
      
      await detectNetwork()
      
      const message = `Connect wallet ${selectedAccount} to BlockParty GTK at ${new Date().toISOString()}`
      
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

  const updateWalletAddress = async (address) => {
    if (!user || !isLoaded) return false
    
    try {
      setUpdating(true)
      setError(null)
      const token = await getToken()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/wallet`, {
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

  const disconnectWallet = async () => {
    try {
      setUpdating(true)
      const success = await updateWalletAddress('')
      
      if (success) {
        setBalance(null)
        setGtkBalance(null)
        setEscrowBalance(null)
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

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserProfile()
    }
  }, [isLoaded, user])

  useEffect(() => {
    if (modalOpen && hasWallet) {
      detectNetwork()
      fetchBalance()
      fetchGTKBalance()
    }
  }, [modalOpen, hasWallet])

  useEffect(() => {
    if (window.ethereum && hasWallet) {
      const handleChainChanged = (chainId) => {
        detectNetwork()
        fetchBalance()
        fetchGTKBalance()
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
          {hasWallet && gtkBalance && parseFloat(gtkBalance) > 0 && (
            <span className="bg-primary text-primary-foreground px-1.5 py-0.5 text-xs rounded-full">
              {parseFloat(gtkBalance).toFixed(2)} GTK
            </span>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>GTK Wallet</DialogTitle>
          <DialogDescription>
            Connect your wallet to use GTK tokens for bounties
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
                        {network.isSepolia ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Sepolia
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            Wrong Network
                          </span>
                        )}
                      </div>
                    </div>
                    {!network.isSepolia && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={switchToSepolia}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Sepolia
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">ETH Balance</p>
                      <p className="text-lg font-semibold">
                        {balance !== null ? `${balance} ETH` : 'Loading...'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        GTK Balance
                      </p>
                      <p className="text-lg font-semibold text-primary">
                        {gtkBalance !== null ? `${parseFloat(gtkBalance).toFixed(2)} GTK` : 'Loading...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {escrowBalance && parseFloat(escrowBalance) > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Escrowed GTK</p>
                      <p className="text-lg font-semibold text-blue-800">
                        {parseFloat(escrowBalance).toFixed(2)} GTK
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Tokens locked in active bounties
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={addGTKTokenToMetaMask}
                  className="flex-1"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add GTK Token
                </Button>
                <Button 
                  variant="outline" 
                  onClick={fetchGTKBalance}
                  size="sm"
                >
                  Refresh
                </Button>
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
                  GTK tokens on Sepolia Testnet • {gtkBalance && `${parseFloat(gtkBalance).toFixed(4)} GTK available`}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Wallet className="w-8 h-8 text-muted-foreground" />
                <Coins className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground mb-6">
                Link your MetaMask wallet to use GTK tokens for bounties
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
                Make sure MetaMask is installed and connected to Sepolia testnet
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
