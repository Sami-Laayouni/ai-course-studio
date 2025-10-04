import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Users, BarChart3, Brain } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  // Get user's courses
  const { data: courses } = await supabase
    .from("courses")
    .select("*, activities(count)")
    .eq("teacher_id", data.user.id)
    .order("created_at", { ascending: false });

  // Get recent activity stats
  const { data: recentStats } = await supabase
    .from("student_progress")
    .select("*, courses!inner(teacher_id)")
    .eq("courses.teacher_id", data.user.id)
    .gte(
      "created_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {profile?.full_name || "Teacher"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {profile?.school_name && `${profile.school_name} • `}
              {profile?.role === "teacher" ? "Educator" : profile?.role}
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/courses/new">
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Courses
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courses?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active learning paths
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Activities
              </CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {courses?.reduce(
                  (sum, course) => sum + (course.activities?.[0]?.count || 0),
                  0
                ) || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Learning experiences
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Student Interactions
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recentStats?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Courses */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Your Courses</h2>
            <Button variant="outline" asChild>
              <Link href="/dashboard/courses">View All</Link>
            </Button>
          </div>

          {courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.slice(0, 6).map((course) => (
                <Card
                  key={course.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">
                          {course.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {course.subject} • {course.grade_level}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
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
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {course.description || "No description available"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {course.activities?.[0]?.count || 0} activities
                      </span>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/courses/${course.id}`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first course to start building amazing learning
                  experiences with AI assistance.
                </p>
                <Button asChild>
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
    </div>
  );
}
