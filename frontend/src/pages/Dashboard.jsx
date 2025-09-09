import { useState, useEffect, useMemo } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Github, 
  ExternalLink, 
  Plus, 
  Star, 
  GitFork, 
  FolderGit2,
  Webhook,
  Activity,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  X
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [repositories, setRepositories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)

  const [searchQuery, setSearchQuery] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [languageFilter, setLanguageFilter] = useState('all')
  
  const REPOS_PER_PAGE = 9

  const availableLanguages = useMemo(() => {
    const languages = [...new Set(
      repositories
        .map(repo => repo.language)
        .filter(Boolean)
    )].sort()
    return languages
  }, [repositories])

  const filteredRepositories = useMemo(() => {
    return repositories.filter(repo => {
      const matchesSearch = searchQuery === '' || 
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesVisibility = visibilityFilter === 'all' ||
        (visibilityFilter === 'public' && !repo.private) ||
        (visibilityFilter === 'private' && repo.private)

      const matchesLanguage = languageFilter === 'all' || repo.language === languageFilter
      
      return matchesSearch && matchesVisibility && matchesLanguage
    })
  }, [repositories, searchQuery, visibilityFilter, languageFilter])

  const totalPages = Math.ceil(filteredRepositories.length / REPOS_PER_PAGE)
  const startIndex = currentPage * REPOS_PER_PAGE
  const endIndex = startIndex + REPOS_PER_PAGE
  const currentRepositories = filteredRepositories.slice(startIndex, endIndex)

  const nextPage = () => {
    setCurrentPage(prev => (prev + 1) % totalPages)
  }

  const prevPage = () => {
    setCurrentPage(prev => (prev - 1 + totalPages) % totalPages)
  }

  const goToPage = (pageIndex) => {
    setCurrentPage(pageIndex)
  }

  useEffect(() => {
    setCurrentPage(0)
  }, [searchQuery, visibilityFilter, languageFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setVisibilityFilter('all')
    setLanguageFilter('all')
  }

  const hasActiveFilters = searchQuery !== '' || visibilityFilter !== 'all' || languageFilter !== 'all'

  useEffect(() => {
    loadRepositories()
  }, [])

  const loadRepositories = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/repositories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch repositories')
      }

      const data = await response.json()
      setRepositories(Array.isArray(data) ? data : data.repositories || [])
    } catch (err) {
      setError(err.message)
      setRepositories([])
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalRepos: repositories?.length || 0,
    publicRepos: repositories?.filter(r => !r.private).length || 0,
    privateRepos: repositories?.filter(r => r.private).length || 0,
    totalStars: repositories?.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0) || 0,
    filteredCount: filteredRepositories.length
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.firstName || 'there'}! 
            </h1>
            <p className="text-muted-foreground">
              Here's an overview of your GitHub repositories
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Repositories</CardTitle>
                <FolderGit2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRepos}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.publicRepos} public, {stats.privateRepos} private
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stars</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStars}</div>
                <p className="text-xs text-muted-foreground">
                  Across all repositories
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
                <Webhook className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Active webhooks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Activity</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">
                  Recent events
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Repositories Section with Search and Filters */}
          <Card>
            <CardHeader>
              <div className="flex flex-col space-y-4">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Your Repositories</CardTitle>
                    <CardDescription>
                      Manage webhooks for your GitHub repositories
                      {filteredRepositories.length !== repositories.length && (
                        <span className="ml-2 text-blue-600">
                          (Filtered: {filteredRepositories.length} of {repositories.length})
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={loadRepositories} 
                    disabled={loading} 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search repositories by name or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Repos</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={languageFilter} onValueChange={setLanguageFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        {availableLanguages.map(language => (
                          <SelectItem key={language} value={language}>
                            {language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={clearFilters}
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredRepositories.length)} of {filteredRepositories.length} repositories
                    </p>
                    
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={prevPage}
                        disabled={loading || currentPage === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageIndex;
                          if (totalPages <= 5) {
                            pageIndex = i;
                          } else if (currentPage <= 2) {
                            pageIndex = i;
                          } else if (currentPage >= totalPages - 3) {
                            pageIndex = totalPages - 5 + i;
                          } else {
                            pageIndex = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageIndex}
                              variant={currentPage === pageIndex ? "default" : "outline"}
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => goToPage(pageIndex)}
                              disabled={loading}
                            >
                              {pageIndex + 1}
                            </Button>
                          );
                        })}
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={nextPage}
                        disabled={loading || currentPage === totalPages - 1}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {loading && repositories.length === 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-32 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-red-500 mb-4">
                    <p>Error: {error}</p>
                  </div>
                  <Button onClick={loadRepositories} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </Button>
                </div>
              ) : filteredRepositories.length === 0 ? (
                <div className="text-center py-8">
                  <Filter className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {repositories.length === 0 ? 'No repositories found' : 'No repositories match your filters'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {repositories.length === 0 
                      ? 'Make sure you have repositories in your GitHub account'
                      : 'Try adjusting your search or filter criteria'
                    }
                  </p>
                  {hasActiveFilters && (
                    <Button onClick={clearFilters} variant="outline" className="gap-2">
                      <X className="w-4 h-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {currentRepositories.map((repo) => (
                    <Card key={repo.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Github className="w-4 h-4 flex-shrink-0" />
                            <CardTitle className="text-base truncate">{repo.name}</CardTitle>
                          </div>
                          <Badge variant={repo.private ? "secondary" : "outline"} className="ml-2">
                            {repo.private ? "Private" : "Public"}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                          {repo.description || "No description available"}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-4">
                              {repo.language && (
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  {repo.language}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {repo.stargazers_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <GitFork className="w-3 h-3" />
                                {repo.forks_count}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => window.open(repo.html_url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => {
                                console.log(`Create webhook for ${repo.full_name}`)
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Webhook
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
