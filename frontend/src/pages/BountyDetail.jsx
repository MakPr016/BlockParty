import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { parseDiff, Diff, Hunk } from 'react-diff-view'
import 'react-diff-view/style/index.css'
import { 
  DollarSign, 
  Calendar, 
  User, 
  Github, 
  ArrowLeft,
  CheckCircle,
  Clock,
  Target,
  GitMerge,
  Plus,
  Minus,
  GitCommit,
  ExternalLink,
  Loader2,
  Trash,
  Edit2,
  Code,
  GitPullRequest,
  FileText,
  X
} from 'lucide-react'

const diffStyles = `
  .diff-gutter-insert {
    background-color: #1a1a1a !important;
    border-color: #22c55e !important;
    color: #22c55e !important;
  }
  
  .diff-gutter-delete {
    background-color: #1a1a1a !important;
    border-color: #ef4444 !important;
    color: #ef4444 !important;
  }
  
  .diff-gutter-normal {
    background-color: #1a1a1a !important;
    border-color: #374151 !important;
    color: #9ca3af !important;
  }
  
  .diff-code-insert {
    background-color: #1a1a1a !important;
    color: #22c55e !important;
  }
  
  .diff-code-delete {
    background-color: #1a1a1a !important;
    color: #ef4444 !important;
  }
  
  .diff-code-normal {
    background-color: #1a1a1a !important;
    color: #e5e7eb !important;
  }
  
  .diff-line {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
    font-size: 13px !important;
    line-height: 1.5 !important;
    background-color: #1a1a1a !important;
  }
  
  .diff-gutter {
    background-color: #1a1a1a !important;
    border-color: #374151 !important;
    color: #9ca3af !important;
    font-size: 12px !important;
  }
  
  .diff-widget {
    border: 1px solid #374151 !important;
    border-radius: 6px !important;
    overflow: hidden !important;
    background-color: #1a1a1a !important;
    width: 100% !important;
  }
  
  .diff-hunk-header {
    background-color: #1a1a1a !important;
    border-color: #374151 !important;
    color: #9ca3af !important;
    font-weight: 600 !important;
  }
  
  .diff-table {
    background-color: #1a1a1a !important;
    width: 100% !important;
    table-layout: fixed !important;
  }
  
  .diff-table td {
    background-color: #1a1a1a !important;
  }
  
  .diff-gutter-col {
    background-color: #1a1a1a !important;
    width: 40px !important;
  }
  
  .diff-code-col {
    background-color: #1a1a1a !important;
    width: calc(50% - 20px) !important;
  }
`

