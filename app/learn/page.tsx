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
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { NotificationManager } from "@/components/student/notification-manager";

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

  // Check if student has completed the learning style assessment
  // Redirect to assessment if not completed
  if (profile?.role === "student" && !profile?.has_completed_assessment) {
    redirect("/learn/assessment");
  }

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

  // Get all assigned activities from enrolled courses
  // This includes activities from lessons and direct course activities
  const courseIds = enrollments?.map((e) => e.course_id) || [];
  let allAssignedActivities: any[] = [];

  console.log("=== ACTIVITIES DEBUG ===");
  console.log("Course IDs from enrollments:", courseIds);
  console.log("Number of enrollments:", enrollments?.length || 0);
  console.log("User ID:", data.user.id);

  if (courseIds.length > 0) {
    try {
      // Try to get all activities at once first (simpler query)
      let allActivitiesData: any[] = [];

      // First, try querying all activities for enrolled courses
      // The API route uses server-side client which might bypass RLS issues
      // Try direct query first
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("activities")
        .eq("is_published", true) // Only show published activities to students
        .select("*")
        .in("course_id", courseIds)
        .order("order_index", { ascending: true });

      // If that fails due to RLS, try alternative approach
      if (activitiesError) {
        const errorCode = activitiesError.code || "";
        const errorMessage = activitiesError.message || "";

        if (
          errorCode === "PGRST116" ||
          errorMessage.includes("permission denied") ||
          errorMessage.includes("row-level security")
        ) {
          console.log("RLS blocking query, trying alternative approach...");

          // Try querying through enrollments relationship
          const { data: enrollmentActivities, error: enrollmentError } =
            await supabase
              .from("enrollments")
              .select(
                `
              course_id,
              courses!inner(
                activities(*)
              )
            `
              )
              .eq("student_id", data.user.id);

          if (!enrollmentError && enrollmentActivities) {
            enrollmentActivities.forEach((enrollment: any) => {
              if (enrollment.courses?.activities) {
                allActivitiesData = allActivitiesData.concat(
                  enrollment.courses.activities
                );
              }
            });
            console.log(
              `Alternative query found ${allActivitiesData.length} activities`
            );
          }
        }
      }

      // If direct query worked, use that data
      if (!activitiesError && activitiesData) {
        allActivitiesData = activitiesData;
        console.log(
          `Bulk query successful: Found ${allActivitiesData.length} activities`
        );
      } else if (activitiesError) {
        console.error(
          "Error fetching activities (bulk query):",
          activitiesError
        );
        console.error(
          "Error details:",
          JSON.stringify(activitiesError, null, 2)
        );
        console.error("Error code:", activitiesError.code);
        console.error("Error message:", activitiesError.message);
        console.error("Error hint:", activitiesError.hint);

        // If alternative approach didn't work, try using API route as fallback
        if (allActivitiesData.length === 0) {
          console.log("Trying API route as fallback...");
          try {
            // Use API route which uses server-side client (might bypass RLS)
            const baseUrl =
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            for (const courseId of courseIds) {
              try {
                const apiResponse = await fetch(
                  `${baseUrl}/api/activities?course_id=${courseId}`,
                  {
                    cache: "no-store",
                  }
                );

                if (apiResponse.ok) {
                  const apiData = await apiResponse.json();
                  if (apiData.success && apiData.activities) {
                    console.log(
                      `API route found ${apiData.activities.length} activities for course ${courseId}`
                    );
                    allActivitiesData = allActivitiesData.concat(
                      apiData.activities
                    );
                  }
                }
              } catch (apiError) {
                console.error(
                  `API route error for course ${courseId}:`,
                  apiError
                );
              }
            }
          } catch (error) {
            console.error("Error using API route:", error);
          }
        }
      }

      console.log(
        "=== ACTIVITIES SUMMARY ===",
        "\nTotal fetched:",
        allActivitiesData?.length || 0,
        "activities",
        "\nCourse IDs queried:",
        courseIds,
        "\nActivities data:",
        allActivitiesData
      );

      if (allActivitiesData.length > 0) {
        console.log(
          "Sample activity:",
          JSON.stringify(allActivitiesData[0], null, 2)
        );
      } else {
        console.warn("WARNING: No activities found for enrolled courses!");
        console.warn("This could mean:");
        console.warn("1. The course is not published");
        console.warn("2. RLS policies are blocking the query");
        console.warn("3. There are no activities in the enrolled courses");
      }

      // Get all lessons for context (even unpublished ones for lesson titles)
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select(
          `
          id,
          title,
          course_id
        `
        )
        .in("course_id", courseIds)
        .order("order_index", { ascending: true });

      if (lessonsError) {
        console.error("Error fetching lessons:", lessonsError);
      }

      // Get course titles separately to avoid join issues
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, title")
        .in("id", courseIds);

      if (coursesError) {
        console.error("Error fetching courses:", coursesError);
      }

      // Create maps for quick lookup
      const courseMap = new Map();
      coursesData?.forEach((course: any) => {
        courseMap.set(course.id, course.title);
      });

      const lessonMap = new Map();
      lessonsData?.forEach((lesson: any) => {
        lessonMap.set(lesson.id, lesson.title);
      });

      // Collect all activities with lesson context
      // Process ALL activities we fetched
      if (allActivitiesData && allActivitiesData.length > 0) {
        console.log("Processing", allActivitiesData.length, "activities");
        allActivitiesData.forEach((activity: any) => {
          const courseTitle = courseMap.get(activity.course_id) || null;
          const lessonTitle =
            activity.lesson_id && lessonMap.has(activity.lesson_id)
              ? lessonMap.get(activity.lesson_id)
              : null;

          allAssignedActivities.push({
            ...activity,
            course_title: courseTitle,
            lesson_title: lessonTitle,
            lesson_id: activity.lesson_id || null,
          });
        });

        console.log(
          "Added",
          allAssignedActivities.length,
          "activities to display list"
        );

        console.log(
          "All assigned activities:",
          allAssignedActivities.length,
          allAssignedActivities
        );

        // Get student progress for all activities
        const activityIds = allAssignedActivities.map((a) => a.id);
        if (activityIds.length > 0) {
          const { data: progressData } = await supabase
            .from("student_progress")
            .select("*")
            .eq("student_id", data.user.id)
            .in("activity_id", activityIds);

          // Map progress to activities
          const progressMap = new Map();
          progressData?.forEach((p) => {
            progressMap.set(p.activity_id, p);
          });

          // Add progress to activities
          allAssignedActivities = allAssignedActivities.map((activity) => ({
            ...activity,
            progress: progressMap.get(activity.id),
          }));
        }
      }
    } catch (error) {
      console.error("Error loading activities:", error);
      // Continue with empty activities array if there's an error
    }
  }

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
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {profile?.full_name || "Student"}!
          </h1>
          <NotificationManager />
        </div>

        {/* Assigned Activities Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {allAssignedActivities.length > 0
                ? "Assigned Activities"
                : "My Activities"}
            </CardTitle>
            <CardDescription>
              {allAssignedActivities.length > 0
                ? "All activities from your enrolled courses"
                : "You don't have any activities yet."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allAssignedActivities.length > 0 ? (
              <div className="space-y-4">
                {allAssignedActivities
                  .filter((activity) => {
                    return true;
                  })
                  .slice(0, 20)
                  .map((activity) => {
                    const progress = activity.progress;
                    const isCompleted = progress?.status === "completed";
                    const isInProgress = progress?.status === "in_progress";

                    const captivatingQuestion = activity.content?.captivating_question;
                    
                    return (
                      <div
                        key={activity.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{activity.title}</h4>
                              {isCompleted && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              {isInProgress && (
                                <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                              )}
                            </div>
                            {captivatingQuestion && (
                              <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border-l-4 border-blue-500">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  💡 {captivatingQuestion}
                                </p>
                              </div>
                            )}
                            {activity.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {activity.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {activity.course_title && (
                                <span>{activity.course_title}</span>
                              )}
                              {activity.lesson_title && (
                                <span>• {activity.lesson_title}</span>
                              )}
                              {activity.estimated_duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {activity.estimated_duration} min
                                </span>
                              )}
                              {activity.points > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {activity.points} pts
                                </Badge>
                              )}
                              {progress?.score && (
                                <Badge
                                  variant="outline"
                                  className="text-green-600"
                                >
                                  Score: {progress.score}%
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={isCompleted ? "outline" : "default"}
                            asChild
                          >
                            <Link href={`/learn/activities/${activity.id}`}>
                              {isCompleted ? "Review" : "Start"}
                              <Play className="h-4 w-4 ml-2" />
                            </Link>
                          </Button>
                        </div>
                        {isInProgress && progress && (
                          <div className="mt-3">
                            <Progress value={50} className="h-1" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {progress.attempts || 0} attempts
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                {allAssignedActivities.length > 20 && (
                  <div className="text-center pt-4">
                    <Button variant="outline" asChild>
                      <Link href="/learn/courses">
                        View All Activities ({allAssignedActivities.length})
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No activities available.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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

        <div className="grid grid-cols-1 gap-8">
          {/* My Courses */}
          <div className="lg:col-span-2">
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
                    Start your learning journey by joining a course with a join
                    code
                  </p>
                  <Button asChild size="lg" className="shadow-md">
                    <Link href="/learn/join">
                      <Users className="h-4 w-4 mr-2" />
                      Join Course
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
