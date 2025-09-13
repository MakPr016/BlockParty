import express from 'express'
import cors from 'cors'
import { ClerkExpressRequireAuth, clerkClient } from '@clerk/clerk-sdk-node'
import { Octokit } from '@octokit/core'
import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"

const mongoUrl = process.env.MONGODB_URL
const dbName = 'blockparty'
let db

if (!process.env.CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY is missing in .env file')
  process.exit(1)
}

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000'],
  credentials: true
}))

app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl && req.originalUrl.startsWith('/api/webhook')) {
      req.rawBody = buf
    }
  }
}))

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    clerkConfigured: !!process.env.CLERK_SECRET_KEY,
    mongoConnected: !!db
  })
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

app.get('/api/repositories', handleClerkAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    const oauthTokens = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_github')
    if (!oauthTokens || oauthTokens.length === 0) {
      return res.status(400).json({ error: 'GitHub token not found. Please reconnect your GitHub account.' })
    }
    const githubToken = oauthTokens[0].token
    const octokit = new Octokit({ auth: githubToken })
    const { data: repos } = await octokit.request('GET /user/repos', {
      sort: 'updated',
      per_page: 50,
      affiliation: 'owner',
      headers: { 'X-GitHub-Api-Version': '2022-11-28' }
    })
    res.json({ repositories: repos })
  } catch (error) {
    if (error.status === 401) {
      return res.status(401).json({ error: 'GitHub authentication failed. Please reconnect your account.' })
    }
    if (error.status === 403) {
      return res.status(403).json({ error: 'Insufficient GitHub permissions.' })
    }
    res.status(500).json({ error: 'Failed to fetch repositories', details: error.message })
  }
})

