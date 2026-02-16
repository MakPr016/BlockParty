import express from 'express'
import cors from 'cors'
import { ClerkExpressRequireAuth, clerkClient } from '@clerk/clerk-sdk-node'
import { Octokit } from '@octokit/core'
import { MongoClient, ObjectId } from 'mongodb'
import { ethers } from 'ethers'
import { Webhook } from 'svix'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000
const FRONTEND_URL = process.env.FRONTEND_URL;


const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:3000',
  'https://git-bounty-nine.vercel.app' ,
  'https://gitbounty.tripodhub.in',
  FRONTEND_URL
].filter(Boolean)

function validateEnvironmentVariables() {
  const required = [
    'MONGODB_URL',
    'CLERK_SECRET_KEY',
    'CLERK_WEBHOOK_SECRET',
    'ETHEREUM_RPC_URL',
    'PRIVATE_KEY',
    'FALLBACK_WALLET_ADDRESS',
    'GTK_TOKEN_ADDRESS',
    'ESCROW_CONTRACT_ADDRESS'
  ]
  
  const missing = required.filter(key => !process.env[key] || process.env[key].includes('your_'))
  
  if (missing.length > 0) {
    console.error('Missing or invalid environment variables:')
    missing.forEach(key => {
      console.error(`   - ${key}: ${process.env[key] || 'not set'}`)
    })
    console.error('Please update your .env file with actual values')
    process.exit(1)
  }
  
  const privateKey = process.env.PRIVATE_KEY
  if (!/^[0-9a-fA-F]{64}$/.test(privateKey.replace('0x', ''))) {
    console.error('Invalid PRIVATE_KEY format. Must be 64 characters (hex)')
    process.exit(1)
  }
  
  console.log('All environment variables are valid')
}

validateEnvironmentVariables()

let provider, wallet, tokenContract, escrowContract

try {
  provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL)
  
  const privateKey = process.env.PRIVATE_KEY.startsWith('0x') 
    ? process.env.PRIVATE_KEY 
    : `0x${process.env.PRIVATE_KEY}`
    
  wallet = new ethers.Wallet(privateKey, provider)
  console.log('Wallet initialized:', wallet.address)
  
  const tokenABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)"
  ]
  
  const escrowABI = [
    "function deposit(uint256 amount) external",
    "function release(address recipient, uint256 amount) external",
    "function releaseOnBehalf(address from, address recipient, uint256 amount) external",
    "function withdraw() external",
    "function withdraw(uint256 amount) external",
    "function escrowBalance(address account) view returns (uint256)",
    "function getTotalEscrowed() view returns (uint256)",
    "function setAuthorized(address account, bool status) external",
    "function authorized(address account) view returns (bool)",
    "function owner() view returns (address)",
    "function canRelease(address from, uint256 amount) view returns (bool)"
  ]
  
  tokenContract = new ethers.Contract(process.env.GTK_TOKEN_ADDRESS, tokenABI, wallet)
  escrowContract = new ethers.Contract(process.env.ESCROW_CONTRACT_ADDRESS, escrowABI, wallet)
  
  console.log('GTK Token contract initialized:', process.env.GTK_TOKEN_ADDRESS)
  console.log('Escrow contract initialized:', process.env.ESCROW_CONTRACT_ADDRESS)
  
} catch (error) {
  console.error('Failed to initialize Ethereum components:', error.message)
  process.exit(1)
}

const mongoUrl = process.env.MONGODB_URL
const dbName = 'blockparty'
let db
let mongoConnected = false

MongoClient.connect(mongoUrl).then(client => {
  console.log('Connected to MongoDB')
  db = client.db(dbName)
  mongoConnected = true
}).catch(error => {
  console.error('MongoDB connection error:', error)
  process.exit(1)
})

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

app.use('/api/webhooks/clerk', express.raw({ type: 'application/json' }))

app.use(express.json({
  verify: (req, res, buf, encoding) => {
    if (req.originalUrl && req.originalUrl.startsWith('/api/webhook')) {
      req.rawBody = buf
    }
  }
}))

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

const handleClerkAuth = (req, res, next) => {
  ClerkExpressRequireAuth()(req, res, (err) => {
    if (err) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        details: err.message 
      })
    }
    next()
  })
}

