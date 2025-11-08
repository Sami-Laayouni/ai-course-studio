"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Brain, Save, Zap } from "lucide-react"
import Link from "next/link"
import SimpleZapierBuilder from "@/components/learning/simple-zapier-builder"

interface NewActivityPageProps {
  params: Promise<{ id: string }>
}

const DIFFICULTY_LEVELS = [
  { value: 1, label: "Beginner" },
  { value: 2, label: "Easy" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Challenging" },
  { value: 5, label: "Advanced" },
]

export default function NewActivityPage({ params }: NewActivityPageProps) {
  const [courseId, setCourseId] = useState<string>("")
  const [activityId, setActivityId] = useState<string | null>(null)
  const [course, setCourse] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [difficulty, setDifficulty] = useState<number>(3)
  const [duration, setDuration] = useState<number>(30)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [basicInfoComplete, setBasicInfoComplete] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params
      setCourseId(resolvedParams.id)
      loadCourse(resolvedParams.id)
      
      // Check if editing existing activity
      const urlParams = new URLSearchParams(window.location.search)
      const editId = urlParams.get('id')
      if (editId) {
        setActivityId(editId)
        loadActivity(editId)
      } else {
        setIsLoadingData(false)
      }
    }
    loadParams()
  }, [params])
  
  const loadActivity = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      
      setTitle(data.title || "")
      setDescription(data.description || "")
      setDifficulty(data.difficulty_level || 3)
      setDuration(data.estimated_duration || 30)
      setIsLoadingData(false)
      // If activity has content, show builder
      if (data.content && Object.keys(data.content).length > 0) {
        setShowBuilder(true)
        setBasicInfoComplete(true)
      }
    } catch (error) {
      console.error("Error loading activity:", error)
      setError("Failed to load activity")
      setIsLoadingData(false)
    }
  }

  const loadCourse = async (id: string) => {
    try {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id).single()

      if (error) throw error
      setCourse(data)
    } catch (error) {
      console.error("Error loading course:", error)
    }
  }

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !duration) {
      setError("Please fill in title and duration")
      return
    }

    // Save basic info and open builder
    setBasicInfoComplete(true)
    setShowBuilder(true)
  }

  const handleActivityCreated = async (activity: any) => {
    try {
      setIsLoading(true)
      
      // Save activity to database
      const activityData = {
        course_id: courseId,
        title: title || activity.title || "Custom Activity",
        description: description || activity.description || "",
        content: activity.content || activity,
        activity_type: "custom",
        activity_subtype: "zapier_workflow",
        difficulty_level: difficulty,
        estimated_duration: duration || activity.estimated_duration || 30,
        points: activity.points || 100,
        is_enhanced: true,
        is_adaptive: true,
        ...activity,
      }

      if (activityId) {
        // Update existing
        const { error } = await supabase
          .from("activities")
          .update(activityData)
          .eq("id", activityId)
        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from("activities")
          .insert(activityData)
        if (error) throw error
      }

      router.push(`/dashboard/courses/${courseId}`)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBuilderClose = () => {
    setShowBuilder(false)
    if (!activityId) {
      // If creating new, reset form
      setTitle("")
      setDescription("")
      setDuration(30)
    }
  }

  // Show Zapier builder if basic info is complete
  if (showBuilder) {
    return (
      <SimpleZapierBuilder
        onActivityCreated={handleActivityCreated}
        onClose={handleBuilderClose}
        courseId={courseId}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/courses/${courseId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Link>
          </Button>
        </div>

        {isLoadingData ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              {activityId ? "Edit Activity" : "Create Custom Activity"}
            </CardTitle>
            <CardDescription>
              {course ? `${activityId ? "Edit" : "Create a custom"} activity for "${course.title}" using the visual builder` : `${activityId ? "Edit" : "Create a new"} custom learning activity`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
              {/* Activity Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Activity Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Introduction to Photosynthesis"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Activity Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what students will learn or do in this activity..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Duration and Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Estimated Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    max="180"
                    value={duration}
                    onChange={(e) => setDuration(Number.parseInt(e.target.value) || 30)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select
                    value={difficulty.toString()}
                    onValueChange={(value) => setDifficulty(Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value.toString()}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Visual Activity Builder
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      After entering basic information, you'll use the visual Zapier-style builder to create your custom activity with drag-and-drop components, AI tutoring, quizzes, videos, and more.
                    </p>
                  </div>
                </div>
              </div>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={isLoading} className="flex-1" size="lg">
                  <Zap className="h-4 w-4 mr-2" />
                  Continue to Visual Builder
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  )
}