app.post('/api/repositories/:owner/:repo/webhook', handleClerkAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params
    const userId = req.auth.userId
    const oauthTokens = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_github')
    if (!oauthTokens || oauthTokens.length === 0) {
      return res.status(400).json({ error: 'GitHub token not found. Please reconnect your GitHub account.' })
    }
    const githubToken = oauthTokens[0].token
    const octokit = new Octokit({ auth: githubToken })
    const webhookUrl = process.env.WEBHOOK_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/webhook/callback`
    let existingHooks
    try {
      const response = await octokit.request('GET /repos/{owner}/{repo}/hooks', {
        owner,
        repo,
        headers: { 'X-GitHub-Api-Version': '2022-11-28' }
      })
      existingHooks = response.data
    } catch (error) {
      if (error.status === 403) {
        return res.status(403).json({ error: 'Insufficient permissions to access repository webhooks' })
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
      webhookResponse = { data: existingWebhook }
      isExisting = true
    } else {
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
        headers: { 'X-GitHub-Api-Version': '2022-11-28' }
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
      await db.collection('webhooks').insertOne(webhookData)
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
    if (error.status === 422) {
      return res.status(422).json({ error: 'Webhook configuration invalid or conflicts with existing webhook' })
    }
    if (error.status === 403) {
      return res.status(403).json({ error: 'Insufficient permissions to create webhook' })
    }
    res.status(500).json({ error: 'Failed to create or find webhook', details: error.message })
  }
})

app.post('/api/webhook/callback', async (req, res) => {
  try {
    const event = req.headers['x-github-event']
    if (!event) {
      return res.status(400).json({ error: 'Missing GitHub event header' })
    }
    const payload = req.body
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload structure' })
    }
    const eventData = {
      event,
      repositoryFullName: payload.repository?.full_name,
      payload,
      receivedAt: new Date()
    }
    await db.collection('webhook_events').insertOne(eventData)
    switch (event) {
      case 'pull_request':
        if (payload.action === 'closed' && payload.pull_request?.merged) {
          await handleMergedPR(payload)
        }
        break
    }
    res.status(200).json({ success: true, message: `${event} event processed successfully`, timestamp: new Date().toISOString() })
  } catch (error) {
    res.status(500).json({ error: 'Server error processing webhook', message: error.message })
  }
})

async function handleMergedPR(payload) {
  try {
    const pr = payload.pull_request
    const repository = payload.repository
    const bounty = await db.collection('bounties').findOne({
      repositoryFullName: repository.full_name,
      status: 'active'
    })
    if (!bounty) return
    const contributionData = {
      bountyId: bounty._id,
      contributor_username: pr.user.login,
      contributor_email: pr.user.email || null,
      contributor_id: pr.user.id,
      contributor_avatar: pr.user.avatar_url,
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
      created_at: new Date()
    }
    await db.collection('contributions').insertOne(contributionData)
    await db.collection('bounties').updateOne(
      { _id: bounty._id },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          completedBy: pr.user.login,
          contributionId: contributionData._id,
          updatedAt: new Date()
        }
      }
    )
  } catch (error) {
    console.error('Error handling merged PR:', error)
  }
}

app.get('/api/webhooks', handleClerkAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    const webhooks = await db.collection('webhooks').find({ userId }).sort({ createdAt: -1 }).toArray()
    res.json({ webhooks })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch webhooks', details: error.message })
  }
})

app.post('/api/bounties', handleClerkAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    const bountyData = {
      ...req.body,
      createdBy: userId,
      status: 'active',
      applicants: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    const result = await db.collection('bounties').insertOne(bountyData)
    res.json({ success: true, bountyId: result.insertedId })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create bounty', details: error.message })
  }
})

app.get('/api/bounties', handleClerkAuth, async (req, res) => {
  try {
    const bounties = await db.collection('bounties').find({ status: { $ne: 'completed' } }).sort({ createdAt: -1 }).toArray()
    res.json({ bounties })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bounties', details: error.message })
  }
})

app.get('/api/bounties/:id', handleClerkAuth, async (req, res) => {
  try {
    const bountyId = req.params.id
    const bounty = await db.collection('bounties').findOne({ _id: new ObjectId(bountyId) })
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' })
    }
    res.json({ bounty })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bounty', details: error.message })
  }
})

app.get('/api/my-bounties', handleClerkAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    const bounties = await db.collection('bounties').find({ createdBy: userId }).sort({ createdAt: -1 }).toArray()
    res.json({ bounties })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your bounties', details: error.message })
  }
})

app.patch('/api/bounties/:id/status', handleClerkAuth, async (req, res) => {
  try {
    const bountyId = req.params.id
    const { status } = req.body
    const userId = req.auth.userId
    const bounty = await db.collection('bounties').findOne({ _id: new ObjectId(bountyId) })
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' })
    }
    if (bounty.createdBy !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this bounty' })
    }
    await db.collection('bounties').updateOne(
      { _id: new ObjectId(bountyId) },
      { $set: { status, updatedAt: new Date() } }
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bounty status', details: error.message })
  }
})

app.delete('/api/bounties/:id', handleClerkAuth, async (req, res) => {
  try {
    const bountyId = req.params.id
    const userId = req.auth.userId
    const bounty = await db.collection('bounties').findOne({ _id: new ObjectId(bountyId) })
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
    res.status(500).json({ error: 'Failed to delete bounty', details: error.message })
  }
})

app.get('/api/bounties/:id/contributions', handleClerkAuth, async (req, res) => {
  try {
    const bountyId = req.params.id
    const contributions = await db.collection('contributions').find({ bountyId: new ObjectId(bountyId) }).sort({ created_at: -1 }).toArray()
    res.json({ contributions })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contributions', details: error.message })
  }
})

app.post('/api/bounties/:id/apply', handleClerkAuth, async (req, res) => {
  try {
    const bountyId = req.params.id
    const userId = req.auth.userId
    const bounty = await db.collection('bounties').findOne({ _id: new ObjectId(bountyId) })
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
        $push: { applicants: { userId, appliedAt: new Date(), status: 'pending' } },
        $set: { updatedAt: new Date() }
      }
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply for bounty', details: error.message })
  }
})

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload', message: err.message })
  }
  if (res.headersSent) {
    return next(err)
  }
  res.status(err.status || 500).json({ status: 'error', message: err.message || 'Internal Server Error' })
})

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.url })
})

async function startServer() {
  try {
    const client = await MongoClient.connect(mongoUrl)
    db = client.db(dbName)
    console.log('Connected to MongoDB')
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`)
      })
    }
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}

startServer()

export default app