async function createEscrowForBounty(bountyCreatorUserId, bountyAmountGTK, bountyId) {
  try {
    console.log(`Creating GTK escrow for bounty ${bountyId} with amount ${bountyAmountGTK} GTK`)
    
    const user = await db.collection('users').findOne({ clerk_id: bountyCreatorUserId })
    if (!user || !user.wallet_id) {
      throw new Error('User wallet address not found')
    }
    
    const userAddress = user.wallet_id
    const amountWei = ethers.parseEther(bountyAmountGTK.toString())
    
    const userBalance = await tokenContract.balanceOf(userAddress)
    console.log(`User GTK balance: ${ethers.formatEther(userBalance)} GTK`)
    
    if (userBalance < amountWei) {
      throw new Error(`Insufficient GTK balance. Required: ${bountyAmountGTK} GTK, Available: ${ethers.formatEther(userBalance)} GTK`)
    }
    
    const escrowBalance = await escrowContract.escrowBalance(userAddress)
    console.log(`User escrow balance: ${ethers.formatEther(escrowBalance)} GTK`)
    
    if (escrowBalance >= amountWei) {
      console.log(`GTK tokens already deposited in escrow for bounty ${bountyId}`)
      return {
        escrowAmount: bountyAmountGTK,
        escrowStatus: 'active',
        currency: 'GTK',
        network: 'Sepolia',
        userAddress: userAddress
      }
    }
    
    console.log(`GTK escrow validation passed for bounty ${bountyId}`)
    
    return {
      escrowAmount: bountyAmountGTK,
      escrowStatus: 'pending_deposit',
      currency: 'GTK',
      network: 'Sepolia',
      userAddress: userAddress
    }
    
  } catch (error) {
    console.error('Error creating GTK escrow:', error)
    throw new Error(`Failed to create GTK escrow: ${error.message}`)
  }
}

async function releaseEscrowForContribution(contributorWalletAddress, bountyAmountGTK, bountyCreatorUserId) {
  try {
    const amountWei = ethers.parseEther(bountyAmountGTK.toString())
    
    const bountyCreator = await db.collection('users').findOne({ clerk_id: bountyCreatorUserId })
    if (!bountyCreator || !bountyCreator.wallet_id) {
      throw new Error('Bounty creator wallet address not found')
    }
    
    const creatorEscrowBalance = await escrowContract.escrowBalance(bountyCreator.wallet_id)
    console.log(`Bounty creator escrow balance: ${ethers.formatEther(creatorEscrowBalance)} GTK`)
    
    if (creatorEscrowBalance < amountWei) {
      throw new Error(`Bounty creator needs ${bountyAmountGTK} GTK in escrow to make payments`)
    }
    
    const tx = await escrowContract.releaseOnBehalf(
      bountyCreator.wallet_id,
      contributorWalletAddress,
      amountWei
    )
    
    const receipt = await tx.wait()
    
    return {
      releaseTxHash: tx.hash,
      releaseAmount: bountyAmountGTK,
      releaseStatus: 'completed',
      blockNumber: receipt.blockNumber,
      currency: 'GTK'
    }
    
  } catch (error) {
    throw new Error(`Failed to release GTK escrow: ${error.message}`)
  }
}

async function syncUserToMongoDB(userData) {
  try {
    if (!mongoConnected || !db) {
      console.error('MongoDB not connected yet, skipping user sync')
      return
    }

    let walletAddress = ''
    if (userData.web3_wallets && userData.web3_wallets.length > 0) {
      const wallet = userData.web3_wallets[0]
      walletAddress = wallet?.web3_wallet || wallet?.address || wallet?.wallet_address || ''
      console.log('Extracted wallet address:', walletAddress)
    }

    const userRecord = {
      clerk_id: userData.id,
      email: userData.email_addresses?.[0]?.email_address || null,
      first_name: userData.first_name || null,
      last_name: userData.last_name || null,
      avatar_url: userData.image_url || null,
      github_username: userData.external_accounts?.find(
        account => account.provider === 'oauth_github'
      )?.username || null,
      wallet_id: walletAddress,
      updated_at: new Date()
    }

    const result = await db.collection('users').updateOne(
      { clerk_id: userData.id },
      { 
        $set: userRecord,
        $setOnInsert: { created_at: new Date() }
      },
      { upsert: true }
    )

    if (result.upsertedCount > 0) {
      console.log('New user created:', userRecord.clerk_id)
    } else if (result.modifiedCount > 0) {
      console.log('User updated:', userRecord.clerk_id)
    }

  } catch (error) {
    console.error('Error syncing user to MongoDB:', error)
  }
}

