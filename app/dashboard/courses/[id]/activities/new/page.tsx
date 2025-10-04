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
import { ArrowLeft, Brain, Save } from "lucide-react"
import Link from "next/link"

interface NewActivityPageProps {
  params: Promise<{ id: string }>
}

const ACTIVITY_TYPES = [
  { value: "quiz", label: "Quiz", description: "Multiple choice, true/false, and short answer questions" },
  { value: "assignment", label: "Assignment", description: "Project-based learning activities" },
  { value: "reading", label: "Reading Material", description: "Educational articles and passages" },
  { value: "video", label: "Video Content", description: "Video lessons and tutorials" },
  { value: "interactive", label: "Interactive Activity", description: "Hands-on learning experiences" },
]

const DIFFICULTY_LEVELS = [
  { value: 1, label: "Beginner" },
  { value: 2, label: "Easy" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Challenging" },
  { value: 5, label: "Advanced" },
]

export default function NewActivityPage({ params }: NewActivityPageProps) {
  const [courseId, setCourseId] = useState<string>("")
  const [course, setCourse] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [activityType, setActivityType] = useState("")
  const [difficulty, setDifficulty] = useState<number>(3)
  const [duration, setDuration] = useState<number>(30)
  const [content, setContent] = useState("{}")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params
      setCourseId(resolvedParams.id)
      loadCourse(resolvedParams.id)
    }
    loadParams()
  }, [params])

  const loadCourse = async (id: string) => {
    try {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id).single()

      if (error) throw error
      setCourse(data)
    } catch (error) {
      console.error("Error loading course:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      let parsedContent
      try {
        parsedContent = JSON.parse(content)
      } catch {
        parsedContent = { content: content }
      }

      const { error } = await supabase.from("activities").insert({
        course_id: courseId,
        title,
        description,
        activity_type: activityType,
        content: parsedContent,
        difficulty_level: difficulty,
        estimated_duration: duration,
      })

      if (error) throw error

      router.push(`/dashboard/courses/${courseId}`)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const generateWithAI = () => {
    router.push(`/dashboard/ai-generator?courseId=${courseId}`)
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

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create New Activity</CardTitle>
            <CardDescription>
              {course ? `Add an activity to "${course.title}"` : "Add a new learning activity"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Activity Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Activity Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Introduction to Photosynthesis Quiz"
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

              {/* Activity Type and Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="activityType">Activity Type *</Label>
                  <Select value={activityType} onValueChange={setActivityType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="180"
                  value={duration}
                  onChange={(e) => setDuration(Number.parseInt(e.target.value) || 30)}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Activity Content (JSON format)</Label>
                <Textarea
                  id="content"
                  placeholder='{"instructions": "Complete the following tasks...", "questions": []}'
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the activity content in JSON format, or use the AI generator for assistance.
                </p>
              </div>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Creating..." : "Create Activity"}
                </Button>
                <Button type="button" variant="outline" onClick={generateWithAI}>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate with AI
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
