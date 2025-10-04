"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Users, BookOpen, Clock, Award, AlertCircle, Loader2, Target, Brain, Trophy } from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
  teacher_id: string
  enrollments?: Array<{
    student: { id: string; full_name: string }
    enrolled_at: string
    progress: number
    last_activity_at: string
  }>
  activities?: Array<{
    id: string
    title: string
    type: string
    estimated_duration: number
  }>
  lessons?: Array<{
    id: string
    title: string
    learning_objectives: string[]
    activities: { count: number }
  }>
}

interface RecentProgress {
  id: string
  score: number
  completed_at: string
  activity: { title: string; type: string }
  student: { full_name: string }
  course: { title: string }
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [recentProgress, setRecentProgress] = useState<RecentProgress[]>([])
  const [learningObjectives, setLearningObjectives] = useState<any[]>([])
  const [objectiveProgress, setObjectiveProgress] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [pointsData, setPointsData] = useState<any[]>([])
  const [chatSessions, setChatSessions] = useState<any[]>([])
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        if (profile?.role !== "teacher") {
          router.push("/learn")
          return
        }

        const { data: coursesData } = await supabase
          .from("courses")
          .select(`
            *,
            enrollments:course_enrollments(
              student:profiles!course_enrollments_student_id_fkey(id, full_name),
              enrolled_at,
              progress,
              last_activity_at
            ),
            activities(id, title, type, estimated_duration),
            lessons(
              id, title, learning_objectives,
              activities(count)
            )
          `)
          .eq("teacher_id", user.id)

        setCourses(coursesData || [])

        await loadLearningObjectivesData(coursesData || [], user.id)

        await loadEngagementData(coursesData || [])

