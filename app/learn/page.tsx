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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  Trophy,
  Target,
  Play,
  CheckCircle,
  Bell,
  FileText,
  Calendar,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default async function StudentLearnPage() {
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

  // Get enrolled courses with progress
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      `
      *,
      courses(
        id, title, description, subject, grade_level,
        activities(count)
      )
    `
    )
    .eq("student_id", data.user.id)
    .order("enrolled_at", { ascending: false });

  // Get recent activity progress
  const { data: recentProgress } = await supabase
    .from("student_progress")
    .select(
      `
      *,
      activities(title, activity_type, estimated_duration),
      courses(title)
    `
    )
    .eq("student_id", data.user.id)
    .order("updated_at", { ascending: false })
    .limit(5);

  // Get notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", data.user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get assignments
  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      `
      *,
      courses(title, subject),
      lessons(title, description),
      assignment_submissions(status, grade, submitted_at)
    `
    )
    .eq("is_published", true)
    .in("course_id", enrollments?.map((e) => e.course_id) || [])
    .order("due_date", { ascending: true });

  // Get lesson assignments
  const { data: lessonAssignments } = await supabase
    .from("lesson_assignments")
    .select(
      `
      *,
      lessons(title, description, estimated_duration),
      courses(title, subject)
    `
    )
    .eq("student_id", data.user.id)
    .order("assigned_at", { ascending: false });

  // Calculate overall stats
  const totalCourses = enrollments?.length || 0;
  const completedActivities =
    recentProgress?.filter((p) => p.status === "completed").length || 0;
  const totalTimeSpent =
    recentProgress?.reduce((sum, p) => sum + (p.time_spent || 0), 0) || 0;
  const unreadNotifications = notifications?.length || 0;
  const pendingAssignments =
    assignments?.filter(
      (a) =>
        !a.assignment_submissions?.[0] ||
        a.assignment_submissions[0].status === "draft"
    ).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {profile?.full_name || "Student"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Continue your learning journey
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Enrolled Courses
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCourses}</div>
              <p className="text-xs text-muted-foreground">
                Active learning paths
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Activities
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedActivities}</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(totalTimeSpent / 60)}h
              </div>
              <p className="text-xs text-muted-foreground">Learning time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Achievement Score
              </CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85%</div>
              <p className="text-xs text-muted-foreground">
                Average performance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Notifications and Assignments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {unreadNotifications > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadNotifications}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications && notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 p-3 bg-muted rounded-lg"
                    >
                      <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(
                            notification.created_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {notifications.length > 5 && (
                    <Button variant="outline" size="sm" className="w-full">
                      View All Notifications
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No new notifications
                </p>
              )}
            </CardContent>
          </Card>

          {/* Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Assignments
                {pendingAssignments > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingAssignments}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignments && assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.slice(0, 5).map((assignment) => {
                    const submission = assignment.assignment_submissions?.[0];
                    const isOverdue =
                      assignment.due_date &&
                      new Date(assignment.due_date) < new Date();
                    const isSubmitted =
                      submission?.status === "submitted" ||
                      submission?.status === "graded";

                    return (
                      <div
                        key={assignment.id}
                        className="flex items-start gap-3 p-3 bg-muted rounded-lg"
                      >
                        <FileText className="h-4 w-4 mt-0.5 text-blue-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">
                              {assignment.title}
                            </h4>
                            {isOverdue && !isSubmitted && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                            {isSubmitted && (
                              <Badge variant="secondary" className="text-xs">
                                Submitted
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {assignment.courses.title} -{" "}
                            {assignment.courses.subject}
                          </p>
                          {assignment.due_date && (
                            <p className="text-xs text-muted-foreground">
                              Due:{" "}
                              {new Date(
                                assignment.due_date
                              ).toLocaleDateString()}
                            </p>
                          )}
                          {submission?.grade && (
                            <p className="text-xs text-green-600 font-medium">
                              Grade: {submission.grade}%
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {assignments.length > 5 && (
                    <Button variant="outline" size="sm" className="w-full">
                      View All Assignments
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No assignments yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lesson Assignments */}
        {lessonAssignments && lessonAssignments.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Assigned Lessons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lessonAssignments.slice(0, 6).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {assignment.lessons.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {assignment.lessons.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {assignment.courses.title} -{" "}
                          {assignment.courses.subject}
                        </p>
                        {assignment.lessons.estimated_duration && (
                          <p className="text-xs text-muted-foreground">
                            ~{assignment.lessons.estimated_duration} minutes
                          </p>
                        )}
                      </div>
                      <Button size="sm" asChild>
                        <Link href={`/learn/lessons/${assignment.lesson_id}`}>
                          Start
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Courses */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">My Courses</h2>
              <Button variant="outline" asChild>
                <Link href="/learn/browse">Browse More</Link>
              </Button>
            </div>

            {enrollments && enrollments.length > 0 ? (
              <div className="space-y-4">
                {enrollments.map((enrollment) => (
                  <Card
                    key={enrollment.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-1">
                            {enrollment.courses?.title}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {enrollment.courses?.subject}
                            </Badge>
                            <Badge variant="outline">
                              {enrollment.courses?.grade_level}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {enrollment.courses?.description}
                          </p>
                        </div>
                        <Button asChild>
                          <Link href={`/learn/courses/${enrollment.course_id}`}>
                            <Play className="h-4 w-4 mr-2" />
                            Continue
                          </Link>
                        </Button>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Progress
                          </span>
                          <span className="font-medium">
                            {enrollment.progress_percentage}%
                          </span>
                        </div>
                        <Progress
                          value={enrollment.progress_percentage}
                          className="h-2"
                        />
                      </div>

                      {/* Course Stats */}
                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span>
                            {enrollment.courses?.activities?.[0]?.count || 0}{" "}
                            activities
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            Enrolled{" "}
                            {new Date(
                              enrollment.enrolled_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
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
                    Start your learning journey by enrolling in your first
                    course.
                  </p>
                  <Button asChild>
                    <Link href="/learn/browse">Browse Courses</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Your latest learning progress</CardDescription>
              </CardHeader>
              <CardContent>
                {recentProgress && recentProgress.length > 0 ? (
                  <div className="space-y-4">
                    {recentProgress.slice(0, 5).map((progress) => (
                      <div key={progress.id} className="flex items-start gap-3">
                        <div
                          className={`p-1 rounded-full ${
                            progress.status === "completed"
                              ? "bg-green-100 text-green-600"
                              : progress.status === "in_progress"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {progress.status === "completed" ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">
                            {progress.activities?.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {progress.courses?.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {progress.activities?.activity_type}
                            </Badge>
                            {progress.score && (
                              <span className="text-xs text-muted-foreground">
                                {progress.score}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No recent activity
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start bg-transparent"
                  variant="outline"
                  asChild
                >
                  <Link href="/learn/browse">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Courses
                  </Link>
                </Button>
                <Button
                  className="w-full justify-start bg-transparent"
                  variant="outline"
                  asChild
                >
                  <Link href="/learn/progress">
                    <Trophy className="h-4 w-4 mr-2" />
                    View Progress
                  </Link>
                </Button>
                <Button
                  className="w-full justify-start bg-transparent"
                  variant="outline"
                  asChild
                >
                  <Link href="/learn/achievements">
                    <Target className="h-4 w-4 mr-2" />
                    Achievements
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
