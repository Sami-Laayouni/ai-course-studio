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
  Loader2,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
  const [curriculum, setCurriculum] = useState<any>(null);
  const [curriculumStatus, setCurriculumStatus] = useState<string>("");
  const [curriculumProgress, setCurriculumProgress] = useState<number>(0);

  const router = useRouter();
  const supabase = createClient();

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

      // Load curriculum data directly from Supabase
      const { data: curriculumData, error: curriculumError } = await supabase
        .from("curriculum_documents")
        .select("id, title, processing_status, processing_progress, processing_error")
        .eq("course_id", id)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (curriculumError && curriculumError.code !== "PGRST116") {
        console.error("Error loading curriculum:", curriculumError);
      } else if (curriculumData) {
        setCurriculum(curriculumData);
        setCurriculumStatus(curriculumData.processing_status || "");
        setCurriculumProgress(curriculumData.processing_progress || 0);
      }
    } catch (error) {
      setError("Failed to load course data");
    } finally {
      setIsLoading(false);
    }
  };

  // Poll curriculum status if processing - MUST be before any conditional returns
  useEffect(() => {
    if (!curriculum?.id || !curriculumStatus) return;
    
    if (curriculumStatus !== "completed" && curriculumStatus !== "failed") {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/curriculum/process-jobs?curriculum_id=${curriculum.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.curriculum) {
              setCurriculumStatus(data.curriculum.processing_status || "");
              setCurriculumProgress(data.curriculum.processing_progress || 0);
              
              if (data.curriculum.processing_status === "completed") {
                clearInterval(interval);
              }
            }
          }
        } catch (error) {
          console.error("Error checking curriculum status:", error);
        }
      }, 5000); // Check every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [curriculum?.id, curriculumStatus]);

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Success Banner */}
        {showSuccessBanner && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-green-900">
                    Course created successfully!
                  </h3>
                  <p className="text-xs text-green-700 mt-0.5">
                    Now create your first activity to get started.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-green-700 hover:text-green-900"
                onClick={() => setShowSuccessBanner(false)}
              >
                <span className="text-sm">×</span>
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" className="h-8 px-3" asChild>
              <Link href="/dashboard/courses">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                <span className="text-sm">Back</span>
              </Link>
            </Button>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-1.5">{course.title}</h1>
              <p className="text-sm text-gray-600">{course.description || "Course management and activities"}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="h-9 px-4" asChild>
                <Link href={`/dashboard/courses/${courseId}/edit`}>
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-sm">Edit</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                <span className="text-sm">Delete</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="activities" className="w-full">
              <div className="border-b border-gray-200 mb-6">
                <TabsList className="bg-transparent h-auto p-0">
                  <TabsTrigger 
                    value="activities" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 rounded-none px-4 py-2.5 text-sm font-medium text-gray-600"
                  >
                    Activities
                  </TabsTrigger>
                  <TabsTrigger 
                    value="students"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 rounded-none px-4 py-2.5 text-sm font-medium text-gray-600"
                  >
                    Students
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="activities" className="space-y-4 mt-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Activities</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                    </p>
                  </div>
                  <Button asChild size="sm" className="bg-gray-900 hover:bg-gray-800 text-white h-9">
                    <Link href={`/dashboard/courses/${courseId}/activities/new`}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Create Activity
                    </Link>
                  </Button>
                </div>

                <div className="space-y-2">
                  {activities.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center">
                      <div className="max-w-sm mx-auto">
                        <div className="h-14 w-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BookOpen className="h-7 w-7 text-gray-400" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2">
                          No activities yet
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                          Create your first activity to add quizzes, interactive content, and learning experiences.
                        </p>
                        <Button asChild size="sm" className="bg-gray-900 hover:bg-gray-800 text-white">
                          <Link href={`/dashboard/courses/${courseId}/activities/new`}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Create Activity
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <div 
                        key={activity.id} 
                        className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="h-5 w-5 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm text-gray-900 mb-1 truncate">
                                {activity.title}
                              </h3>
                              {activity.description && (
                                <p className="text-xs text-gray-500 line-clamp-2">
                                  {activity.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" asChild>
                              <Link href={`/dashboard/courses/${courseId}/activities/new?id=${activity.id}`}>
                                <Edit className="h-3.5 w-3.5 mr-1.5" />
                                Edit
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-xs"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/activities/${activity.id}/publish`, {
                                    method: "POST",
                                  });
                                  
                                  if (response.ok) {
                                    const shareUrl = `${
                                      typeof window !== "undefined"
                                        ? window.location.origin
                                        : ""
                                    }/learn/activities/${activity.id}`;
                                    navigator.clipboard.writeText(shareUrl);
                                    alert(
                                      `Activity published and link copied to clipboard!\n\n${shareUrl}\n\nStudents can now access this activity.`
                                    );
                                    window.location.reload();
                                  } else {
                                    const error = await response.json();
                                    alert(`Failed to publish activity: ${error.error || "Unknown error"}`);
                                  }
                                } catch (error: any) {
                                  console.error("Error publishing activity:", error);
                                  alert(`Error: ${error.message || "Failed to publish activity"}`);
                                }
                              }}
                            >
                              <Share2 className="h-3.5 w-3.5 mr-1.5" />
                              {activity.is_published ? "Share" : "Publish"}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" asChild>
                              <Link href={`/dashboard/courses/${courseId}/activities/${activity.id}/analytics`}>
                                <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                                Analytics
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteActivity(activity.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="students" className="space-y-4 mt-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Enrolled Students</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {enrolledStudents.length} {enrolledStudents.length === 1 ? 'student' : 'students'} enrolled
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3"
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
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-yellow-900 mb-1">
                          Unable to Load Students
                        </h4>
                        <p className="text-xs text-yellow-800 mb-2">
                          {studentsError}
                        </p>
                        {studentsError.includes("RLS") && (
                          <p className="text-xs text-yellow-700">
                            Please run the{" "}
                            <code className="bg-yellow-100 px-1.5 py-0.5 rounded text-xs">
                              fix_enrollments_rls_for_teachers.sql
                            </code>{" "}
                            script in your Supabase SQL Editor to fix this issue.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!studentsError && enrolledStudents.length > 0 ? (
                  <div className="space-y-2">
                    {enrolledStudents.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-700 font-semibold text-xs">
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
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-gray-900 mb-0.5 truncate">
                              {enrollment.profiles?.full_name || "Unknown Student"}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">
                              {enrollment.profiles?.email || "No email"}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !studentsError ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                    <div className="max-w-sm mx-auto">
                      <div className="h-14 w-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="h-7 w-7 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        No students enrolled yet
                      </h3>
                      <p className="text-sm text-gray-500">
                        Share the join code with your students to get them enrolled.
                      </p>
                    </div>
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* Course Info */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Course Information</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Subject</p>
                    <p className="text-sm font-medium text-gray-900">{course.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Grade Level</p>
                    <p className="text-sm font-medium text-gray-900">{course.grade_level}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Join Code */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Join Code</h3>
                <p className="text-xs text-gray-500 mt-0.5">Share with students</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={course.join_code || "Not set"}
                    readOnly
                    className="text-sm font-mono font-semibold text-center bg-gray-50 border-gray-200 h-9"
                  />
                  {course.join_code ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 flex-shrink-0"
                      onClick={() => {
                        copyToClipboard(course.join_code || "");
                        alert(`Join code copied to clipboard!\n\n${course.join_code}`);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-gray-900 hover:bg-gray-800 text-white h-9 px-3 flex-shrink-0"
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            `/api/courses/${courseId}/generate-join-code`,
                            { method: "POST" }
                          );
                          const data = await response.json();
                          if (response.ok && data.success) {
                            setCourse({ ...course, join_code: data.join_code });
                            alert(`Join code generated: ${data.join_code}\n\nThis code has been copied to your clipboard.`);
                            copyToClipboard(data.join_code);
                          } else {
                            alert(`Failed to generate join code: ${data.error || "Unknown error"}`);
                          }
                        } catch (error) {
                          alert("Failed to generate join code. Please try again.");
                        }
                      }}
                    >
                      Generate
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Improve Curriculum */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Improve Curriculum</h3>
                <p className="text-xs text-gray-500 mt-0.5">Upload and analyze</p>
              </div>
              <div className="p-4 space-y-3">
                {curriculum ? (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 truncate pr-2">{curriculum.title}</p>
                        {curriculumStatus === "pending" && (
                          <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 text-xs flex-shrink-0">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            Queued
                          </Badge>
                        )}
                        {curriculumStatus && curriculumStatus !== "completed" && curriculumStatus !== "failed" && curriculumStatus !== "pending" && (
                          <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200 text-xs flex-shrink-0">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            Processing
                          </Badge>
                        )}
                        {curriculumStatus === "completed" && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs flex-shrink-0">
                            <CheckCircle className="h-2.5 w-2.5 mr-1" />
                            Ready
                          </Badge>
                        )}
                        {curriculumStatus === "failed" && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs flex-shrink-0">
                            <AlertCircle className="h-2.5 w-2.5 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                      {curriculumStatus && curriculumStatus !== "completed" && curriculumStatus !== "failed" && (
                        <div className="mt-2">
                          <Progress value={curriculumProgress} className="h-1.5" />
                          <p className="text-xs text-gray-500 mt-1">
                            {curriculumProgress}% complete
                          </p>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" className="w-full text-sm h-9" asChild>
                      <Link href={`/dashboard/courses/${courseId}/curriculum`}>
                        <TrendingUp className="h-3.5 w-3.5 mr-2" />
                        View Curriculum
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                      Upload curriculum to analyze performance.
                    </p>
                    <Button variant="outline" className="w-full text-sm h-9" asChild>
                      <Link href={`/dashboard/courses/${courseId}/curriculum`}>
                        <TrendingUp className="h-3.5 w-3.5 mr-2" />
                        Upload Curriculum
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
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
