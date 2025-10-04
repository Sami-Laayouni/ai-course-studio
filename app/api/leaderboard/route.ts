import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("course_id")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Verify user has access to this course (teacher or enrolled student)
    const { data: courseAccess } = await supabase.from("courses").select("id, teacher_id").eq("id", courseId).single()

    if (!courseAccess) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const isTeacher = courseAccess.teacher_id === user.id

    // Check if student is enrolled
    if (!isTeacher) {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("student_id", user.id)
        .single()

      if (!enrollment) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Get leaderboard data
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from("course_leaderboard")
      .select("*")
      .eq("course_id", courseId)
      .order("rank", { ascending: true })
      .limit(limit)

    if (leaderboardError) {
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
    }

    // Get recent activity
    const { data: recentActivity, error: activityError } = await supabase
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

    if (activityError) {
      console.error("Recent activity error:", activityError)
    }

    // Calculate course stats
    const totalStudents = leaderboard?.length || 0
    const totalPoints = leaderboard?.reduce((sum, entry) => sum + entry.total_points, 0) || 0
    const averagePoints = totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0

    return NextResponse.json({
      leaderboard: leaderboard || [],
      recent_activity: recentActivity || [],
      stats: {
        total_students: totalStudents,
        total_points: totalPoints,
        average_points: averagePoints,
      },
    })
  } catch (error) {
    console.error("Leaderboard API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
