import React, { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/components/theme-provider'
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
  Loader2,
  AlertCircle
} from 'lucide-react'

export default function Bounties() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const { theme } = useTheme()

  const [bounties, setBounties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [applyingBounty, setApplyingBounty] = useState(null)

  // Determine if dark mode is active
  const isDarkMode = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  // Select background image based on theme
  const backgroundImage = isDarkMode ? '/background.png' : '/background-light.jpg'

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
    <div
      className="min-h-screen py-8 px-4 transition-all duration-300"
      style={{
        backgroundImage: `url("${backgroundImage}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <main className="container mx-auto space-y-8">

        {/* Header block */}
        <div className="bg-card rounded-xl shadow-md p-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">

          {/* Left - Dashboard + Title */}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="hover:bg-accent hover:text-accent-foreground transition flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-extrabold flex items-center gap-2 pb-1">
                <Target className="w-8 h-8 text-primary" />
                <span className="border-b-4 border-primary">{`Bounties`}</span>
              </h1>
              <p className="text-muted-foreground mt-1 max-w-xs">
                Discover and apply for development bounties
              </p>
            </div>
          </div>

          {/* Right - Stats + Refresh */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 w-full lg:w-auto">

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
              {[
                { label: "Total", value: bounties.length, icon: <Target className="text-primary w-5 h-5" /> },
                { label: "Active", value: bounties.filter(b => b.status === "active").length, icon: <Clock className="text-green-600 w-5 h-5" /> },
                { label: "My Bounties", value: bounties.filter(b => b.createdBy === user?.id).length, icon: <User className="text-blue-600 w-5 h-5" /> },
                { label: "Applied", value: bounties.filter(hasApplied).length, icon: <Users className="text-purple-600 w-5 h-5" /> },
              ].map((stat) => (
                <Card
                  key={stat.label}
                  className="flex items-center justify-center min-w-[160px] h-24 rounded-2xl p-3 hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="flex items-center gap-2">
                    {stat.icon}
                    <p className="text-muted-foreground font-semibold text-sm">{stat.label}</p>
                    <p className="font-extrabold text-xl">{stat.value}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Refresh Button */}
            <Button
              onClick={loadBounties}
              disabled={loading}
              size="sm"
              className="rounded-xl shadow-md hover:shadow-lg transition transform hover:scale-105 flex items-center px-5"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Filter Card */}
        <Card className="rounded-2xl p-4 shadow-md bg-card">
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

        {/* Tags Container */}
        <Card className="rounded-2xl p-4 shadow-md bg-card">
          <div className="flex flex-wrap gap-2">
            {[
              "CSS","JavaScript","Rust","C#","Shell","TypeScript","Java","CMake",
              "Objective-C","C++","WebAssembly","Dockerfile","Lua","NT","MDX",
              "C","Plugin","Go","Thrift","PLpgSQL"
            ].map((tag) => (
              <Badge
                key={tag}
                className="bg-primary/20 text-primary cursor-pointer hover:bg-primary/30 transition"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Error alert */}
        {error && (
          <Alert variant="destructive" className="flex items-center gap-2 py-2 mt-4">
            <AlertCircle className="w-5 h-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Bounties grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredBounties.length === 0 ? (
          <Card className="rounded-2xl text-center flex flex-col items-center justify-center gap-2 p-8 bg-card shadow-md">
            <Target className="w-16 h-16 text-primary mb-2" />
            <p className="text-lg font-semibold text-foreground">
              {bounties.length === 0 ? 'No bounties available' : 'No bounties match your filters'}
            </p>
            <p className="text-lg text-muted-foreground text-center max-w-xs">
              {bounties.length === 0
                ? 'Be the first to create a bounty!'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            <Button 
              onClick={() => navigate("/dashboard")} 
              size="sm" 
              className="mt-4 h-10 rounded-xl px-6 flex items-center justify-center"
            >
              Go to Dashboard
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBounties.map((bounty) => (
              <Card key={bounty._id} className="rounded-2xl hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold line-clamp-2">{bounty.title}</CardTitle>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Github className="w-5 h-5" />
                        <span className="font-mono truncate">{bounty.repositoryFullName}</span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(bounty.status)}>{bounty.status}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <CardDescription className="line-clamp-3">{bounty.description}</CardDescription>

                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1 font-semibold text-green-600">
                      <DollarSign className="w-5 h-5" />
                      {bounty.amount || bounty.prize} {bounty.currency}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-5 h-5" />
                      {formatDate(bounty.deadline)}
                    </div>
                  </div>

                  {bounty.tasks?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Tasks</p>
                      <ul className="text-muted-foreground text-sm space-y-1">
                        {bounty.tasks.slice(0, 3).map((task, idx) => (
                          <li key={idx} className="flex gap-2 items-center">
                            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full shrink-0" />
                            {task}
                          </li>
                        ))}
                        {bounty.tasks.length > 3 && <li className="text-xs font-medium">+{bounty.tasks.length - 3} more</li>}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Users className="w-5 h-5" />
                    <span>{bounty.applicants?.length || 0} applicants</span>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 flex items-center justify-center" onClick={() => navigate(`/bounties/${bounty._id}`)}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Details
                    </Button>

                    {isOwnBounty(bounty) ? (
                      <Button size="sm" className="flex-1" disabled variant="secondary">
                        Your Bounty
                      </Button>
                    ) : hasApplied(bounty) ? (
                      <Button size="sm" className="flex-1 flex items-center justify-center" disabled variant="secondary">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Applied
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 flex items-center justify-center"
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
      </main>
    </div>
  )
}
