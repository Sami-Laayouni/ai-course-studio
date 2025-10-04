"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateUUID } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Zap,
  Edit,
  ExternalLink,
  Trophy,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import SimpleZapierBuilder from "@/components/learning/simple-zapier-builder";
import FullscreenLeaderboard from "@/components/learning/fullscreen-leaderboard";

interface Activity {
  id: string;
  title: string;
  type: string;
  duration: number;
  points: number;
  description?: string;
  activity_type?: string;
  estimated_duration?: number;
}

interface LessonEditPageProps {
  params: Promise<{ id: string; lessonId: string }>;
}

export default function LessonEditPage({ params }: LessonEditPageProps) {
  const [courseId, setCourseId] = useState<string>("");
  const [lessonId, setLessonId] = useState<string>("");
  const [course, setCourse] = useState<any>(null);
  const [lesson, setLesson] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("activities");
  const [showActivityBuilder, setShowActivityBuilder] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const router = useRouter();

  // Initialize IDs from params
  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setCourseId(resolvedParams.id);
      setLessonId(resolvedParams.lessonId);
      loadLessonFromDatabase(resolvedParams.lessonId, resolvedParams.id);
    };
    initializeParams();

    // Listen for activity saved events to refresh the lesson
    const handleActivitySaved = () => {
      console.log("Activity saved event received, refreshing lesson data...");
      if (lessonId && courseId) {
        loadLessonFromDatabase(lessonId, courseId);
      }
    };

    window.addEventListener("activitySaved", handleActivitySaved);

    return () => {
      window.removeEventListener("activitySaved", handleActivitySaved);
    };
  }, [params, lessonId, courseId]);

  const loadLessonFromDatabase = async (lessonId: string, courseId: string) => {
    try {
      console.log("Loading lesson from database:", lessonId, courseId);

      // Load lesson and activities from database
      const [lessonResponse, courseResponse] = await Promise.all([
        fetch(`/api/lessons/${lessonId}`),
        fetch(`/api/courses/${courseId}`),
      ]);

      console.log("Lesson response status:", lessonResponse.status);
      console.log("Course response status:", courseResponse.status);

      if (lessonResponse.ok) {
        const lessonData = await lessonResponse.json();
        console.log("Loaded lesson from database:", lessonData.lesson);
        setLesson(lessonData.lesson);
        setActivities(lessonData.lesson.activities || []);
      } else {
        console.log("Lesson not found in database, trying localStorage...");
        const lessonError = await lessonResponse.text();
        console.log("Lesson error:", lessonError);
        loadLessonFromLocalStorage(lessonId, courseId);
      }

      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        console.log("Loaded course from database:", courseData.course);
        setCourse(courseData.course);
      } else {
        console.log("Course not found in database, trying localStorage...");
        const courseError = await courseResponse.text();
        console.log("Course error:", courseError);
        loadCourseFromLocalStorage(courseId);
      }
    } catch (error) {
      console.error("Error loading lesson from database:", error);
      console.log("Falling back to localStorage...");
      loadLessonFromLocalStorage(lessonId, courseId);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLessonFromLocalStorage = (lessonId: string, courseId: string) => {
    try {
      console.log("Loading lesson from localStorage:", lessonId, courseId);
      const savedLessons = JSON.parse(localStorage.getItem("lessons") || "[]");
      const savedCourses = JSON.parse(localStorage.getItem("courses") || "[]");

      const foundLesson = savedLessons.find((l: any) => l.id === lessonId);
      const foundCourse = savedCourses.find((c: any) => c.id === courseId);

      console.log("Found lesson:", foundLesson);
      console.log("Found course:", foundCourse);

      if (foundLesson) {
        setLesson(foundLesson);
        setActivities(foundLesson.activities || []);

        // Also load activities from localStorage
        const savedActivities = JSON.parse(
          localStorage.getItem("activities") || "[]"
        );
        const lessonActivities = savedActivities.filter(
          (a: any) => a.lesson_id === lessonId
        );
        if (lessonActivities.length > 0) {
          console.log("Found activities in localStorage:", lessonActivities);
          setActivities(lessonActivities);
        }
      } else {
        console.log("Lesson not found in localStorage");
        setLesson({
          id: lessonId,
          title: "Lesson Not Found",
          description: "This lesson could not be loaded",
          course_id: courseId,
          activities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setActivities([]);
      }

      if (foundCourse) {
        setCourse(foundCourse);
      } else {
        setCourse({
          id: courseId,
          title: "Course Not Found",
          description: "This course could not be loaded",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error loading lesson from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseFromLocalStorage = (courseId: string) => {
    try {
      const savedCourses = JSON.parse(localStorage.getItem("courses") || "[]");
      const foundCourse = savedCourses.find((c: any) => c.id === courseId);

      if (foundCourse) {
        setCourse(foundCourse);
      } else {
        setCourse({
          id: courseId,
          title: "Course Not Found",
          description: "This course could not be loaded",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error loading course from localStorage:", error);
    }
  };

  const saveLesson = async () => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: lesson?.title,
          description: lesson?.description,
          course_id: courseId,
        }),
      });

      if (response.ok) {
        alert("Lesson saved successfully!");
      } else {
        alert("Failed to save lesson");
      }
    } catch (error) {
      console.error("Error saving lesson:", error);
      alert("Failed to save lesson");
    }
  };

  const handleCustomActivityCreated = async (activity: any) => {
    console.log("Custom activity created:", activity);

    try {
      // Save the activity to the database
      const activityData = {
        course_id: courseId,
        lesson_id: lessonId,
        title: activity.title,
        description: activity.description,
        activity_type: activity.type,
        activity_subtype: activity.type,
        content: activity.content,
        difficulty_level: activity.difficulty_level || 3,
        estimated_duration: activity.estimated_duration || 15,
        points: activity.points || 10,
        order_index: activities.length,
        is_adaptive: activity.is_adaptive || true,
        is_collaborative: activity.is_collaborative || false,
        is_enhanced: activity.is_enhanced || true,
        is_conditional: activity.is_conditional || false,
        supports_upload: activity.supports_upload || false,
        supports_slideshow: activity.supports_slideshow || false,
        performance_tracking: activity.performance_tracking || false,
        collaboration_settings: activity.collaboration_settings || {},
      };

      const response = await fetch("/api/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(activityData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Activity saved to database:", data);
        alert("Activity created and saved successfully!");

        // Refresh the activities list
        if (lessonId && courseId) {
          await loadLessonFromDatabase(lessonId, courseId);
        }
      } else {
        const errorData = await response.json();
        console.error("Failed to save activity:", errorData);
        console.error("Response status:", response.status);
        console.error("Response headers:", response.headers);

        // Fallback: Save to localStorage
        console.log("Attempting to save to localStorage as fallback...");
        const savedActivities = JSON.parse(
          localStorage.getItem("activities") || "[]"
        );
        const newActivity = {
          ...activity,
          id: generateUUID(),
          course_id: courseId,
          lesson_id: lessonId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        savedActivities.push(newActivity);
        localStorage.setItem("activities", JSON.stringify(savedActivities));

        alert(
          "Activity saved to local storage (database save failed). Please check your database connection."
        );

        // Refresh the activities list
        if (lessonId && courseId) {
          await loadLessonFromDatabase(lessonId, courseId);
        }
      }
    } catch (error) {
      console.error("Error saving activity:", error);

      // Fallback: Save to localStorage
      console.log("Attempting to save to localStorage as fallback...");
      const savedActivities = JSON.parse(
        localStorage.getItem("activities") || "[]"
      );
      const newActivity = {
        ...activity,
        id: generateUUID(),
        course_id: courseId,
        lesson_id: lessonId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      savedActivities.push(newActivity);
      localStorage.setItem("activities", JSON.stringify(savedActivities));

      alert(
        "Activity saved to local storage (database error). Please check your database connection."
      );

      // Refresh the activities list
      if (lessonId && courseId) {
        await loadLessonFromDatabase(lessonId, courseId);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading lesson editor...</p>
          <p className="text-sm text-gray-500 mt-2">
            Lesson ID: {lessonId} | Course ID: {courseId}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button asChild>
            <Link href={`/dashboard/courses/${courseId}/lessons`}>
              Back to Lessons
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // If activity builder is open, show it full screen
  if (showActivityBuilder) {
    return (
      <SimpleZapierBuilder
        onActivityCreated={handleCustomActivityCreated}
        onClose={() => setShowActivityBuilder(false)}
        courseId={courseId}
        lessonId={lessonId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/courses/${courseId}/lessons`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lessons
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {lesson?.title || "Lesson Editor"}
            </h1>
            <p className="text-muted-foreground">
              Design your interactive lesson
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Activities: {activities.length} | Lesson ID: {lessonId} | Course
              ID: {courseId}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveLesson}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={() => setShowActivityBuilder(true)}>
              <Zap className="h-4 w-4 mr-2" />
              Create Activity
            </Button>
            <Button
              onClick={() => {
                console.log("Manual refresh triggered");
                if (lessonId && courseId) {
                  loadLessonFromDatabase(lessonId, courseId);
                }
              }}
              variant="outline"
              size="sm"
            >
              🔄 Refresh
            </Button>
          </div>
        </div>

        {/* Main Activities Section */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lesson Activities</CardTitle>
                  <CardDescription>
                    Create and manage interactive learning activities for this
                    lesson
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={saveLesson}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Lesson
                  </Button>
                  <Button onClick={() => setShowActivityBuilder(true)}>
                    <Zap className="h-4 w-4 mr-2" />
                    Create Activity
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Lesson Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Lesson Title</Label>
                    <Input
                      id="title"
                      value={lesson?.title || ""}
                      onChange={(e) =>
                        setLesson({ ...lesson, title: e.target.value })
                      }
                      placeholder="Enter lesson title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={lesson?.estimated_duration || ""}
                      onChange={(e) =>
                        setLesson({
                          ...lesson,
                          estimated_duration: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="Enter duration in minutes"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={lesson?.description || ""}
                    onChange={(e) =>
                      setLesson({ ...lesson, description: e.target.value })
                    }
                    placeholder="Enter lesson description"
                    rows={2}
                  />
                </div>
              </div>

              {/* Activities List */}
              {activities.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">
                    No Activities Yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first interactive activity to get started
                  </p>
                  <Button
                    onClick={() => setShowActivityBuilder(true)}
                    size="lg"
                  >
                    <Zap className="h-5 w-5 mr-2" />
                    Create Your First Activity
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <Card key={activity.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <Zap className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-medium">
                              {activity.title}
                            </h4>
                            <p className="text-sm text-gray-500 mb-2">
                              {activity.activity_type} •{" "}
                              {activity.estimated_duration} min •{" "}
                              {activity.points} points
                            </p>
                            <p className="text-sm text-gray-600">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const url = `${window.location.origin}/learn/activities/${activity.id}`;
                              navigator.clipboard.writeText(url);
                              alert("Activity link copied to clipboard!");
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Copy Link
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(
                                `${window.location.origin}/learn/activities/${activity.id}`,
                                "_blank"
                              )
                            }
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Auto-saved Drafts Section */}
        {(() => {
          const savedDrafts = Object.keys(localStorage).filter((key) =>
            key.startsWith("activity_draft_")
          );
          if (savedDrafts.length > 0) {
            return (
              <Card className="border-orange-200 bg-orange-50 mb-6">
                <CardHeader>
                  <CardTitle className="text-orange-800 flex items-center gap-2">
                    <Save className="h-5 w-5" />
                    Auto-saved Drafts ({savedDrafts.length})
                  </CardTitle>
                  <CardDescription className="text-orange-600">
                    Continue working on your saved drafts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {savedDrafts.slice(-3).map((draftKey) => {
                    const draftData = localStorage.getItem(draftKey);
                    if (!draftData) return null;
                    try {
                      const parsed = JSON.parse(draftData);
                      return (
                        <div
                          key={draftKey}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                              <Save className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-orange-800">
                                {parsed.title || "Untitled Activity"}
                              </h4>
                              <p className="text-sm text-orange-600">
                                {parsed.nodes?.length || 0} nodes •{" "}
                                {new Date(parsed.lastSaved).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowActivityBuilder(true);
                                // The builder will auto-load the latest draft
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Continue
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm("Delete this draft?")) {
                                  localStorage.removeItem(draftKey);
                                  window.location.reload();
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    } catch (error) {
                      return null;
                    }
                  })}
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}

        {/* Leaderboard Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Activity Leaderboard
            </CardTitle>
            <CardDescription>
              Student performance and engagement metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                View Student Progress
              </h3>
              <p className="text-gray-500 mb-4">
                Track student performance and engagement with detailed
                analytics.
              </p>
              <Button
                onClick={() => setShowLeaderboard(true)}
                className="w-full"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Open Full Leaderboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fullscreen Leaderboard */}
      {showLeaderboard && (
        <FullscreenLeaderboard
          onClose={() => setShowLeaderboard(false)}
          courseId={courseId}
        />
      )}
    </div>
  );
}