        const activityIds = coursesData?.flatMap((c) => c.activities?.map((a) => a.id) || []) || []
        if (activityIds.length > 0) {
          const { data: progressData } = await supabase
            .from("student_progress")
            .select(`
              *,
              activity:activities(title, type),
              student:profiles!student_progress_student_id_fkey(full_name),
              course:courses!activities_course_id_fkey(title)
            `)
            .in("activity_id", activityIds)
            .order("completed_at", { ascending: false })
            .limit(10)

          setRecentProgress(progressData || [])
        }
      } catch (error) {
        console.error("Error loading analytics data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase, router])

  const loadLearningObjectivesData = async (coursesData: Course[], teacherId: string) => {
    try {
      const allObjectives: any[] = []
      coursesData.forEach((course) => {
        course.lessons?.forEach((lesson) => {
          lesson.learning_objectives?.forEach((objective: string) => {
            allObjectives.push({
              course_id: course.id,
              course_title: course.title,
              lesson_id: lesson.id,
              lesson_title: lesson.title,
              objective: objective,
            })
          })
        })
      })
      setLearningObjectives(allObjectives)

      const courseIds = coursesData.map((c) => c.id)
      if (courseIds.length > 0) {
        const { data: progressData } = await supabase
          .from("learning_objective_progress")
          .select(`
            *,
            profiles(full_name, email),
            courses(title),
            lessons(title)
          `)
          .in("course_id", courseIds)
          .order("last_assessed_at", { ascending: false })

        setObjectiveProgress(progressData || [])
      }
    } catch (error) {
      console.error("Error loading learning objectives data:", error)
    }
  }

  const loadEngagementData = async (coursesData: Course[]) => {
    try {
      const courseIds = coursesData.map((c) => c.id)
      if (courseIds.length === 0) return

      const { data: pointsData } = await supabase
        .from("student_points")
        .select(`
          *,
          profiles(full_name),
          courses(title),
          activities(title, activity_type),
          lessons(title)
        `)
        .in("course_id", courseIds)
        .order("earned_at", { ascending: false })
        .limit(100)

      setPointsData(pointsData || [])

      const { data: chatData } = await supabase
        .from("ai_chat_sessions")
        .select(`
          *,
          profiles(full_name),
          activities(title, course_id),
          lessons(title)
        `)
        .order("started_at", { ascending: false })
        .limit(50)

      const filteredChatData = chatData?.filter((session) => courseIds.includes(session.activities?.course_id)) || []

      setChatSessions(filteredChatData)
    } catch (error) {
      console.error("Error loading engagement data:", error)
    }
  }

  const getObjectiveMasteryStats = () => {
    const filteredProgress =
      selectedCourse === "all" ? objectiveProgress : objectiveProgress.filter((p) => p.course_id === selectedCourse)

    const totalObjectives =
      selectedCourse === "all"
        ? learningObjectives.length
        : learningObjectives.filter((obj) => obj.course_id === selectedCourse).length

    const masteredCount = filteredProgress.filter((p) => p.mastery_level >= 80).length
    const strugglingCount = filteredProgress.filter((p) => p.mastery_level < 60).length
    const inProgressCount = filteredProgress.filter((p) => p.mastery_level >= 60 && p.mastery_level < 80).length

    return {
      total: totalObjectives,
      mastered: masteredCount,
      struggling: strugglingCount,
      inProgress: inProgressCount,
      masteryRate: totalObjectives > 0 ? (masteredCount / totalObjectives) * 100 : 0,
    }
  }

  const getObjectiveProgressByLesson = () => {
    const filteredProgress =
      selectedCourse === "all" ? objectiveProgress : objectiveProgress.filter((p) => p.course_id === selectedCourse)

    const lessonStats = new Map()

    filteredProgress.forEach((progress) => {
      const lessonKey = `${progress.lessons?.title || "Unknown Lesson"}`
      if (!lessonStats.has(lessonKey)) {
        lessonStats.set(lessonKey, {
          lesson: lessonKey,
          totalStudents: 0,
          averageMastery: 0,
          masteredCount: 0,
          strugglingCount: 0,
        })
      }

      const stats = lessonStats.get(lessonKey)
      stats.totalStudents += 1
      stats.averageMastery += progress.mastery_level
      if (progress.mastery_level >= 80) stats.masteredCount += 1
      if (progress.mastery_level < 60) stats.strugglingCount += 1
    })

    return Array.from(lessonStats.values()).map((stats) => ({
      ...stats,
      averageMastery: stats.totalStudents > 0 ? stats.averageMastery / stats.totalStudents : 0,
    }))
  }

  const getTopPerformingObjectives = () => {
    const objectiveStats = new Map()

    objectiveProgress.forEach((progress) => {
      const objective = progress.learning_objective
      if (!objectiveStats.has(objective)) {
        objectiveStats.set(objective, {
          objective,
          totalAttempts: 0,
          averageMastery: 0,
          masteredCount: 0,
        })
      }

      const stats = objectiveStats.get(objective)
      stats.totalAttempts += 1
      stats.averageMastery += progress.mastery_level
      if (progress.mastery_level >= 80) stats.masteredCount += 1
    })

    return Array.from(objectiveStats.values())
      .map((stats) => ({
        ...stats,
        averageMastery: stats.totalAttempts > 0 ? stats.averageMastery / stats.totalAttempts : 0,
        masteryRate: stats.totalAttempts > 0 ? (stats.masteredCount / stats.totalAttempts) * 100 : 0,
      }))
      .sort((a, b) => b.masteryRate - a.masteryRate)
      .slice(0, 10)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  const totalStudents = courses.reduce((acc, course) => acc + (course.enrollments?.length || 0), 0)
  const totalCourses = courses.length
  const totalActivities = courses.reduce((acc, course) => acc + (course.activities?.length || 0), 0)

  const allEnrollments = courses.flatMap((course) => course.enrollments || [])
  const averageProgress =
    allEnrollments.length > 0
      ? allEnrollments.reduce((acc, enrollment) => acc + (enrollment.progress || 0), 0) / allEnrollments.length
      : 0

  const courseProgressData = courses.map((course) => ({
    name: course.title,
    students: course.enrollments?.length || 0,
    avgProgress:
      course.enrollments?.length > 0
        ? course.enrollments.reduce((acc, e) => acc + (e.progress || 0), 0) / course.enrollments.length
        : 0,
  }))

  const activityTypeData = [
    {
      name: "Quiz",
      value: courses.reduce((acc, c) => acc + (c.activities?.filter((a) => a.type === "quiz").length || 0), 0),
    },
    {
      name: "Reading",
      value: courses.reduce((acc, c) => acc + (c.activities?.filter((a) => a.type === "reading").length || 0), 0),
    },
    {
      name: "Assignment",
      value: courses.reduce((acc, c) => acc + (c.activities?.filter((a) => a.type === "assignment").length || 0), 0),
    },
  ]

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"]

  const objectiveStats = getObjectiveMasteryStats()
  const lessonProgressData = getObjectiveProgressByLesson()
  const topObjectives = getTopPerformingObjectives()

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track student progress and learning objective mastery</p>
        </div>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across all courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground">Currently teaching</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
            <p className="text-xs text-muted-foreground">Learning activities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Objectives</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{objectiveStats.total}</div>
            <p className="text-xs text-muted-foreground">{Math.round(objectiveStats.masteryRate)}% mastered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Chat Sessions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chatSessions.length}</div>
            <p className="text-xs text-muted-foreground">Active conversations</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="objectives">Learning Objectives</TabsTrigger>
          <TabsTrigger value="engagement">Student Engagement</TabsTrigger>
          <TabsTrigger value="courses">Course Performance</TabsTrigger>
          <TabsTrigger value="students">Student Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Progress Overview</CardTitle>
                <CardDescription>Average progress by course</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={courseProgressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgProgress" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Distribution</CardTitle>
                <CardDescription>Types of activities created</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={activityTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activityTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest student completions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentProgress.map((progress, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <div>
                        <p className="font-medium">{progress.student?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Completed "{progress.activity?.title}" in {progress.course?.title}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={progress.score >= 80 ? "default" : progress.score >= 60 ? "secondary" : "destructive"}
                      >
                        {progress.score}%
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(progress.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objectives" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Objective Mastery Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Mastered</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{objectiveStats.mastered}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">In Progress</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">{objectiveStats.inProgress}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="font-medium">Need Support</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">{objectiveStats.struggling}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Progress by Lesson</CardTitle>
                <CardDescription>Average mastery level for each lesson</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={lessonProgressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="lesson" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="averageMastery" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Learning Objectives</CardTitle>
              <CardDescription>Objectives with highest mastery rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topObjectives.map((objective, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{objective.objective}</p>
                      <p className="text-sm text-muted-foreground">
                        {objective.totalAttempts} students • {objective.masteredCount} mastered
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Progress value={objective.masteryRate} className="w-24" />
                      <Badge
                        variant={
                          objective.masteryRate >= 80
                            ? "default"
                            : objective.masteryRate >= 60
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {Math.round(objective.masteryRate)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Points Distribution
                </CardTitle>
                <CardDescription>Points earned across different activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pointsData.slice(0, 10).map((point, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{point.profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {point.activities?.title} • {point.courses?.title}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                        +{point.points_earned} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Chat Activity
                </CardTitle>
                <CardDescription>Recent AI tutoring sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chatSessions.slice(0, 10).map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{session.profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {session.activities?.title} • {session.total_messages} messages
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={session.session_status === "completed" ? "default" : "secondary"}>
                          {session.session_status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {session.concepts_mastered?.length || 0} concepts mastered
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          <div className="grid gap-6">
            {courses.map((course) => (
              <Card key={course.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{course.title}</CardTitle>
                      <CardDescription>{course.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{course.enrollments?.length || 0} students</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{course.enrollments?.length || 0}</div>
                      <p className="text-sm text-muted-foreground">Enrolled</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {Math.round(
                          course.enrollments?.reduce((acc, e) => acc + (e.progress || 0), 0) /
                            (course.enrollments?.length || 1),
                        )}
                        %
                      </div>
                      <p className="text-sm text-muted-foreground">Avg Progress</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{course.activities?.length || 0}</div>
                      <p className="text-sm text-muted-foreground">Activities</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Student Progress</h4>
                    {course.enrollments?.map((enrollment, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{enrollment.student?.full_name}</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={enrollment.progress || 0} className="w-24" />
                          <span className="text-sm text-muted-foreground w-12">{enrollment.progress || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Performance Overview</CardTitle>
              <CardDescription>Individual student progress across all courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allEnrollments.map((enrollment, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{enrollment.student?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Last active:{" "}
                          {enrollment.last_activity_at
                            ? new Date(enrollment.last_activity_at).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Progress value={enrollment.progress || 0} className="w-32 mb-1" />
                        <p className="text-sm text-muted-foreground">{enrollment.progress || 0}% complete</p>
                      </div>
                      <Badge
                        variant={
                          (enrollment.progress || 0) >= 80
                            ? "default"
                            : (enrollment.progress || 0) >= 60
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {(enrollment.progress || 0) >= 80
                          ? "Excellent"
                          : (enrollment.progress || 0) >= 60
                            ? "Good"
                            : "Needs Help"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
