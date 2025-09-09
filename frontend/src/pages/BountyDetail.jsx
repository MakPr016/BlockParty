import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  Edit2
} from 'lucide-react'

export default function BountyDetail() {
  const { id } = useParams()
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  
  const [bounty, setBounty] = useState(null)
  const [contributions, setContributions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [applyingBounty, setApplyingBounty] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadBountyDetails()
  }, [id])

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
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
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

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Bounty Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title and Description */}
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

              {/* Tasks */}
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

              {/* Additional Requirements */}
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

              {/* Completion Details */}
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
                        
                        <div className="bg-muted p-4 rounded-lg space-y-2">
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(contribution.pr_url, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Pull Request
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Prize and Actions */}
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

                    {/* Owner Actions */}
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

                    {/* Apply Button for Non-Owners */}
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

                    {/* Owner Status Message */}
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

              {/* Repository Info */}
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

              {/* Applicants */}
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
