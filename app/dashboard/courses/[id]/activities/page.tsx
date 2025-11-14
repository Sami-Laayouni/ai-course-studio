"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Brain, Clock, FileText, MessageSquare, Play, Plus, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Course {
  id: string
  title: string
  description: string | null
}

interface Activity {
  id: string
  title: string
  description: string | null
  activity_type: string
  difficulty_level: number | null
  estimated_duration: number | null
  created_at: string
  content: Record<string, unknown> | null
}

const TYPE_ICON_MAP: Record<string, React.ReactNode> = {
  quiz: <Brain className="h-4 w-4" />,
  reading: <FileText className="h-4 w-4" />,
  chat: <MessageSquare className="h-4 w-4" />,
  video: <Play className="h-4 w-4" />,
}

export default function ActivitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const [courseId, setCourseId] = useState<string>("")
  const [course, setCourse] = useState<Course | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      const resolved = await params
      setCourseId(resolved.id)
      fetchCourseAndActivities(resolved.id)
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const fetchCourseAndActivities = async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const [courseResponse, activitiesResponse] = await Promise.all([fetch(`/api/courses/${id}`), fetch(`/api/activities?course_id=${id}`)])

      if (!courseResponse.ok) {
        throw new Error("Failed to load course")
      }

      if (!activitiesResponse.ok) {
        throw new Error("Failed to load activities")
      }

      const courseData = await courseResponse.json()
      const activitiesData = await activitiesResponse.json()

      setCourse(courseData.course)
      setActivities(activitiesData.activities || [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to load activities")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (minutes?: number | null) => {
    if (!minutes) return "—"
    return `${minutes} min`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p>Loading activities...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <Button asChild>
            <Link href="/dashboard/courses">Back to Courses</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/courses">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{course?.title || "Course Activities"}</h1>
              <p className="text-muted-foreground">{course?.description || "Monitor and manage the learning activities in this course."}</p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/dashboard/courses/${courseId}/activities/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Create Activity
            </Link>
          </Button>
        </div>

        {activities.length === 0 ? (
          <Card className="text-center p-12">
            <CardHeader>
              <CardTitle>No activities yet</CardTitle>
              <CardDescription>Create your first learning activity to engage students.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={`/dashboard/courses/${courseId}/activities/new`}>Create Activity</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activities.map((activity) => (
              <Card key={activity.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-full">
                        {TYPE_ICON_MAP[activity.activity_type] || <Sparkles className="h-4 w-4" />}
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {activity.activity_type || "custom"}
                      </Badge>
                      {activity.difficulty_level && (
                        <Badge variant="outline">Difficulty {activity.difficulty_level}</Badge>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{activity.title}</h2>
                      {activity.description && <p className="text-muted-foreground">{activity.description}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDuration(activity.estimated_duration)}
                    </div>
                    <Button variant="outline" onClick={() => router.push(`/learn/activities/${activity.id}`)}>
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
