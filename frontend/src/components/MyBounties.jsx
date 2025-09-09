import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  DollarSign, 
  Calendar, 
  Users, 
  Github, 
  ExternalLink,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react'

export default function MyBounties() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  
  const [bounties, setBounties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(null)

  useEffect(() => {
    loadMyBounties()
  }, [])

  const loadMyBounties = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/my-bounties`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch your bounties')
      }

      const data = await response.json()
      setBounties(data.bounties || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateBountyStatus = async (bountyId, status) => {
    try {
      setUpdatingStatus(bountyId)
      const token = await getToken()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bounties/${bountyId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error('Failed to update bounty status')
      }

      // Refresh bounties
      loadMyBounties()
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingStatus(null)
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
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          My Bounties
        </CardTitle>
        <CardDescription>
          Bounties you've created and their current status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {bounties.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bounties yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first bounty from the repositories page
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bounties.map((bounty) => (
              <div key={bounty._id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 
                        className="font-semibold cursor-pointer hover:text-primary"
                        onClick={() => navigate(`/bounties/${bounty._id}`)}
                      >
                        {bounty.title}
                      </h4>
                      <Badge className={getStatusColor(bounty.status)}>
                        {bounty.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Github className="w-4 h-4" />
                      <span className="font-mono">{bounty.repositoryFullName}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 font-semibold text-green-600">
                        <DollarSign className="w-4 h-4" />
                        {bounty.prize} {bounty.currency}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(bounty.deadline)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {bounty.applicants?.length || 0} applicants
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/bounties/${bounty._id}`)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    
                    {bounty.status === 'active' && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => updateBountyStatus(bounty._id, 'cancelled')}
                        disabled={updatingStatus === bounty._id}
                      >
                        {updatingStatus === bounty._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
