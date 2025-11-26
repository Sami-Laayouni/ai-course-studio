import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Play, CheckCircle, Clock, Target, BookOpen } from "lucide-react"
import Link from "next/link"

interface CoursePageProps {
  params: Promise<{ id: string }>
}

export default async function StudentCoursePage({ params }: CoursePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if student is enrolled in this course
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*")
    .eq("student_id", data.user.id)
    .eq("course_id", id)
    .single()

  if (!enrollment) {
    notFound()
  }

  // Get course details
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single()

  if (!course) {
    notFound()
  }

  // Get all activities directly from course (including those in lessons)
  // This ensures activities are visible even if lessons aren't published
  const { data: allActivitiesData } = await supabase
    .from("activities")
    .eq("is_published", true) // Only show published activities to students
    .select(`
      id, title, description, activity_type, difficulty_level,
      estimated_duration, order_index, points, lesson_id,
      lessons(id, title, description, order_index)
    `)
    .eq("course_id", id)
    .order("order_index", { ascending: true })

  // Get all lessons for context (even unpublished ones for lesson titles)
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, description, order_index, is_published")
    .eq("course_id", id)
    .order("order_index", { ascending: true })

  // Collect all activities with lesson context
  const allActivities: any[] = []
  
  // Create a map of lesson titles for context
  const lessonMap = new Map()
  lessons?.forEach((lesson) => {
    lessonMap.set(lesson.id, lesson)
  })

  // Add all activities with lesson context
  allActivitiesData?.forEach((activity) => {
    const lesson = activity.lesson_id ? lessonMap.get(activity.lesson_id) : null
    allActivities.push({
      ...activity,
      lesson_title: lesson?.title || (activity.lessons as any)?.title || null,
      lesson_id: activity.lesson_id || null
    })
  })

  // Get student progress for all activities in this course
  const { data: progressData } = await supabase
    .from("student_progress")
    .select("*")
    .eq("student_id", data.user.id)
    .eq("course_id", id)

  // Create progress map for easy lookup
  const progressMap = new Map()
  progressData?.forEach((p) => {
    progressMap.set(p.activity_id, p)
  })

  // Sort activities by order (first by lesson order, then by activity order)
  const sortedActivities = allActivities.sort((a, b) => {
    if (a.lesson_id && b.lesson_id && a.lesson_id !== b.lesson_id) {
      const lessonA = lessons?.find(l => l.id === a.lesson_id)
      const lessonB = lessons?.find(l => l.id === b.lesson_id)
      if (lessonA && lessonB) {
        return (lessonA.order_index || 0) - (lessonB.order_index || 0)
      }
    }
    return (a.order_index || 0) - (b.order_index || 0)
  })

  // Calculate overall progress
  const completedActivities = progressData?.filter((p) => p.status === "completed").length || 0
  const totalActivities = sortedActivities.length
  const overallProgress = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/learn">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Courses
            </Link>
          </Button>
        </div>

        {/* Course Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">{course.title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground mb-4">
                <Badge variant="outline">{course.subject}</Badge>
                <Badge variant="outline">{course.grade_level}</Badge>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {totalActivities} activities
                </span>
              </div>
              {course.description && <p className="text-muted-foreground mb-4">{course.description}</p>}

              {/* Learning Objectives */}
              {course.learning_objectives && course.learning_objectives.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">What you'll learn</h3>
                  <ul className="space-y-1">
                    {course.learning_objectives.map((objective, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Progress Card */}
            <div className="lg:w-80">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Progress</CardTitle>
                  <CardDescription>
                    {completedActivities} of {totalActivities} activities completed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>Overall Progress</span>
                        <span className="font-medium">{overallProgress}%</span>
                      </div>
                      <Progress value={overallProgress} className="h-3" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-2xl font-bold text-green-600">{completedActivities}</div>
                        <div className="text-muted-foreground">Completed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{totalActivities - completedActivities}</div>
                        <div className="text-muted-foreground">Remaining</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Activities List */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Course Activities</h2>
          
          {lessons && lessons.length > 0 ? (
            <div className="space-y-8">
              {lessons.map((lesson) => {
                const lessonActivities = sortedActivities.filter(a => a.lesson_id === lesson.id)
                if (lessonActivities.length === 0) return null

                return (
                  <div key={lesson.id} className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">{lesson.title}</h3>
                      {lesson.description && (
                        <p className="text-sm text-muted-foreground">{lesson.description}</p>
                      )}
                    </div>
                    <div className="space-y-4 ml-8">
                      {lessonActivities.map((activity, index) => {
                        const progress = progressMap.get(activity.id)
                        const isCompleted = progress?.status === "completed"
                        const isInProgress = progress?.status === "in_progress"
                        const prevActivity = index > 0 ? lessonActivities[index - 1] : null
                        const prevProgress = prevActivity ? progressMap.get(prevActivity.id) : null
                        const isLocked = index > 0 && prevProgress?.status !== "completed"

                        return (
                          <Card key={activity.id} className={`${isLocked ? "opacity-60" : "hover:shadow-md"} transition-all`}>
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                {/* Activity Number & Status */}
                                <div className="flex-shrink-0">
                                  <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                                      isCompleted
                                        ? "bg-green-100 text-green-600"
                                        : isInProgress
                                          ? "bg-blue-100 text-blue-600"
                                          : isLocked
                                            ? "bg-gray-100 text-gray-400"
                                            : "bg-primary/10 text-primary"
                                    }`}
                                  >
                                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : index + 1}
                                  </div>
                                </div>

                                {/* Activity Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h3 className="text-lg font-semibold mb-1">{activity.title}</h3>
                                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <Badge variant="outline" className="text-xs">
                                          {activity.activity_type}
                                        </Badge>
                                        {activity.estimated_duration && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {activity.estimated_duration} min
                                          </span>
                                        )}
                                        {activity.difficulty_level && (
                                          <span>Difficulty: {activity.difficulty_level}/5</span>
                                        )}
                                        {activity.points > 0 && (
                                          <Badge variant="secondary" className="text-xs">
                                            {activity.points} pts
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {progress?.score && (
                                        <Badge variant="outline" className="text-green-600">
                                          {progress.score}%
                                        </Badge>
                                      )}
                                      <Button
                                        size="sm"
                                        disabled={isLocked}
                                        variant={isCompleted ? "outline" : "default"}
                                        asChild={!isLocked}
                                      >
                                        {isLocked ? (
                                          "Locked"
                                        ) : (
                                          <Link href={`/learn/activities/${activity.id}`}>
                                            {isCompleted ? "Review" : isInProgress ? "Continue" : "Start"}
                                            <Play className="h-4 w-4 ml-2" />
                                          </Link>
                                        )}
                                      </Button>
                                    </div>
                                  </div>

                                  {activity.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
                                  )}

                                  {/* Progress Bar for In-Progress Activities */}
                                  {isInProgress && progress && (
                                    <div className="mt-3">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span>{progress.attempts || 0} attempts</span>
                                      </div>
                                      <Progress value={50} className="h-1" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              
              {/* Direct course activities (not in lessons) */}
              {(() => {
                const directActivities = sortedActivities.filter(a => !a.lesson_id)
                if (directActivities.length === 0) return null
                
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">Course Activities</h3>
                    </div>
                    <div className="space-y-4 ml-8">
                      {directActivities.map((activity, index) => {
                        const progress = progressMap.get(activity.id)
                        const isCompleted = progress?.status === "completed"
                        const isInProgress = progress?.status === "in_progress"
                        const prevActivity = index > 0 ? directActivities[index - 1] : null
                        const prevProgress = prevActivity ? progressMap.get(prevActivity.id) : null
                        const isLocked = index > 0 && prevProgress?.status !== "completed"

                      return (
                        <Card key={activity.id} className={`${isLocked ? "opacity-60" : "hover:shadow-md"} transition-all`}>
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                                    isCompleted
                                      ? "bg-green-100 text-green-600"
                                      : isInProgress
                                        ? "bg-blue-100 text-blue-600"
                                        : isLocked
                                          ? "bg-gray-100 text-gray-400"
                                          : "bg-primary/10 text-primary"
                                  }`}
                                >
                                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : index + 1}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h3 className="text-lg font-semibold mb-1">{activity.title}</h3>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <Badge variant="outline" className="text-xs">
                                        {activity.activity_type}
                                      </Badge>
                                      {activity.estimated_duration && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {activity.estimated_duration} min
                                        </span>
                                      )}
                                      {activity.difficulty_level && (
                                        <span>Difficulty: {activity.difficulty_level}/5</span>
                                      )}
                                      {activity.points > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                          {activity.points} pts
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {progress?.score && (
                                      <Badge variant="outline" className="text-green-600">
                                        {progress.score}%
                                      </Badge>
                                    )}
                                    <Button
                                      size="sm"
                                      disabled={isLocked}
                                      variant={isCompleted ? "outline" : "default"}
                                      asChild={!isLocked}
                                    >
                                      {isLocked ? (
                                        "Locked"
                                      ) : (
                                        <Link href={`/learn/activities/${activity.id}`}>
                                          {isCompleted ? "Review" : isInProgress ? "Continue" : "Start"}
                                          <Play className="h-4 w-4 ml-2" />
                                        </Link>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                                {activity.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
                                )}
                                {isInProgress && progress && (
                                  <div className="mt-3">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span className="text-muted-foreground">Progress</span>
                                      <span>{progress.attempts || 0} attempts</span>
                                    </div>
                                    <Progress value={50} className="h-1" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
                )
              })()}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedActivities.length > 0 ? (
                sortedActivities.map((activity, index) => {
                  const progress = progressMap.get(activity.id)
                  const isCompleted = progress?.status === "completed"
                  const isInProgress = progress?.status === "in_progress"
                  const prevActivity = index > 0 ? sortedActivities[index - 1] : null
                  const prevProgress = prevActivity ? progressMap.get(prevActivity.id) : null
                  const isLocked = index > 0 && prevProgress?.status !== "completed"

                  return (
                    <Card key={activity.id} className={`${isLocked ? "opacity-60" : "hover:shadow-md"} transition-all`}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                                isCompleted
                                  ? "bg-green-100 text-green-600"
                                  : isInProgress
                                    ? "bg-blue-100 text-blue-600"
                                    : isLocked
                                      ? "bg-gray-100 text-gray-400"
                                      : "bg-primary/10 text-primary"
                              }`}
                            >
                              {isCompleted ? <CheckCircle className="h-5 w-5" /> : index + 1}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold mb-1">{activity.title}</h3>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {activity.activity_type}
                                  </Badge>
                                  {activity.estimated_duration && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {activity.estimated_duration} min
                                    </span>
                                  )}
                                  {activity.difficulty_level && (
                                    <span>Difficulty: {activity.difficulty_level}/5</span>
                                  )}
                                  {activity.points > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {activity.points} pts
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {progress?.score && (
                                  <Badge variant="outline" className="text-green-600">
                                    {progress.score}%
                                  </Badge>
                                )}
                                <Button
                                  size="sm"
                                  disabled={isLocked}
                                  variant={isCompleted ? "outline" : "default"}
                                  asChild={!isLocked}
                                >
                                  {isLocked ? (
                                    "Locked"
                                  ) : (
                                    <Link href={`/learn/activities/${activity.id}`}>
                                      {isCompleted ? "Review" : isInProgress ? "Continue" : "Start"}
                                      <Play className="h-4 w-4 ml-2" />
                                    </Link>
                                  )}
                                </Button>
                              </div>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
                            )}
                            {isInProgress && progress && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">Progress</span>
                                  <span>{progress.attempts || 0} attempts</span>
                                </div>
                                <Progress value={50} className="h-1" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No activities yet</h3>
                    <p className="text-muted-foreground">
                      This course doesn't have any activities assigned yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
