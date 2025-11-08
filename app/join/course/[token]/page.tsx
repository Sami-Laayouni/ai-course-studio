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
  Users,
  Clock,
} from "lucide-react";

interface CourseInvitePageProps {
  params: Promise<{ token: string }>;
}

interface CourseDetails {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade_level: string;
  teacher_name: string;
}

export default function CourseInvitePage({ params }: CourseInvitePageProps) {
  const [token, setToken] = useState<string>("");
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(
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

      // Normalize join code: trim whitespace and convert to uppercase
      const normalizedToken = token?.trim().toUpperCase();
      
      if (!normalizedToken) {
        setError("Invalid join code");
        setLoading(false);
        return;
      }

      // Get course details by join code (normalized to uppercase for consistent matching)
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select(
          `
          id, title, description, subject, grade_level,
          profiles(full_name)
        `
        )
        .eq("join_code", normalizedToken)
        .single();

      if (courseError || !course) {
        setError("Invalid join code");
        setLoading(false);
        return;
      }

      setCourseDetails({
        id: course.id,
        title: course.title,
        description: course.description,
        subject: course.subject,
        grade_level: course.grade_level,
        teacher_name: course.profiles.full_name,
      });
      setLoading(false);
    } catch (error) {
      console.error("Error loading course details:", error);
      setError("Failed to load course details");
      setLoading(false);
    }
  };

  const handleJoinCourse = async () => {
    try {
      setJoining(true);
      setError(null);

      // Normalize join code before sending to API
      const normalizedToken = token?.trim().toUpperCase();
      
      const response = await fetch("/api/join/course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          join_code: normalizedToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join course");
      }

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/learn/courses/${data.course.id}`);
        }, 2000);
      } else {
        setError(data.message || "Failed to join course");
      }
    } catch (error) {
      console.error("Error joining course:", error);
      setError(
        error instanceof Error ? error.message : "Failed to join course"
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
              You have been enrolled in the course. Redirecting...
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
          <CardTitle>Course Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a course
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {courseDetails && (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">
                  {courseDetails.title}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {courseDetails.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <BookOpen className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-medium">{courseDetails.subject}</p>
                  <p className="text-sm text-muted-foreground">Subject</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Users className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-medium">{courseDetails.grade_level}</p>
                  <p className="text-sm text-muted-foreground">Grade Level</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Clock className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-medium">{courseDetails.teacher_name}</p>
                  <p className="text-sm text-muted-foreground">Teacher</p>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleJoinCourse}
                  disabled={joining}
                  className="flex-1 max-w-xs"
                >
                  {joining ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Joining...
                    </>
                  ) : (
                    "Join Course"
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
