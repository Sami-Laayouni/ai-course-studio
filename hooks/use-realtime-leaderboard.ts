"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface LeaderboardEntry {
  student_id: string
  full_name: string
  email: string
  total_points: number
  activities_completed: number
  lessons_completed: number
  last_activity_at: string
  rank: number
}

interface RecentActivity {
  id: string
  student_id: string
  course_id: string
  activity_id: string
  points_earned: number
  earned_at: string
  profiles?: { full_name: string }
  activities?: { title: string; activity_type: string }
  lessons?: { title: string }
}

export function useRealtimeLeaderboard(courseId: string) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient()

  useEffect(() => {
    if (!courseId) return

    let leaderboardChannel: RealtimeChannel
    let pointsChannel: RealtimeChannel

    const setupRealtimeSubscriptions = async () => {
      try {
        // Initial data load
        await loadLeaderboard()
        await loadRecentActivity()

        // Subscribe to leaderboard changes (view updates)
        leaderboardChannel = supabase
          .channel(`leaderboard-${courseId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "course_leaderboard",
              filter: `course_id=eq.${courseId}`,
            },
            (payload) => {
              console.log("[v0] Leaderboard update received:", payload)
              loadLeaderboard()
            },
          )
          .subscribe()

        // Subscribe to points changes for real-time activity feed
        pointsChannel = supabase
          .channel(`points-${courseId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "student_points",
              filter: `course_id=eq.${courseId}`,
            },
            (payload) => {
              console.log("[v0] New points earned:", payload)
              loadRecentActivity()
              loadLeaderboard() // Refresh leaderboard when points change
            },
          )
          .subscribe()

        setIsLoading(false)
      } catch (err) {
        console.error("Error setting up realtime subscriptions:", err)
        setError("Failed to setup real-time updates")
        setIsLoading(false)
      }
    }

    const loadLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from("course_leaderboard")
          .select("*")
          .eq("course_id", courseId)
          .order("rank", { ascending: true })
          .limit(50)

        if (error) {
          console.error("Leaderboard error:", error)
          return
        }

        setLeaderboard(data || [])
      } catch (err) {
        console.error("Error loading leaderboard:", err)
      }
    }

    const loadRecentActivity = async () => {
      try {
        const { data, error } = await supabase
          .from("student_points")
          .select(`
            *,
            profiles(full_name, email),
            activities(title, activity_type),
            lessons(title)
          `)
          .eq("course_id", courseId)
          .order("earned_at", { ascending: false })
          .limit(20)

        if (error) {
          console.error("Recent activity error:", error)
          return
        }

        setRecentActivity(data || [])
      } catch (err) {
        console.error("Error loading recent activity:", err)
      }
    }

    setupRealtimeSubscriptions()

    return () => {
      if (leaderboardChannel) {
        supabase.removeChannel(leaderboardChannel)
      }
      if (pointsChannel) {
        supabase.removeChannel(pointsChannel)
      }
    }
  }, [courseId, supabase])

  return {
    leaderboard,
    recentActivity,
    isLoading,
    error,
  }
}