async function getUserByGitHubUsername(username) {
  try {
    let user = await db.collection('users').findOne({ 
      github_username: username 
    })
    
    if (!user) {
      user = await db.collection('users').findOne({ 
        github_username: { $regex: new RegExp(`^${username}$`, 'i') }
      })
    }
    
    console.log(`Found user for GitHub username ${username}:`, user ? 'Yes' : 'No')
    return user
  } catch (error) {
    console.error('Error fetching user by GitHub username:', error)
    return null
  }
}

async function handleMergedPR(payload) {
  try {
    const pr = payload.pull_request
    const repository = payload.repository
    
    console.log(`Processing merged PR: ${pr.title} in ${repository.full_name}`)
    
    const bounty = await db.collection('bounties').findOne({
      repositoryFullName: repository.full_name,
      status: 'active',
      escrowStatus: 'active'
    })
    
    if (!bounty) {
      console.log(`No active bounty found for repository: ${repository.full_name}`)
      return
    }
    
    console.log(`Found bounty: ${bounty.title} (${bounty.amount} GTK)`)
    
    const contributorUsername = pr.user.login
    const contributorUser = await getUserByGitHubUsername(contributorUsername)
    
    if (!contributorUser || !contributorUser.wallet_id) {
      console.log(`Contributor ${contributorUsername} has no wallet address, using fallback`)
    }
    
    const paymentAddress = contributorUser?.wallet_id || process.env.FALLBACK_WALLET_ADDRESS
    console.log(`GTK payment will be sent to: ${paymentAddress}`)
    
    const contributionData = {
      bountyId: bounty._id,
      contributor_username: contributorUsername,
      contributor_email: pr.user.email || null,
      contributor_id: pr.user.id,
      contributor_avatar: pr.user.avatar_url,
      contributor_wallet: paymentAddress,
      pr_number: pr.number,
      pr_title: pr.title,
      pr_url: pr.html_url,
      pr_additions: pr.additions || 0,
      pr_deletions: pr.deletions || 0,
      pr_commits: pr.commits || 1,
      repository_name: repository.name,
      repository_full_name: repository.full_name,
      repository_url: repository.html_url,
      merged_at: new Date(pr.merged_at),
      merged_by: pr.merged_by?.login,
      payment_status: 'pending',
      created_at: new Date()
    }
    
    const contributionResult = await db.collection('contributions').insertOne(contributionData)
    console.log(`Contribution recorded with ID: ${contributionResult.insertedId}`)
    
    try {
      console.log(`Initiating GTK payment for ${bounty.amount} GTK...`)
      const escrowReleaseInfo = await releaseEscrowForContribution(paymentAddress, bounty.amount, bounty.createdBy)
      
      await db.collection('contributions').updateOne(
        { _id: contributionResult.insertedId },
        {
          $set: {
            payment_status: 'completed',
            payment_tx_hash: escrowReleaseInfo.releaseTxHash,
            payment_amount: escrowReleaseInfo.releaseAmount,
            payment_currency: 'GTK',
            payment_block_number: escrowReleaseInfo.blockNumber,
            payment_completed_at: new Date()
          }
        }
      )
      
      await db.collection('bounties').updateOne(
        { _id: bounty._id },
        { 
          $set: { 
            status: 'completed',
            escrowStatus: 'released',
            completedAt: new Date(),
            completedBy: contributorUsername,
            contributionId: contributionResult.insertedId,
            paymentInfo: escrowReleaseInfo,
            updatedAt: new Date()
          }
        }
      )
      
      console.log(`SUCCESS: Bounty ${bounty._id} completed and ${bounty.amount} GTK sent to ${paymentAddress}`)
      console.log(`Transaction hash: ${escrowReleaseInfo.releaseTxHash}`)
      
    } catch (paymentError) {
      console.error('GTK Payment release failed:', paymentError)
      
      await db.collection('contributions').updateOne(
        { _id: contributionResult.insertedId },
        {
          $set: {
            payment_status: 'failed',
            payment_error: paymentError.message,
            payment_failed_at: new Date()
          }
        }
      )
      
      await db.collection('bounties').updateOne(
        { _id: bounty._id },
        {
          $set: {
            status: 'payment_failed',
            escrowStatus: 'release_failed',
            paymentError: paymentError.message,
            updatedAt: new Date()
          }
        }
      )
    }
    
  } catch (error) {
    console.error('Error handling merged PR:', error)
  }
}

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    clerkConfigured: !!process.env.CLERK_SECRET_KEY,
    mongoConnected: mongoConnected,
    ethereumConfigured: !!process.env.ETHEREUM_RPC_URL,
    webhookSecretConfigured: !!process.env.CLERK_WEBHOOK_SECRET,
    walletAddress: wallet?.address || 'Not initialized',
    paymentCurrency: 'GTK',
    network: 'Sepolia',
    gtkTokenAddress: process.env.GTK_TOKEN_ADDRESS,
    escrowContractAddress: process.env.ESCROW_CONTRACT_ADDRESS
  })
})