export default function BountyDetail() {
  const { id } = useParams()
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  
  const [bounty, setBounty] = useState(null)
  const [contributions, setContributions] = useState([])
  const [pullRequests, setPullRequests] = useState([])
  const [selectedPR, setSelectedPR] = useState(null)
  const [prDiff, setPrDiff] = useState(null)
  const [showDiff, setShowDiff] = useState(false)
  const [completedPRDiff, setCompletedPRDiff] = useState(null)
  const [loadingCompletedDiff, setLoadingCompletedDiff] = useState(false)
  const [showCompletedDiff, setShowCompletedDiff] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [applyingBounty, setApplyingBounty] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loadingPRs, setLoadingPRs] = useState(false)
  const [loadingDiff, setLoadingDiff] = useState(false)

  useEffect(() => {
    const styleSheet = document.createElement("style")
    styleSheet.innerText = diffStyles
    document.head.appendChild(styleSheet)
    
    return () => {
      document.head.removeChild(styleSheet)
    }
  }, [])

  useEffect(() => {
    loadBountyDetails()
  }, [id])

  useEffect(() => {
    if (bounty?.repositoryFullName) {
      loadPullRequests()
    }
  }, [bounty?.repositoryFullName])

  const loadBountyDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      
      const [bountyResponse, contributionsResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/bounties/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/bounties/${id}/contributions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ])

      if (!bountyResponse.ok) {
        throw new Error('Bounty not found')
      }

      const bountyData = await bountyResponse.json()
      const contributionsData = await contributionsResponse.json()
      
      setBounty(bountyData.bounty)
      setContributions(contributionsData.contributions || [])
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadPullRequests = async () => {
    if (!bounty?.repositoryFullName) return
    
    try {
      setLoadingPRs(true)
      const token = await getToken()
      const [owner, repo] = bounty.repositoryFullName.split('/')
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/repositories/${owner}/${repo}/pulls?state=all&per_page=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPullRequests(data.pulls || [])
      }
    } catch (err) {
      console.error('Error loading pull requests:', err)
    } finally {
      setLoadingPRs(false)
    }
  }

  const loadPRDiff = async (prNumber) => {
    if (!bounty?.repositoryFullName) return
    
    try {
      setLoadingDiff(true)
      const token = await getToken()
      const [owner, repo] = bounty.repositoryFullName.split('/')
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/repositories/${owner}/${repo}/pulls/${prNumber}/diff`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const files = parseDiff(data.diff)
        setPrDiff({ files, metadata: data.files })
        setShowDiff(true)
      }
    } catch (err) {
      console.error('Error loading PR diff:', err)
      setError('Failed to load pull request diff')
    } finally {
      setLoadingDiff(false)
    }
  }

  const loadCompletedPRDiff = async (contribution) => {
    if (!bounty?.repositoryFullName) return
    
    try {
      setLoadingCompletedDiff(true)
      const token = await getToken()
      const [owner, repo] = bounty.repositoryFullName.split('/')
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/repositories/${owner}/${repo}/pulls/${contribution.pr_number}/diff`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const files = parseDiff(data.diff)
        setCompletedPRDiff({ files, metadata: data.files, contribution })
        setShowCompletedDiff(true)
      }
    } catch (err) {
      console.error('Error loading completed PR diff:', err)
      setError('Failed to load pull request diff')
    } finally {
      setLoadingCompletedDiff(false)
    }
  }

  const applyForBounty = async () => {
    try {
      setApplyingBounty(true)
      const token = await getToken()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bounties/${id}/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to apply for bounty')
      }

      loadBountyDetails()
      
    } catch (err) {
      setError(err.message)
    } finally {
      setApplyingBounty(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this bounty? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      const token = await getToken()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bounties/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete bounty')
      }

      navigate('/bounties')
      
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const renderFile = (file, index) => (
    <div key={index} className="border border-gray-600 rounded-lg overflow-hidden bg-gray-900 w-full">
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-medium text-white">{file.newPath || file.oldPath}</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-green-400 bg-green-900 px-2 py-1 rounded">
              <Plus className="w-3 h-3" />
              {file.additionsCount || 0}
            </span>
            <span className="flex items-center gap-1 text-red-400 bg-red-900 px-2 py-1 rounded">
              <Minus className="w-3 h-3" />
              {file.deletionsCount || 0}
            </span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto bg-gray-900 w-full">
        <Diff viewType="split" diffType={file.type} hunks={file.hunks || []}>
          {(hunks) => 
            hunks && hunks.length > 0 
              ? hunks.map((hunk) => (
                  <Hunk key={hunk.content} hunk={hunk} />
                ))
              : <div className="p-4 text-gray-400 text-sm bg-gray-900">No changes to display</div>
          }
        </Diff>
      </div>
    </div>
  )

  const isOwnBounty = bounty?.createdBy === user?.id
  const hasApplied = bounty?.applicants?.some(applicant => applicant.userId === user?.id)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error || !bounty) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Button 
              variant="outline" 
              onClick={() => navigate('/bounties')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bounties
            </Button>
            <Alert variant="destructive">
              <AlertDescription>{error || 'Bounty not found'}</AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/bounties')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bounties
            </Button>
            <Badge className={getStatusColor(bounty.status)}>
              {bounty.status}
            </Badge>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-2xl">{bounty.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Github className="w-4 h-4" />
                        <span className="font-mono">{bounty.repositoryFullName}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {bounty.description}
                  </CardDescription>
                </CardContent>
              </Card>

              {bounty.tasks && bounty.tasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Tasks to Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {bounty.tasks.map((task, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium mt-0.5">
                            {index + 1}
                          </div>
                          <span className="flex-1">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {bounty.requirements && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {bounty.requirements}
                    </p>
                  </CardContent>
                </Card>
              )}

              {bounty.repositoryFullName && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitPullRequest className="w-5 h-5" />
                      Related Pull Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingPRs ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : pullRequests.length > 0 ? (
                      <div className="space-y-3">
                        {pullRequests.slice(0, 5).map((pr) => (
                          <div key={pr.number} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant={pr.state === 'open' ? 'default' : pr.merged_at ? 'secondary' : 'destructive'}>
                                    {pr.state === 'open' ? 'Open' : pr.merged_at ? 'Merged' : 'Closed'}
                                  </Badge>
                                  <span className="text-sm font-medium">#{pr.number}</span>
                                </div>
                                <h4 className="font-medium text-sm mb-1">{pr.title}</h4>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>by {pr.user.login}</span>
                                  <span>{formatDate(pr.created_at)}</span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPR(pr)
                                    loadPRDiff(pr.number)
                                  }}
                                  disabled={loadingDiff}
                                >
                                  {loadingDiff && selectedPR?.number === pr.number ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Code className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(pr.html_url, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No pull requests found</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {showDiff && prDiff && selectedPR && (
                <Card className="w-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        PR #{selectedPR.number} - {selectedPR.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowDiff(false)
                          setSelectedPR(null)
                          setPrDiff(null)
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-4 p-6">
                      <div className="flex items-center gap-4 text-sm border-b pb-3">
                        <span className="flex items-center gap-1 text-green-400 bg-green-900 px-2 py-1 rounded">
                          <Plus className="w-3 h-3" />
                          {prDiff.metadata.reduce((sum, file) => sum + file.additions, 0)} additions
                        </span>
                        <span className="flex items-center gap-1 text-red-400 bg-red-900 px-2 py-1 rounded">
                          <Minus className="w-3 h-3" />
                          {prDiff.metadata.reduce((sum, file) => sum + file.deletions, 0)} deletions
                        </span>
                        <span className="text-gray-300">{prDiff.files.length} files changed</span>
                      </div>
                      <div className="space-y-4 max-h-[600px] overflow-y-auto w-full">
                        {prDiff.files.map(renderFile)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {bounty.status === 'completed' && contributions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Bounty Completed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {contributions.map((contribution, index) => (
                      <div key={index} className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={contribution.contributor_avatar} />
                            <AvatarFallback>
                              {contribution.contributor_username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-semibold">{contribution.contributor_username}</h4>
                            <p className="text-sm text-muted-foreground">
                              Completed on {formatDate(contribution.merged_at)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-muted p-4 rounded-lg space-y-3">
                          <div className="flex items-center gap-2">
                            <GitMerge className="w-4 h-4" />
                            <span className="font-medium">Pull Request #{contribution.pr_number}</span>
                          </div>
                          <p className="text-sm">{contribution.pr_title}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Plus className="w-3 h-3 text-green-600" />
                              {contribution.pr_additions}
                            </span>
                            <span className="flex items-center gap-1">
                              <Minus className="w-3 h-3 text-red-600" />
                              {contribution.pr_deletions}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitCommit className="w-3 h-3" />
                              {contribution.pr_commits} commit{contribution.pr_commits !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => window.open(contribution.pr_url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Pull Request
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => loadCompletedPRDiff(contribution)}
                              disabled={loadingCompletedDiff}
                            >
                              {loadingCompletedDiff ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <Code className="w-4 h-4 mr-2" />
                                  View Code Changes
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {showCompletedDiff && completedPRDiff && (
                <Card className="w-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Completed PR #{completedPRDiff.contribution.pr_number} - Code Changes
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCompletedDiff(false)
                          setCompletedPRDiff(null)
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-4 p-6">
                      <div className="flex items-center gap-4 text-sm border-b pb-3">
                        <span className="flex items-center gap-1 text-green-400 bg-green-900 px-2 py-1 rounded">
                          <Plus className="w-3 h-3" />
                          {completedPRDiff.metadata.reduce((sum, file) => sum + file.additions, 0)} additions
                        </span>
                        <span className="flex items-center gap-1 text-red-400 bg-red-900 px-2 py-1 rounded">
                          <Minus className="w-3 h-3" />
                          {completedPRDiff.metadata.reduce((sum, file) => sum + file.deletions, 0)} deletions
                        </span>
                        <span className="text-gray-300">{completedPRDiff.files.length} files changed</span>
                      </div>
                      <div className="space-y-4 max-h-[600px] overflow-y-auto w-full">
                        {completedPRDiff.files.map(renderFile)}
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Completed by {completedPRDiff.contribution.contributor_username}</span>
                          <span>•</span>
                          <span>Merged on {formatDate(completedPRDiff.contribution.merged_at)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 flex items-center justify-center gap-1">
                        <DollarSign className="w-6 h-6" />
                        {bounty.prize} {bounty.currency}
                      </div>
                      <p className="text-sm text-muted-foreground">Prize Amount</p>
                    </div>

                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Deadline: {formatDate(bounty.deadline)}</span>
                    </div>

                    {isOwnBounty && bounty.status !== 'completed' && (
                      <div className="pt-4 space-y-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => navigate(`/bounties/${id}/edit`)}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit Bounty
                        </Button>
                        <Button 
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={handleDelete}
                          disabled={deleting}
                        >
                          {deleting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash className="w-4 h-4 mr-2" />
                              Delete Bounty
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {bounty.status === 'active' && !isOwnBounty && (
                      <div className="pt-4">
                        {hasApplied ? (
                          <Button disabled variant="secondary" className="w-full">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Applied
                          </Button>
                        ) : (
                          <Button 
                            onClick={applyForBounty} 
                            disabled={applyingBounty}
                            className="w-full"
                          >
                            {applyingBounty ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Applying...
                              </>
                            ) : (
                              <>
                                <Target className="w-4 h-4 mr-2" />
                                Apply for Bounty
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}

                    {isOwnBounty && bounty.status === 'active' && (
                      <div className="pt-4">
                        <Button disabled variant="secondary" className="w-full">
                          Your Bounty
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Repository</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    <span className="font-mono text-sm">{bounty.repositoryFullName}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => window.open(`https://github.com/${bounty.repositoryFullName}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Repository
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Applicants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>{bounty.applicants?.length || 0} applicants</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
