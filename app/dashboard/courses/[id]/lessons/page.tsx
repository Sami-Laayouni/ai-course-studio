"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Play,
  MessageSquare,
  FileText,
  Brain,
  Settings,
  Edit,
  Trash2,
  Clock,
  Users,
  Trophy,
} from "lucide-react";
import Link from "next/link";

interface Lesson {
  id: string;
  title: string;
  description: string;
  estimated_duration: number;
  activities: any[];
  created_at: string;
  updated_at: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  join_code: string;
}

export default function LessonsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [courseId, setCourseId] = useState<string>("");
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setCourseId(resolvedParams.id);
      fetchCourseData(resolvedParams.id);
    };
    initializeParams();
  }, [params]);

  const fetchCourseData = async (courseId: string) => {
    try {
      // Load from localStorage (in a real app, this would be from database)
      const savedCourses = localStorage.getItem("courses");
      const savedLessons = localStorage.getItem("lessons");

      if (savedCourses) {
        const courses = JSON.parse(savedCourses);
        const course = courses.find((c: Course) => c.id === courseId);
        if (course) {
          setCourse(course);
        }
      }

      if (savedLessons) {
        const allLessons = JSON.parse(savedLessons);
        const courseLessons = allLessons.filter(
          (l: Lesson) => l.course_id === courseId
        );
        setLessons(courseLessons);
      }
    } catch (error) {
      setError("Failed to load course data");
    } finally {
      setIsLoading(false);
    }
  };

  const createNewLesson = () => {
    const newLesson: Lesson = {
      id: `lesson_${Date.now()}`,
      title: "New Lesson",
      description: "A new lesson created with the lesson editor",
      estimated_duration: 30,
      activities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to localStorage
    const savedLessons = JSON.parse(localStorage.getItem("lessons") || "[]");
    const updatedLessons = [
      ...savedLessons,
      { ...newLesson, course_id: courseId },
    ];
    localStorage.setItem("lessons", JSON.stringify(updatedLessons));

    // Navigate to lesson editor
    router.push(`/dashboard/courses/${courseId}/lessons/${newLesson.id}/edit`);
  };

  const deleteLesson = (lessonId: string) => {
    if (confirm("Are you sure you want to delete this lesson?")) {
      const savedLessons = JSON.parse(localStorage.getItem("lessons") || "[]");
      const updatedLessons = savedLessons.filter((l: any) => l.id !== lessonId);
      localStorage.setItem("lessons", JSON.stringify(updatedLessons));
      setLessons(lessons.filter((l) => l.id !== lessonId));
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "quiz":
        return <Brain className="h-4 w-4" />;
      case "chat":
        return <MessageSquare className="h-4 w-4" />;
      case "reading":
        return <FileText className="h-4 w-4" />;
      case "video":
        return <Play className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading lessons...</p>
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
            <Link href="/dashboard/courses">Back to Courses</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
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
              <h1 className="text-3xl font-bold">
                {course?.title || "Lessons"}
              </h1>
              <p className="text-muted-foreground">
                {course?.description || "Manage your course lessons"}
              </p>
            </div>
          </div>
          <Button onClick={createNewLesson} className="h-10">
            <Plus className="h-4 w-4 mr-2" />
            Create Lesson
          </Button>
        </div>

        {/* Lessons Grid */}
        {lessons.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <Play className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No lessons yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Create your first lesson to start building engaging learning
              experiences for your students.
            </p>
            <Button onClick={createNewLesson} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Lesson
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <Card
                key={lesson.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {lesson.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {lesson.description}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/dashboard/courses/${courseId}/lessons/${lesson.id}/edit`}
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLesson(lesson.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {lesson.estimated_duration} min
                      </div>
                      <div className="flex items-center gap-1">
                        <Settings className="h-4 w-4" />
                        {lesson.activities.length} activities
                      </div>
                    </div>

                    {lesson.activities.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                          Activities:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {lesson.activities
                            .slice(0, 3)
                            .map((activity, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {getActivityIcon(activity.type)}
                                <span className="ml-1">{activity.type}</span>
                              </Badge>
                            ))}
                          {lesson.activities.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{lesson.activities.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1"
                      >
                        <Link
                          href={`/dashboard/courses/${courseId}/lessons/${lesson.id}/edit`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1"
                      >
                        <Link
                          href={`/learn/courses/${courseId}/lessons/${lesson.id}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Preview
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Course Info */}
        {course && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Course Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Course Title
                  </p>
                  <p className="text-lg font-semibold">{course.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Join Code</p>
                  <p className="text-lg font-mono bg-gray-100 px-2 py-1 rounded">
                    {course.join_code}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Lessons
                  </p>
                  <p className="text-lg font-semibold">{lessons.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
