"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle,
  XCircle,
  BookOpen,
  Clock,
  Target,
} from "lucide-react";

interface LessonInvitePageProps {
  params: Promise<{ token: string }>;
}

interface LessonDetails {
  id: string;
  title: string;
  description: string;
  course_title: string;
  course_subject: string;
  teacher_name: string;
  estimated_duration: number;
  learning_objectives: string[];
}

export default function LessonInvitePage({ params }: LessonInvitePageProps) {
  const [token, setToken] = useState<string>("");
  const [lessonDetails, setLessonDetails] = useState<LessonDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getToken = async () => {
      const resolvedParams = await params;
      setToken(resolvedParams.token);
    };
    getToken();
  }, [params]);

  useEffect(() => {
    if (token) {
      loadInviteDetails();
    }
  }, [token]);

  const loadInviteDetails = async () => {
    try {
      const supabase = createClient();

      // Get lesson details by join code
      const { data: lesson, error: lessonError } = await supabase
        .from("lessons")
        .select(
          `
          id, title, description, estimated_duration, learning_objectives,
          courses(title, subject, profiles(full_name))
        `
        )
        .eq("join_code", token)
        .single();

      if (lessonError || !lesson) {
        setError("Invalid join code");
        setLoading(false);
        return;
      }

      setLessonDetails({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        course_title: lesson.courses.title,
        course_subject: lesson.courses.subject,
        teacher_name: lesson.courses.profiles.full_name,
        estimated_duration: lesson.estimated_duration || 0,
        learning_objectives: lesson.learning_objectives || [],
      });
      setLoading(false);
    } catch (error) {
      console.error("Error loading lesson details:", error);
      setError("Failed to load lesson details");
      setLoading(false);
    }
  };

  const handleJoinLesson = async () => {
    try {
      setJoining(true);
      setError(null);

      const response = await fetch("/api/join/lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          join_code: token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join lesson");
      }

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/learn/activities/${data.lesson.id}`);
        }, 2000);
      } else {
        setError(data.message || "Failed to join lesson");
      }
    } catch (error) {
      console.error("Error joining lesson:", error);
      setError(
        error instanceof Error ? error.message : "Failed to join lesson"
      );
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading invite details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/learn")} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Successfully Joined!</CardTitle>
            <CardDescription>
              You have been assigned this lesson. Redirecting...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Lesson Assignment</CardTitle>
          <CardDescription>You've been assigned a new lesson</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {lessonDetails && (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">
                  {lessonDetails.title}
                </h2>
                <p className="text-muted-foreground mb-2">
                  {lessonDetails.description}
                </p>
                <p className="text-sm text-muted-foreground">
                  From: {lessonDetails.course_title} (
                  {lessonDetails.course_subject})
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Clock className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-medium">
                    {lessonDetails.estimated_duration} minutes
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Estimated Duration
                  </p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Target className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-medium">
                    {lessonDetails.learning_objectives.length} objectives
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Learning Goals
                  </p>
                </div>
              </div>

              {lessonDetails.learning_objectives.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Learning Objectives:</h3>
                  <ul className="space-y-1">
                    {lessonDetails.learning_objectives.map(
                      (objective, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground"
                        >
                          • {objective}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleJoinLesson}
                  disabled={joining}
                  className="flex-1 max-w-xs"
                >
                  {joining ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Joining...
                    </>
                  ) : (
                    "Start Lesson"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/learn")}
                  className="flex-1 max-w-xs"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
