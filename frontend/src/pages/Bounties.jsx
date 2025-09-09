import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DollarSign,
  Calendar,
  User,
  Github,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Clock,
  Users,
  ArrowLeft,
  Target,
  Loader2
} from 'lucide-react'

export default function Bounties() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()

  const [bounties, setBounties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [applyingBounty, setApplyingBounty] = useState(null)

  useEffect(() => {
    loadBounties()
  }, [])

  const loadBounties = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bounties`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch bounties')
      }

      const data = await response.json()
      setBounties(data.bounties || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const applyForBounty = async (bountyId) => {
    try {
      setApplyingBounty(bountyId)
      const token = await getToken()

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bounties/${bountyId}/apply`, {
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

      // Refresh bounties
      loadBounties()

    } catch (err) {
      setError(err.message)
    } finally {
      setApplyingBounty(null)
    }
  }

  // Filter bounties
  const filteredBounties = bounties.filter(bounty => {
    const matchesSearch = searchQuery === '' ||
      bounty.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bounty.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bounty.repositoryFullName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || bounty.status === statusFilter

    return matchesSearch && matchesStatus
  })

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
    return new Date(dateString).toLocaleDateString()
  }

  const isOwnBounty = (bounty) => bounty.createdBy === user?.id
  const hasApplied = (bounty) => bounty.applicants?.some(applicant => applicant.userId === user?.id)

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Target className="w-8 h-8" />
                  Bounties
                </h1>
                <p className="text-muted-foreground">
                  Discover and apply for development bounties
                </p>
              </div>
            </div>
            <Button onClick={loadBounties} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search bounties by title, description, or repository..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Bounties</p>
                    <p className="text-2xl font-bold">{bounties.length}</p>
                  </div>
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold">{bounties.filter(b => b.status === 'active').length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">My Bounties</p>
                    <p className="text-2xl font-bold">{bounties.filter(b => b.createdBy === user?.id).length}</p>
                  </div>
                  <User className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Applied</p>
                    <p className="text-2xl font-bold">{bounties.filter(b => hasApplied(b)).length}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Bounties List */}
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-64 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : filteredBounties.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {bounties.length === 0 ? 'No bounties available' : 'No bounties match your filters'}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {bounties.length === 0
                    ? 'Be the first to create a bounty!'
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
                <Button onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredBounties.map((bounty) => (
                <Card key={bounty._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="line-clamp-2">{bounty.title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Github className="w-4 h-4" />
                          <span className="font-mono truncate">{bounty.repositoryFullName}</span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(bounty.status)}>
                        {bounty.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <CardDescription className="line-clamp-3">
                      {bounty.description}
                    </CardDescription>

                    {/* Prize and Deadline */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 font-semibold text-green-600">
                        <DollarSign className="w-4 h-4" />
                        {bounty.prize} {bounty.currency}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {formatDate(bounty.deadline)}
                      </div>
                    </div>

                    {/* Tasks */}
                    {bounty.tasks && bounty.tasks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Tasks:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {bounty.tasks.slice(0, 2).map((task, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0 mt-1.5" />
                              <span className="line-clamp-1">{task}</span>
                            </li>
                          ))}
                          {bounty.tasks.length > 2 && (
                            <li className="text-xs text-muted-foreground">
                              +{bounty.tasks.length - 2} more tasks
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Applicants */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{bounty.applicants?.length || 0} applicants</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/bounties/${bounty._id}`)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Details
                      </Button>

                      {isOwnBounty(bounty) ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled
                          variant="secondary"
                        >
                          Your Bounty
                        </Button>
                      ) : hasApplied(bounty) ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled
                          variant="secondary"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Applied
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => applyForBounty(bounty._id)}
                          disabled={applyingBounty === bounty._id || bounty.status !== 'active'}
                        >
                          {applyingBounty === bounty._id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            <>
                              <Target className="w-4 h-4 mr-2" />
                              Accept Bounty
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
