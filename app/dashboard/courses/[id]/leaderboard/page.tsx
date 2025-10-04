"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Trophy, Medal, Award, Users, TrendingUp, Maximize2, Minimize2, Wifi, WifiOff } from "lucide-react"
import Link from "next/link"
import { useRealtimeLeaderboard } from "@/hooks/use-realtime-leaderboard"

interface LeaderboardPageProps {
  params: Promise<{ id: string }>
}

export default function LeaderboardPage({ params }: LeaderboardPageProps) {
  const [courseId, setCourseId] = useState<string>("")
  const [course, setCourse] = useState<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("connecting")

  const supabase = createBrowserClient()

  // Initialize courseId from params
  useEffect(() => {
    params.then(({ id }) => setCourseId(id))
  }, [params])

  // Use realtime leaderboard hook
  const { leaderboard, recentActivity, isLoading, error } = useRealtimeLeaderboard(courseId)

  // Load course details
  useEffect(() => {
    if (!courseId) return

    const loadCourse = async () => {
      try {
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single()

        if (courseError || !courseData) {
          console.error("Course not found:", courseError)
          return
        }

        setCourse(courseData)
        setConnectionStatus("connected")
      } catch (error) {
        console.error("Error loading course:", error)
        setConnectionStatus("disconnected")
      }
    }

    loadCourse()
  }, [courseId, supabase])

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setConnectionStatus("connected")
    const handleOffline = () => setConnectionStatus("disconnected")

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white"
      case 3:
        return "bg-gradient-to-r from-amber-400 to-amber-600 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(!isFullscreen)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading real-time leaderboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button asChild>
              <Link href="/dashboard/courses">Back to Courses</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background ${isFullscreen ? "p-4" : ""}`}>
      <div className={`${isFullscreen ? "max-w-full" : "container mx-auto px-4 py-8"}`}>
        {/* Header */}
        {!isFullscreen && (
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/courses/${courseId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course
              </Link>
            </Button>
          </div>
        )}

        {/* Course Info & Controls */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`font-bold text-foreground ${isFullscreen ? "text-4xl" : "text-3xl"}`}>
              {course?.title} - Live Leaderboard
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              Real-time student rankings and achievements
              <Badge
                variant="outline"
                className={`ml-2 ${
                  connectionStatus === "connected"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : connectionStatus === "disconnected"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-yellow-50 border-yellow-200 text-yellow-700"
                }`}
              >
                {connectionStatus === "connected" ? (
                  <Wifi className="h-3 w-3 mr-1" />
                ) : (
                  <WifiOff className="h-3 w-3 mr-1" />
                )}
                {connectionStatus === "connected"
                  ? "Live"
                  : connectionStatus === "disconnected"
                    ? "Offline"
                    : "Connecting"}
              </Badge>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="leaderboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Live Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardContent className="p-8">
                  <div className="flex items-end justify-center gap-8">
                    {/* 2nd Place */}
                    <div className="text-center">
                      <div className="w-20 h-16 bg-gradient-to-t from-gray-300 to-gray-500 rounded-t-lg flex items-end justify-center mb-4">
                        <Medal className="h-8 w-8 text-white mb-2" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">{leaderboard[1]?.full_name}</h3>
                        <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-white">
                          {leaderboard[1]?.total_points} pts
                        </Badge>
                      </div>
                    </div>

                    {/* 1st Place */}
                    <div className="text-center">
                      <div className="w-24 h-20 bg-gradient-to-t from-yellow-400 to-yellow-600 rounded-t-lg flex items-end justify-center mb-4">
                        <Trophy className="h-10 w-10 text-white mb-2" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold text-xl">{leaderboard[0]?.full_name}</h3>
                        <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-lg px-4 py-1">
                          {leaderboard[0]?.total_points} pts
                        </Badge>
                      </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="text-center">
                      <div className="w-20 h-12 bg-gradient-to-t from-amber-400 to-amber-600 rounded-t-lg flex items-end justify-center mb-4">
                        <Award className="h-8 w-8 text-white mb-2" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">{leaderboard[2]?.full_name}</h3>
                        <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-white">
                          {leaderboard[2]?.total_points} pts
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Full Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Full Rankings
                  <Badge variant="outline" className="ml-auto">
                    Updates automatically
                  </Badge>
                </CardTitle>
                <CardDescription>All students ranked by total points earned</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.student_id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-500 ${
                        index < 3 ? "bg-gradient-to-r from-primary/5 to-secondary/5 animate-pulse" : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10">{getRankIcon(entry.rank)}</div>
                        <div>
                          <h4 className="font-semibold">{entry.full_name}</h4>
                          <p className="text-sm text-muted-foreground">{entry.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getRankBadgeColor(entry.rank)} text-lg px-3 py-1 mb-2`}>
                          {entry.total_points} pts
                        </Badge>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{entry.activities_completed} activities</span>
                          <span>{entry.lessons_completed} lessons</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {leaderboard.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No students yet</h3>
                      <p className="text-muted-foreground">Students will appear here once they start earning points</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Live Activity Feed
                  <div className="ml-auto flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-muted-foreground">Live updates</span>
                  </div>
                </CardTitle>
                <CardDescription>Real-time points earned by students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={`${activity.id}-${index}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 animate-in slide-in-from-top-2 duration-500"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className="font-medium">{activity.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.activities?.title || "Activity"}
                            {activity.lessons?.title && ` • ${activity.lessons.title}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                          +{activity.points_earned} pts
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.earned_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <div className="text-center py-12">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Waiting for activity...</h3>
                      <p className="text-muted-foreground">Student activity will appear here in real-time</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
