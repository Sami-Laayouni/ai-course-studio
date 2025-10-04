"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, TrendingUp, Wifi } from "lucide-react"
import { useRealtimeLeaderboard } from "@/hooks/use-realtime-leaderboard"

interface LeaderboardWidgetProps {
  courseId: string
  maxEntries?: number
  showRecentActivity?: boolean
  compact?: boolean
}

export function LeaderboardWidget({
  courseId,
  maxEntries = 5,
  showRecentActivity = false,
  compact = false,
}: LeaderboardWidgetProps) {
  const { leaderboard, recentActivity, isLoading } = useRealtimeLeaderboard(courseId)

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />
      default:
        return <span className="text-xs font-bold text-muted-foreground">#{rank}</span>
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded"></div>
                <div className="flex-1">
                  <div className="w-24 h-4 bg-muted rounded mb-1"></div>
                  <div className="w-16 h-3 bg-muted rounded"></div>
                </div>
                <div className="w-12 h-6 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className={`flex items-center gap-2 ${compact ? "text-base" : "text-lg"}`}>
            <Trophy className="h-5 w-5" />
            Top Students
            <Badge variant="outline" className="ml-auto bg-green-50 border-green-200 text-green-700">
              <Wifi className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaderboard.slice(0, maxEntries).map((entry) => (
            <div
              key={entry.student_id}
              className="flex items-center justify-between animate-in slide-in-from-left-2 duration-300"
            >
              <div className="flex items-center gap-3">
                {getRankIcon(entry.rank)}
                <div>
                  <p className={`font-medium ${compact ? "text-sm" : "text-sm"}`}>{entry.full_name}</p>
                  <p className="text-xs text-muted-foreground">{entry.activities_completed} activities completed</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {entry.total_points} pts
              </Badge>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No students yet</p>
          )}
        </CardContent>
      </Card>

      {showRecentActivity && recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={`flex items-center gap-2 ${compact ? "text-base" : "text-lg"}`}>
              <TrendingUp className="h-5 w-5" />
              Live Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.slice(0, 3).map((activity, index) => (
              <div
                key={`${activity.id}-${index}`}
                className="flex items-center justify-between animate-in slide-in-from-right-2 duration-300"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-sm">{activity.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{activity.activities?.title}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                  +{activity.points_earned}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
