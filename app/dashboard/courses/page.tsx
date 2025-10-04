import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, BookOpen, Users, Calendar } from "lucide-react"
import Link from "next/link"

export default async function CoursesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get all user's courses with enrollment counts
  const { data: courses } = await supabase
    .from("courses")
    .select(`
      *,
      activities(count),
      enrollments(count)
    `)
    .eq("teacher_id", data.user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
            <p className="text-muted-foreground mt-1">Create and manage your educational content</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/courses/new">
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </Link>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search courses..." className="pl-10" />
          </div>
        </div>

        {/* Courses Grid */}
        {courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {course.subject} • {course.grade_level}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          course.is_published
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}
                      >
                        {course.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {course.description || "No description available"}
                  </p>

                  {/* Course Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.activities?.[0]?.count || 0} activities</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.enrollments?.[0]?.count || 0} students</span>
                    </div>
                  </div>

                  {/* Learning Objectives Preview */}
                  {course.learning_objectives && course.learning_objectives.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Learning Objectives:</p>
                      <ul className="text-xs text-muted-foreground">
                        {course.learning_objectives.slice(0, 2).map((objective, index) => (
                          <li key={index} className="line-clamp-1">
                            • {objective}
                          </li>
                        ))}
                        {course.learning_objectives.length > 2 && (
                          <li className="text-muted-foreground/70">+ {course.learning_objectives.length - 2} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
                      <Link href={`/dashboard/courses/${course.id}`}>Edit</Link>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
                      <Link href={`/dashboard/courses/${course.id}/activities`}>Activities</Link>
                    </Button>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                    <Calendar className="h-3 w-3" />
                    <span>Created {new Date(course.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Start creating engaging educational content with AI assistance. Build your first course to get started.
              </p>
              <Button asChild size="lg">
                <Link href="/dashboard/courses/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Course
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
