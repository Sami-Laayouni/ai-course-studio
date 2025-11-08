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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import Link from "next/link";

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

export default function CoursePage({ params }: CoursePageProps) {
  const [courseId, setCourseId] = useState<string>("");
  const [course, setCourse] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setCourseId(resolvedParams.id);
      fetchCourseData(resolvedParams.id);
      
      // Check if course was just created
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('created') === 'true') {
        setShowSuccessBanner(true);
        // Remove query param from URL
        window.history.replaceState({}, '', window.location.pathname);
        // Hide banner after 5 seconds
        setTimeout(() => setShowSuccessBanner(false), 5000);
      }
    };
    initializeParams();
  }, [params]);

  const fetchCourseData = async (id: string) => {
    try {
      const [courseResponse, activitiesResponse] = await Promise.all([
        fetch(`/api/courses/${id}`),
        fetch(`/api/activities?course_id=${id}`),
      ]);

      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        setCourse(courseData.course);
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.activities || []);
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
              <p className="text-muted-foreground">{course.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/courses/${courseId}/activities/new`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Course
              </Link>
            </Button>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview
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
                    <Link href={`/dashboard/courses/${courseId}/activities/new`}>
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
                          Create your first activity to add quizzes, interactive content, and learning experiences. 
                          You can use AI to help generate engaging activities.
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
                              <h3 className="font-semibold">{activity.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {activity.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                {activity.estimated_duration && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {activity.estimated_duration} min
                                  </div>
                                )}
                                <Badge variant="secondary">
                                  {activity.activity_type || "Activity"}
                                </Badge>
                              </div>
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
                            <Button variant="outline" size="sm">
                              <Share2 className="h-4 w-4 mr-1" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="students" className="space-y-6">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Student Management
                  </h3>
                  <p className="text-muted-foreground">
                    View and manage enrolled students
                  </p>
                </div>
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
                  <span>Grade {course.grade_level}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{course.estimated_duration} minutes total</span>
                </div>
              </CardContent>
            </Card>

            {/* Sharing Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Share Course</CardTitle>
                <CardDescription>
                  Share these links with your students
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Course Join Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`${
                        typeof window !== "undefined"
                          ? window.location.origin
                          : ""
                      }/join/course/${course.join_code || "loading..."}`}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          `${
                            typeof window !== "undefined"
                              ? window.location.origin
                              : ""
                          }/join/course/${course.join_code || ""}`
                        )
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Join Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={course.join_code || "Not set"}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(course.join_code || "")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
