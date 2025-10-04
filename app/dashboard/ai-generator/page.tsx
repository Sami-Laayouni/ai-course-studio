"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Brain, Wand2, Download, Save, Sparkles } from "lucide-react"
import Link from "next/link"

interface Course {
  id: string
  title: string
  subject: string
  grade_level: string
  learning_objectives: string[]
}

interface GeneratedContent {
  type: string
  title: string
  content: any
  difficulty: number
  estimatedDuration: number
}

const CONTENT_TYPES = [
  { value: "quiz", label: "Quiz", description: "Multiple choice, true/false, and short answer questions" },
  { value: "assignment", label: "Assignment", description: "Project-based learning activities" },
  { value: "reading", label: "Reading Material", description: "Educational articles and passages" },
  { value: "interactive", label: "Interactive Activity", description: "Hands-on learning experiences" },
  { value: "lesson_plan", label: "Lesson Plan", description: "Complete lesson structure with activities" },
]

const DIFFICULTY_LEVELS = [
  { value: 1, label: "Beginner", color: "bg-green-100 text-green-800" },
  { value: 2, label: "Easy", color: "bg-blue-100 text-blue-800" },
  { value: 3, label: "Moderate", color: "bg-yellow-100 text-yellow-800" },
  { value: 4, label: "Challenging", color: "bg-orange-100 text-orange-800" },
  { value: 5, label: "Advanced", color: "bg-red-100 text-red-800" },
]