app.get('/api/wallet/balance', async (req, res) => {
  try {
    const ethBalance = await provider.getBalance(wallet.address)
    const gtkBalance = await tokenContract.balanceOf(wallet.address)
    const blockNumber = await provider.getBlockNumber()
    
    res.json({
      walletAddress: wallet.address,
      ethBalance: ethers.formatEther(ethBalance),
      gtkBalance: ethers.formatEther(gtkBalance),
      currency: 'GTK',
      network: 'Sepolia',
      blockNumber: blockNumber,
      tokenAddress: process.env.GTK_TOKEN_ADDRESS
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get wallet balance',
      details: error.message
    })
  }
})

app.get('/api/users/gtk-balance', handleClerkAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    const user = await db.collection('users').findOne({ clerk_id: userId })
    
    if (!user || !user.wallet_id) {
      return res.status(404).json({ error: 'User wallet not found' })
    }
    
    const gtkBalance = await tokenContract.balanceOf(user.wallet_id)
    const escrowBalance = await escrowContract.escrowBalance(user.wallet_id)
    
    res.json({
      walletAddress: user.wallet_id,
      gtkBalance: ethers.formatEther(gtkBalance),
      escrowBalance: ethers.formatEther(escrowBalance),
      currency: 'GTK'
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get GTK balance',
      details: error.message
    })
  }
})

app.post('/api/bounties/:id/sync-escrow', handleClerkAuth, async (req, res) => {
  try {
    const bountyId = req.params.id
    const bounty = await db.collection('bounties').findOne({ 
      _id: new ObjectId(bountyId) 
    })

    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' })
    }

    const escrowBalance = await escrowContract.escrowBalance(bounty.userAddress)
    const amountWei = ethers.parseEther(bounty.amount.toString())
    
    console.log(`Escrow balance: ${ethers.formatEther(escrowBalance)} GTK`)
    console.log(`Required amount: ${bounty.amount} GTK`)
    
    if (escrowBalance >= amountWei) {
      await db.collection('bounties').updateOne(
        { _id: new ObjectId(bountyId) },
        {
          $set: {
            escrowStatus: 'active',
            updatedAt: new Date()
          }
        }
      )
      
      res.json({ 
        success: true, 
        message: 'Bounty status updated to active',
        escrowBalance: ethers.formatEther(escrowBalance)
      })
    } else {
      res.json({ 
        success: false, 
        message: 'Insufficient escrow balance',
        escrowBalance: ethers.formatEther(escrowBalance),
        required: bounty.amount
      })
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/debug/escrow-auth', async (req, res) => {
  try {
    const backendWalletAuth = await escrowContract.authorized(wallet.address)
    const escrowOwner = await escrowContract.owner()
    
    res.json({
      backendWallet: wallet.address,
      isAuthorized: backendWalletAuth,
      escrowOwner: escrowOwner,
      canRelease: backendWalletAuth || wallet.address === escrowOwner
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/webhooks/clerk', async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env')
  }

  const headerPayload = req.headers
  const svix_id = headerPayload['svix-id']
  const svix_timestamp = headerPayload['svix-timestamp']
  const svix_signature = headerPayload['svix-signature']

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({
      success: false,
      message: 'Error occurred -- no svix headers'
    })
  }

  const payload = req.body
  const body = payload.toString()

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature
    })
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }

  const { id } = evt.data
  const eventType = evt.type

  console.log(`Webhook with ID of ${id} and type of ${eventType}`)

  if (eventType === 'user.created' || eventType === 'user.updated') {
    await syncUserToMongoDB(evt.data)
  }

  return res.status(200).json({
    success: true,
    message: 'Webhook processed successfully'
  })
})

