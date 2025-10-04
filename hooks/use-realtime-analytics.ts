"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface AnalyticsData {
  totalStudents: number
  totalPoints: number
  activeSessions: number
  recentCompletions: any[]
  objectiveProgress: any[]
  chatSessions: any[]
}

export function useRealtimeAnalytics(teacherId: string, selectedCourse?: string) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalStudents: 0,
    totalPoints: 0,
    activeSessions: 0,
    recentCompletions: [],
    objectiveProgress: [],
    chatSessions: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient()

  useEffect(() => {
    if (!teacherId) return

    let pointsChannel: RealtimeChannel
    let progressChannel: RealtimeChannel
    let chatChannel: RealtimeChannel

    const setupRealtimeSubscriptions = async () => {
      try {
        // Initial data load
        await loadAnalyticsData()

        // Subscribe to points changes
        pointsChannel = supabase
          .channel(`analytics-points-${teacherId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "student_points",
            },
            (payload) => {
              console.log("[v0] Points analytics update:", payload)
              loadAnalyticsData()
            },
          )
          .subscribe()

        // Subscribe to learning objective progress changes
        progressChannel = supabase
          .channel(`analytics-progress-${teacherId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "learning_objective_progress",
            },
            (payload) => {
              console.log("[v0] Learning objective progress update:", payload)
              loadAnalyticsData()
            },
          )
          .subscribe()

        // Subscribe to chat session changes
        chatChannel = supabase
          .channel(`analytics-chat-${teacherId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "ai_chat_sessions",
            },
            (payload) => {
              console.log("[v0] Chat session update:", payload)
              loadAnalyticsData()
            },
          )
          .subscribe()

        setIsLoading(false)
      } catch (err) {
        console.error("Error setting up analytics subscriptions:", err)
        setError("Failed to setup real-time analytics")
        setIsLoading(false)
      }
    }

    const loadAnalyticsData = async () => {
      try {
        // Get teacher's courses
        const { data: courses } = await supabase.from("courses").select("id, title").eq("teacher_id", teacherId)

        if (!courses || courses.length === 0) return

        const courseIds = selectedCourse ? [selectedCourse] : courses.map((c) => c.id)

        // Load points data
        const { data: pointsData } = await supabase
          .from("student_points")
          .select(`
            *,
            profiles(full_name),
            activities(title, activity_type),
            lessons(title)
          `)
          .in("course_id", courseIds)
          .order("earned_at", { ascending: false })
          .limit(50)

        // Load learning objective progress
        const { data: objectiveData } = await supabase
          .from("learning_objective_progress")
          .select(`
            *,
            profiles(full_name),
            courses(title),
            lessons(title)
          `)
          .in("course_id", courseIds)
          .order("last_assessed_at", { ascending: false })

        // Load chat sessions
        const { data: chatData } = await supabase
          .from("ai_chat_sessions")
          .select(`
            *,
            profiles(full_name),
            activities(title, course_id),
            lessons(title)
          `)
          .order("started_at", { ascending: false })
          .limit(20)

        const filteredChatData = chatData?.filter((session) => courseIds.includes(session.activities?.course_id)) || []

        // Calculate totals
        const totalStudents = new Set(pointsData?.map((p) => p.student_id)).size
        const totalPoints = pointsData?.reduce((sum, p) => sum + p.points_earned, 0) || 0
        const activeSessions = filteredChatData.filter((s) => s.session_status === "active").length

        setAnalyticsData({
          totalStudents,
          totalPoints,
          activeSessions,
          recentCompletions: pointsData || [],
          objectiveProgress: objectiveData || [],
          chatSessions: filteredChatData,
        })
      } catch (err) {
        console.error("Error loading analytics data:", err)
      }
    }

    setupRealtimeSubscriptions()

    return () => {
      if (pointsChannel) supabase.removeChannel(pointsChannel)
      if (progressChannel) supabase.removeChannel(progressChannel)
      if (chatChannel) supabase.removeChannel(chatChannel)
    }
  }, [teacherId, selectedCourse, supabase])

  return {
    analyticsData,
    isLoading,
    error,
  }
}