export default function AIGeneratorPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [contentType, setContentType] = useState<string>("")
  const [topic, setTopic] = useState("")
  const [customPrompt, setCustomPrompt] = useState("")
  const [difficulty, setDifficulty] = useState<number>(3)
  const [duration, setDuration] = useState<number>(30)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const courseId = searchParams.get("courseId")
  const supabase = createClient()

  useEffect(() => {
    loadCourses()
  }, [])

  useEffect(() => {
    if (courseId && courses.length > 0) {
      setSelectedCourse(courseId)
    }
  }, [courseId, courses])

  const loadCourses = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("courses")
        .select("id, title, subject, grade_level, learning_objectives")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error("Error loading courses:", error)
    }
  }

  const generateContent = async () => {
    if (!selectedCourse || !contentType || !topic) {
      setError("Please fill in all required fields")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const course = courses.find((c) => c.id === selectedCourse)
      if (!course) throw new Error("Course not found")

      const response = await fetch("/api/ai/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourse,
          contentType,
          topic,
          customPrompt,
          difficulty,
          duration,
          courseContext: {
            subject: course.subject,
            gradeLevel: course.grade_level,
            learningObjectives: course.learning_objectives,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate content")
      }

      const data = await response.json()
      setGeneratedContent(data.content)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const saveAsActivity = async () => {
    if (!generatedContent || !selectedCourse) return

    try {
      const { error } = await supabase.from("activities").insert({
        course_id: selectedCourse,
        title: generatedContent.title,
        activity_type: generatedContent.type,
        content: generatedContent.content,
        difficulty_level: generatedContent.difficulty,
        estimated_duration: generatedContent.estimatedDuration,
      })

      if (error) throw error

      // Reset form
      setGeneratedContent(null)
      setTopic("")
      setCustomPrompt("")
      alert("Activity saved successfully!")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to save activity")
    }
  }

  const selectedCourseData = courses.find((c) => c.id === selectedCourse)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Content Generator</h1>
            <p className="text-muted-foreground">Create educational content with AI assistance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Content Settings
                </CardTitle>
                <CardDescription>Configure what type of content you want to generate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Course Selection */}
                <div className="space-y-2">
                  <Label htmlFor="course">Course *</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title} ({course.subject})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Type */}
                <div className="space-y-2">
                  <Label htmlFor="contentType">Content Type *</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((type) => (
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

                {/* Topic */}
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic *</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Photosynthesis, Linear Equations, American Revolution"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                {/* Difficulty and Duration */}
                <div className="grid grid-cols-2 gap-4">
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

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="5"
                      max="180"
                      value={duration}
                      onChange={(e) => setDuration(Number.parseInt(e.target.value) || 30)}
                    />
                  </div>
                </div>

                {/* Custom Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="customPrompt">Additional Instructions (Optional)</Label>
                  <Textarea
                    id="customPrompt"
                    placeholder="Any specific requirements or focus areas..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={3}
                  />
                </div>

                {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

                <Button onClick={generateContent} disabled={isGenerating} className="w-full">
                  {isGenerating ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Course Context */}
            {selectedCourseData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Course Context</CardTitle>
                  <CardDescription>AI will use this information to generate relevant content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedCourseData.subject}</Badge>
                    <Badge variant="outline">{selectedCourseData.grade_level}</Badge>
                  </div>
                  {selectedCourseData.learning_objectives && selectedCourseData.learning_objectives.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Learning Objectives:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {selectedCourseData.learning_objectives.slice(0, 3).map((objective, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{objective}</span>
                          </li>
                        ))}
                        {selectedCourseData.learning_objectives.length > 3 && (
                          <li className="text-muted-foreground/70 text-xs">
                            + {selectedCourseData.learning_objectives.length - 3} more objectives
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Generated Content */}
          <div>
            {generatedContent ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Generated Content
                      </CardTitle>
                      <CardDescription>{generatedContent.title}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <Button size="sm" onClick={saveAsActivity}>
                        <Save className="h-4 w-4 mr-2" />
                        Save as Activity
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Content Metadata */}
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="outline">{generatedContent.type}</Badge>
                      <Badge
                        variant="outline"
                        className={
                          DIFFICULTY_LEVELS.find((d) => d.value === generatedContent.difficulty)?.color ||
                          "bg-gray-100 text-gray-800"
                        }
                      >
                        Difficulty: {generatedContent.difficulty}/5
                      </Badge>
                      <span className="text-muted-foreground">{generatedContent.estimatedDuration} minutes</span>
                    </div>

                    {/* Content Preview */}
                    <Tabs defaultValue="preview" className="w-full">
                      <TabsList>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                        <TabsTrigger value="raw">Raw Content</TabsTrigger>
                      </TabsList>
                      <TabsContent value="preview" className="mt-4">
                        <div className="prose prose-sm max-w-none">
                          <ContentPreview content={generatedContent.content} type={generatedContent.type} />
                        </div>
                      </TabsContent>
                      <TabsContent value="raw" className="mt-4">
                        <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                          {JSON.stringify(generatedContent.content, null, 2)}
                        </pre>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Brain className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Ready to Generate</h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    Fill in the form on the left and click "Generate Content" to create educational materials with AI
                    assistance.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Content Preview Component
function ContentPreview({ content, type }: { content: any; type: string }) {
  switch (type) {
    case "quiz":
      return (
        <div className="space-y-4">
          {content.questions?.map((question: any, index: number) => (
            <div key={index} className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">
                {index + 1}. {question.question}
              </h4>
              {question.options && (
                <div className="space-y-1 ml-4">
                  {question.options.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <span className="text-muted-foreground">{String.fromCharCode(65 + optIndex)}.</span>
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              )}
              {question.correct_answer && (
                <p className="text-sm text-green-600 mt-2">Answer: {question.correct_answer}</p>
              )}
            </div>
          ))}
        </div>
      )

    case "reading":
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{content.title}</h3>
          <div className="prose prose-sm">
            {content.sections?.map((section: any, index: number) => (
              <div key={index}>
                <h4 className="font-medium">{section.heading}</h4>
                <p>{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      )

    default:
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{content.title || "Generated Content"}</h3>
          <div className="prose prose-sm">
            {typeof content === "string" ? (
              <p>{content}</p>
            ) : (
              <pre className="whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>
            )}
          </div>
        </div>
      )
  }
}