app.patch('/api/users/wallet', handleClerkAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    const { walletAddress } = req.body
    
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Valid wallet address is required'
      })
    }
    
    const result = await db.collection('users').updateOne(
      { clerk_id: userId },
      { 
        $set: { 
          wallet_id: walletAddress,
          updated_at: new Date()
        }
      }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'User not found'
      })
    }
    
    res.json({
      success: true,
      message: 'Wallet address updated successfully'
    })
    
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      details: error.message
    })
  }
})

app.get('/api/users/profile', handleClerkAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    
    const user = await db.collection('users').findOne({ 
      clerk_id: userId 
    })
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      })
    }
    
    res.json({ user })
    
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      details: error.message
    })
  }
})

app.get('/api/debug/users', async (req, res) => {
  try {
    if (!mongoConnected || !db) {
      return res.status(500).json({ error: 'MongoDB not connected' })
    }
    
    const users = await db.collection('users').find({}).toArray()
    const count = await db.collection('users').countDocuments()
    
    res.json({
      count: count,
      users: users
    })
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      details: error.message
    })
  }
})

app.get('/api/admin/payment-logs', handleClerkAuth, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query
    
    const contributions = await db.collection('contributions')
      .find({})
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .toArray()
    
    res.json({ contributions })
    
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      details: error.message
    })
  }
})

app.get('/api/repositories', handleClerkAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    const oauthResponse = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_github')
    const oauthTokens = oauthResponse.data
    
    if (!oauthTokens || oauthTokens.length === 0) {
      return res.status(400).json({ 
        error: 'GitHub token not found. Please reconnect your GitHub account.' 
      })
    }

    const githubToken = oauthTokens[0].token
    const octokit = new Octokit({ auth: githubToken })
    
    const { data: repos } = await octokit.request('GET /user/repos', {
      sort: 'updated',
      per_page: 50,
      affiliation: 'owner',
      visibility : 'public',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    res.json({repositories: repos})
    
  } catch (error) {
    if (error.status === 401) {
      return res.status(401).json({ 
        error: 'GitHub authentication failed. Please reconnect your account.' 
      })
    }

    if (error.status === 403) {
      return res.status(403).json({ 
        error: 'Insufficient GitHub permissions.' 
      })
    }

    res.status(500).json({ 
      error: 'Failed to fetch repositories',
      details: error.message
    })
  }
})

app.get('/api/repositories/:owner/:repo/pulls', handleClerkAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params
    const userId = req.auth.userId
    const { state = 'all', per_page = 30, page = 1 } = req.query
    
    const oauthResponse = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_github')
    const oauthTokens = oauthResponse.data
    
    if (!oauthTokens || oauthTokens.length === 0) {
      return res.status(400).json({ 
        error: 'GitHub token not found. Please reconnect your GitHub account.' 
      })
    }

    const githubToken = oauthTokens[0].token
    const octokit = new Octokit({ auth: githubToken })
    
    const { data: pulls } = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
      owner,
      repo,
      state,
      per_page: parseInt(per_page),
      page: parseInt(page),
      sort: 'updated',
      direction: 'desc',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    
    res.json({ pulls })
    
  } catch (error) {
    console.error('Error fetching PRs:', error)
    
    if (error.status === 404) {
      return res.status(404).json({ 
        error: 'Repository not found' 
      })
    }
    
    if (error.status === 401) {
      return res.status(401).json({ 
        error: 'GitHub authentication failed. Please reconnect your account.' 
      })
    }

    res.status(500).json({ 
      error: 'Failed to fetch pull requests',
      details: error.message
    })
  }
})

