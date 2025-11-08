"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  Share2,
  Copy,
  Users,
  BookOpen,
  Clock,
  Settings,
  Edit,
  Eye,
  BarChart3,
  Trash2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

export default function CoursePage({ params }: CoursePageProps) {
  const [courseId, setCourseId] = useState<string>("");
  const [course, setCourse] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setCourseId(resolvedParams.id);
      fetchCourseData(resolvedParams.id);

      // Check if course was just created
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("created") === "true") {
        setShowSuccessBanner(true);
        // Remove query param from URL
        window.history.replaceState({}, "", window.location.pathname);
        // Hide banner after 5 seconds
        setTimeout(() => setShowSuccessBanner(false), 5000);
      }
    };
    initializeParams();
  }, [params]);

  const fetchCourseData = async (id: string) => {
    try {
      const [courseResponse, activitiesResponse, studentsResponse] =
        await Promise.all([
          fetch(`/api/courses/${id}`),
          fetch(`/api/activities?course_id=${id}`),
          fetch(`/api/courses/${id}/students`),
        ]);

      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        setCourse(courseData.course);
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.activities || []);
      }

      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setEnrolledStudents(studentsData.students || []);
        setStudentsError(null);
      } else {
        const errorData = await studentsResponse.json();
        console.error("Failed to fetch students:", errorData);
        const errorMessage =
          errorData.error || "Failed to load enrolled students";
        const errorDetails = errorData.details || errorData.hint || "";
        setStudentsError(
          errorMessage + (errorDetails ? `: ${errorDetails}` : "")
        );
        setEnrolledStudents([]);
      }
    } catch (error) {
      setError("Failed to load course data");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this activity? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/activities?id=${activityId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete activity");
      }

      // Remove activity from state
      setActivities(activities.filter((a) => a.id !== activityId));
      setActivityToDelete(null);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete activity";
      setError(errorMessage);
      console.error("Error deleting activity:", error);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseId) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete course");
      }

      // Redirect to courses list after successful deletion
      router.push("/dashboard/courses");
    } catch (error: unknown) {
      console.error("Error deleting course:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete course"
      );
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Course not found"}</p>
          <Button onClick={() => router.push("/dashboard/courses")}>
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Success Banner */}
        {showSuccessBanner && (
          <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      Course created successfully! 🎉
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Now create your first activity to get started.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuccessBanner(false)}
                >
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/courses">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{course.title}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/courses/${courseId}/activities/new`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Course
              </Link>
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Course
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="activities" className="space-y-6">
              <TabsList>
                <TabsTrigger value="activities">Activities</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="activities" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Activities</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Build your course with interactive activities
                    </p>
                  </div>
                  <Button asChild size="lg" className="shadow-md">
                    <Link
                      href={`/dashboard/courses/${courseId}/activities/new`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Activity
                    </Link>
                  </Button>
                </div>

                <div className="space-y-4">
                  {activities.length === 0 ? (
                    <Card className="p-12 text-center border-2 border-dashed">
                      <div className="max-w-md mx-auto">
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BookOpen className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">
                          Start Building Your Course
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Create your first activity to add quizzes, interactive
                          content, and learning experiences. You can use AI to
                          help generate engaging activities.
                        </p>
                        <Button asChild size="lg" className="shadow-md">
                          <Link
                            href={`/dashboard/courses/${courseId}/activities/new`}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Activity
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    activities.map((activity) => (
                      <Card key={activity.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {activity.title}
                              </h3>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link
                                href={`/dashboard/courses/${courseId}/activities/new?id=${activity.id}`}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const shareUrl = `${
                                  typeof window !== "undefined"
                                    ? window.location.origin
                                    : ""
                                }/learn/activities/${activity.id}`;
                                navigator.clipboard.writeText(shareUrl);
                                // You could add a toast notification here
                                alert(
                                  `Activity link copied to clipboard!\n\n${shareUrl}`
                                );
                              }}
                            >
                              <Share2 className="h-4 w-4 mr-1" />
                              Share
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link
                                href={`/dashboard/courses/${courseId}/activities/${activity.id}/analytics`}
                              >
                                <BarChart3 className="h-4 w-4 mr-1" />
                                Analytics
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="students" className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">Enrolled Students</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {enrolledStudents.length} student
                      {enrolledStudents.length !== 1 ? "s" : ""} enrolled
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (courseId) {
                        fetchCourseData(courseId);
                      }
                    }}
                  >
                    Refresh
                  </Button>
                </div>

                {studentsError && (
                  <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                            Unable to Load Students
                          </h4>
                          <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                            {studentsError}
                          </p>
                          {studentsError.includes("RLS") && (
                            <p className="text-xs text-yellow-700 dark:text-yellow-400">
                              Please run the{" "}
                              <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">
                                fix_enrollments_rls_for_teachers.sql
                              </code>{" "}
                              script in your Supabase SQL Editor to fix this
                              issue.
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!studentsError && enrolledStudents.length > 0 ? (
                  <div className="space-y-4">
                    {enrolledStudents.map((enrollment) => (
                      <Card
                        key={enrollment.id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-semibold text-lg">
                                  {enrollment.profiles?.full_name
                                    ? enrollment.profiles.full_name
                                        .split(" ")
                                        .map((n: string) => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .slice(0, 2)
                                    : enrollment.profiles?.email
                                    ? enrollment.profiles.email[0].toUpperCase()
                                    : "?"}
                                </span>
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">
                                  {enrollment.profiles?.full_name ||
                                    "Unknown Student"}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {enrollment.profiles?.email || "No email"}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Enrolled{" "}
                                    {new Date(
                                      enrollment.enrolled_at
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : !studentsError ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No students enrolled yet
                      </h3>
                      <p className="text-muted-foreground">
                        Share the join code with your students to get them
                        enrolled.
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <div className="text-center py-8">
                  <div className="h-12 w-12 bg-primary/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <span className="text-primary font-bold">📊</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Analytics</h3>
                  <p className="text-muted-foreground">
                    View course performance and engagement metrics
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{course.subject}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{course.grade_level}</span>
                </div>
              </CardContent>
            </Card>

            {/* Course Join Code */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Join Code</CardTitle>
                <CardDescription>
                  Share this code with your students to join the course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Join Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={course.join_code || "Not set"}
                      readOnly
                      className="text-lg font-mono font-bold text-center"
                    />
                    {course.join_code ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          copyToClipboard(course.join_code || "");
                          // You could add a toast notification here
                          alert(
                            `Join code copied to clipboard!\n\n${course.join_code}`
                          );
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch(
                              `/api/courses/${courseId}/generate-join-code`,
                              { method: "POST" }
                            );
                            const data = await response.json();
                            if (response.ok && data.success) {
                              setCourse({
                                ...course,
                                join_code: data.join_code,
                              });
                              alert(
                                `Join code generated: ${data.join_code}\n\nThis code has been copied to your clipboard.`
                              );
                              copyToClipboard(data.join_code);
                            } else {
                              alert(
                                `Failed to generate join code: ${
                                  data.error || "Unknown error"
                                }`
                              );
                            }
                          } catch (error) {
                            alert(
                              "Failed to generate join code. Please try again."
                            );
                          }
                        }}
                      >
                        Generate Code
                      </Button>
                    )}
                  </div>
                  {!course.join_code && (
                    <p className="text-xs text-muted-foreground">
                      This course doesn't have a join code yet. Click "Generate
                      Code" to create one.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              course "{course?.title}" and all associated activities, lessons,
              and student enrollments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              disabled={isDeleting}
              className="text-white bg-destructive hover:bg-destructive/90 "
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Deleting...
                </>
              ) : (
                "Delete Course"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
