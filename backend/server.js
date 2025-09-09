const express = require('express')
const cors = require('cors')
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node')
const { clerkClient } = require('@clerk/clerk-sdk-node')
const { Octokit } = require('@octokit/core')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

if (!process.env.CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY is missing in .env file')
  process.exit(1)
}

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}))
app.use(express.json())

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    clerkConfigured: !!process.env.CLERK_SECRET_KEY
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
      return res.status(400).json({ 
        error: 'GitHub token not found. Please reconnect your GitHub account.' 
      })
    }

    const githubToken = oauthTokens[0].token
    const octokit = new Octokit({ auth: githubToken })
    
    const { data: repos } = await octokit.request('GET /user/repos', {
      sort: 'updated',
      per_page: 50,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    res.json({repositories: repos});
    
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

app.use((error, req, res, next) => {
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message 
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
})