app.get('/api/repositories/:owner/:repo/pulls/:number/diff', handleClerkAuth, async (req, res) => {
  try {
    const { owner, repo, number } = req.params
    const userId = req.auth.userId
    
    const oauthResponse = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_github')
    const oauthTokens = oauthResponse.data
    
    if (!oauthTokens || oauthTokens.length === 0) {
      return res.status(400).json({ 
        error: 'GitHub token not found. Please reconnect your GitHub account.' 
      })
    }

    const githubToken = oauthTokens[0].token
    const octokit = new Octokit({ auth: githubToken })
    
    const diffResponse = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner,
      repo,
      pull_number: parseInt(number),
      headers: {
        'Accept': 'application/vnd.github.v3.diff',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    
    const filesResponse = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
      owner,
      repo,
      pull_number: parseInt(number),
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    
    res.json({
      diff: diffResponse.data,
      files: filesResponse.data,
      pullNumber: number
    })
    
  } catch (error) {
    console.error('Error fetching PR diff:', error)
    
    if (error.status === 404) {
      return res.status(404).json({ 
        error: 'Pull request not found' 
      })
    }
    
    if (error.status === 401) {
      return res.status(401).json({ 
        error: 'GitHub authentication failed. Please reconnect your account.' 
      })
    }

    res.status(500).json({ 
      error: 'Failed to fetch pull request diff',
      details: error.message
    })
  }
})

app.post('/api/repositories/:owner/:repo/webhook', handleClerkAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params
    const userId = req.auth.userId
    
    const oauthResponse = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_github')
    const oauthTokens = oauthResponse.data
    
    if (!oauthTokens || oauthTokens.length === 0) {
      return res.status(400).json({ 
        error: 'GitHub token not found. Please reconnect your GitHub account.' 
      })
    }

    const githubToken = oauthTokens[0].token
    const octokit = new Octokit({ auth: githubToken })
    
    const webhookUrl = process.env.WEBHOOK_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/webhook/callback`
    
    console.log(`Checking existing webhooks for ${owner}/${repo}`)
    
    let existingHooks
    try {
      const response = await octokit.request('GET /repos/{owner}/{repo}/hooks', {
        owner,
        repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
      existingHooks = response.data
    } catch (error) {
      if (error.status === 403) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to access repository webhooks' 
        })
      }
      throw error
    }

    const requiredEvents = ['push', 'pull_request', 'issues', 'issue_comment']
    const existingWebhook = existingHooks.find(hook => {
      const sameUrl = hook.config?.url === webhookUrl
      const sameEvents = requiredEvents.every(event => hook.events.includes(event)) &&
                        hook.events.every(event => requiredEvents.includes(event))
      return sameUrl && sameEvents
    })

    let webhookResponse
    let isExisting = false

    if (existingWebhook && existingWebhook.active) {
      console.log(`Using existing webhook ${existingWebhook.id} for ${owner}/${repo}`)
      webhookResponse = { data: existingWebhook }
      isExisting = true
    } else {
      console.log(`Creating new webhook for ${owner}/${repo}`)
      
      webhookResponse = await octokit.request('POST /repos/{owner}/{repo}/hooks', {
        owner,
        repo,
        name: 'web',
        active: true,
        events: requiredEvents,
        config: {
          url: webhookUrl,
          content_type: 'json',
          insecure_ssl: '0'
        },
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
    }

    const existingStoredWebhook = await db.collection('webhooks').findOne({
      userId,
      webhookId: webhookResponse.data.id,
      repositoryId: `${owner}/${repo}`
    })

    if (!existingStoredWebhook) {
      const webhookData = {
        userId,
        webhookId: webhookResponse.data.id,
        repositoryId: `${owner}/${repo}`,
        owner,
        repo,
        webhookUrl: webhookResponse.data.config.url,
        events: webhookResponse.data.events,
        active: webhookResponse.data.active,
        isExisting,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await db.collection('webhooks').insertOne(webhookData)
      console.log(`Stored webhook record with MongoDB ID: ${result.insertedId}`)
    } else {
      console.log(`Webhook record already exists in database`)
    }

    res.json({
      success: true,
      isExisting,
      message: isExisting ? 'Using existing webhook' : 'Created new webhook',
      webhook: {
        id: webhookResponse.data.id,
        url: webhookResponse.data.config.url,
        events: webhookResponse.data.events,
        active: webhookResponse.data.active
      }
    })

  } catch (error) {
    console.error('Webhook creation error:', error)
    
    if (error.status === 422) {
      return res.status(422).json({ 
        error: 'Webhook configuration invalid or conflicts with existing webhook' 
      })
    }
    
    if (error.status === 403) {
      return res.status(403).json({ 
        error: 'Insufficient permissions to create webhook' 
      })
    }

    res.status(500).json({ 
      error: 'Failed to create or find webhook',
      details: error.message 
    })
  }
})

app.post('/api/webhook/callback', async (req, res) => {
  try {
    console.log('Webhook received:', {
      headers: req.headers,
      hasBody: !!req.body,
      hasRawBody: !!req.rawBody,
      bodyType: typeof req.body
    })

    const event = req.headers['x-github-event']
    if (!event) {
      console.error('Missing x-github-event header')
      return res.status(400).json({ error: 'Missing GitHub event header' })
    }

    const payload = req.body
    
    if (!payload || typeof payload !== 'object') {
      console.error('Invalid payload structure:', typeof payload)
      return res.status(400).json({ error: 'Invalid payload structure' })
    }

    console.log(`Processing ${event} event for repository: ${payload.repository?.full_name}`)
    
    const eventData = {
      event,
      repositoryFullName: payload.repository?.full_name,
      payload,
      receivedAt: new Date()
    }
    
    await db.collection('webhook_events').insertOne(eventData)
    
    switch (event) {
      case 'ping':
        console.log('Ping event received - webhook setup successful')
        break
      case 'push':
        console.log(`Push event: ${payload.commits?.length || 0} commits`)
        break
      case 'pull_request':
        console.log(`PR event: ${payload.action} - ${payload.pull_request?.title}`)
        
        if (payload.action === 'closed' && payload.pull_request?.merged) {
          await handleMergedPR(payload)
        }
        break
      case 'issues':
        console.log(`Issue event: ${payload.action} - ${payload.issue?.title}`)
        break
      default:
        console.log(`Unhandled event type: ${event}`)
    }
    
    res.status(200).json({ 
      success: true, 
      message: `${event} event processed successfully`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Webhook processing error:', {
      error: error.message,
      stack: error.stack,
      headers: req.headers,
      bodyType: typeof req.body
    })
    
    res.status(500).json({ 
      error: 'Server error processing webhook',
      message: error.message
    })
  }
})

app.get('/api/webhooks', handleClerkAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    const webhooks = await db.collection('webhooks')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray()
    
    res.json({ webhooks })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch webhooks',
      details: error.message 
    })
  }
})

app.post('/api/bounties', handleClerkAuth, async (req, res) => {
  try {
    console.log('GTK BOUNTY CREATION REQUEST')
    console.log('Request body:', JSON.stringify(req.body, null, 2))
    
    const userId = req.auth.userId
    const { title, description, amount, repositoryFullName, requirements } = req.body
    
    console.log('Extracted data:', { title, description, amount, repositoryFullName, requirements })
    
    if (!title || !description || !amount || !repositoryFullName) {
      return res.status(400).json({
        error: 'Missing required fields: title, description, amount, repositoryFullName'
      })
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be a positive number'
      })
    }
    
    const bountyData = {
      title,
      description,
      amount: parseFloat(amount),
      currency: 'GTK',
      repositoryFullName,
      requirements: requirements || [],
      createdBy: userId,
      status: 'active',
      applicants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      escrowStatus: 'pending',
      escrowAmount: null,
      escrowCreatedAt: null
    }
    
    console.log('Inserting bounty into database...')
    const result = await db.collection('bounties').insertOne(bountyData)
    const bountyId = result.insertedId
    
    console.log(`Created bounty ${bountyId}, now creating GTK escrow...`)
    
    try {
      console.log(`Attempting to create GTK escrow for ${amount} GTK...`)
      const escrowInfo = await createEscrowForBounty(userId, amount, bountyId)
      
      console.log('GTK Escrow validation successful, updating bounty record...')
      await db.collection('bounties').updateOne(
        { _id: bountyId },
        {
          $set: {
            escrowStatus: escrowInfo.escrowStatus,
            escrowAmount: escrowInfo.escrowAmount,
            escrowCurrency: 'GTK',
            escrowCreatedAt: new Date(),
            userAddress: escrowInfo.userAddress,
            updatedAt: new Date()
          }
        }
      )
      
      console.log(`SUCCESS: GTK Escrow ready for bounty ${bountyId}`)
      console.log('Escrow info:', escrowInfo)
      
      res.json({
        success: true,
        bountyId: bountyId,
        escrowInfo: escrowInfo,
        message: escrowInfo.escrowStatus === 'active' ? 
          'Bounty created and tokens are already escrowed!' : 
          'Bounty created. User needs to approve and deposit GTK tokens.',
        nextSteps: escrowInfo.escrowStatus === 'active' ? 
          ['Bounty is ready for contributors!'] :
          ['User must approve escrow contract to spend GTK tokens', 'User must call deposit function to escrow tokens']
      })
      
    } catch (escrowError) {
      console.error('GTK ESCROW ERROR:', escrowError)
      
      await db.collection('bounties').updateOne(
        { _id: bountyId },
        {
          $set: {
            status: 'escrow_failed',
            escrowStatus: 'failed',
            escrowError: escrowError.message,
            updatedAt: new Date()
          }
        }
      )
      
      return res.status(500).json({
        error: 'Bounty created but GTK escrow setup failed',
        details: escrowError.message,
        bountyId: bountyId
      })
    }
    
  } catch (error) {
    console.error('BOUNTY CREATION ERROR:', error)
    res.status(500).json({ 
      error: 'Failed to create bounty',
      details: error.message 
    })
  }
})

app.get('/api/bounties', handleClerkAuth, async (req, res) => {
  try {
    const bounties = await db.collection('bounties')
      .find({ 
        status: { $nin: ['completed', 'escrow_failed'] },
        escrowStatus: { $in: ['active', 'ready_for_deposit'] }
      })
      .sort({ createdAt: -1 })
      .toArray()
    
    res.json({ bounties })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch bounties',
      details: error.message 
    })
  }
})

app.get('/api/bounties/:id', handleClerkAuth, async (req, res) => {
  try {
    const bountyId = req.params.id
    
    const bounty = await db.collection('bounties').findOne({ 
      _id: new ObjectId(bountyId) 
    })
    
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' })
    }
    
    res.json({ bounty })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch bounty',
      details: error.message 
    })
  }
})

app.get('/api/my-bounties', handleClerkAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    const bounties = await db.collection('bounties')
      .find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .toArray()
    
    res.json({ bounties })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch your bounties',
      details: error.message 
    })
  }
})

app.patch('/api/bounties/:id/status', handleClerkAuth, async (req, res) => {
  try {
    const bountyId = req.params.id
    const { status } = req.body
    const userId = req.auth.userId
    
    const bounty = await db.collection('bounties').findOne({ 
      _id: new ObjectId(bountyId) 
    })
    
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' })
    }
    
    if (bounty.createdBy !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this bounty' })
    }
    
    await db.collection('bounties').updateOne(
      { _id: new ObjectId(bountyId) },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    )
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update bounty status',
      details: error.message 
    })
  }
})

app.delete('/api/bounties/:id', handleClerkAuth, async (req, res) => {
  try {
    const bountyId = req.params.id
    const userId = req.auth.userId
    
    const bounty = await db.collection('bounties').findOne({ 
      _id: new ObjectId(bountyId) 
    })
    
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' })
    }
    
    if (bounty.createdBy !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this bounty' })
    }
    
    if (bounty.status === 'completed') {
      return res.status(400).json({ error: 'Cannot delete completed bounties' })
    }
    
    await db.collection('bounties').deleteOne({ _id: new ObjectId(bountyId) })
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to delete bounty',
      details: error.message 
    })
  }
})

app.get('/api/bounties/:id/contributions', handleClerkAuth, async (req, res) => {
  try {
    const bountyId = req.params.id
    
    const contributions = await db.collection('contributions')
      .find({ bountyId: new ObjectId(bountyId) })
      .sort({ created_at: -1 })
      .toArray()
    
    res.json({ contributions })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch contributions',
      details: error.message 
    })
  }
})

app.post('/api/bounties/:id/apply', handleClerkAuth, async (req, res) => {
  try {
    const bountyId = req.params.id
    const userId = req.auth.userId
    
    const bounty = await db.collection('bounties').findOne({ 
      _id: new ObjectId(bountyId) 
    })
    
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' })
    }
    
    if (bounty.createdBy === userId) {
      return res.status(400).json({ error: 'Cannot apply to your own bounty' })
    }
    
    if (bounty.applicants.some(applicant => applicant.userId === userId)) {
      return res.status(400).json({ error: 'Already applied to this bounty' })
    }
    
    await db.collection('bounties').updateOne(
      { _id: new ObjectId(bountyId) },
      {
        $push: {
          applicants: {
            userId,
            appliedAt: new Date(),
            status: 'pending'
          }
        },
        $set: { updatedAt: new Date() }
      }
    )
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to apply for bounty',
      details: error.message 
    })
  }
})

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ 
      error: 'Invalid JSON payload',
      message: err.message 
    })
  }
  
  if (res.headersSent) {
    return next(err)
  }
  
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  })
})

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.url 
  })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`GTK balance: http://localhost:${PORT}/api/wallet/balance`)
  console.log(`Wallet address: ${wallet.address}`)
  console.log('Payment currency: GTK (Sepolia)')
})
