"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function JoinCoursePage() {
  const [joinCode, setJoinCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [joinedCourse, setJoinedCourse] = useState<any>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleJoinCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!joinCode || joinCode.trim().length === 0) {
      setError("Please enter a join code");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/join/course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          join_code: joinCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Log the full error for debugging
        console.error("API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        throw new Error(data.error || data.details || "Failed to join course");
      }

      if (data.success) {
        setSuccess(true);
        setJoinedCourse(data.course);
        setJoinCode("");
        
        // Redirect to the course after 2 seconds
        setTimeout(() => {
          router.push(`/learn/courses/${data.course.id}`);
        }, 2000);
      } else {
        throw new Error(data.error || "Failed to join course");
      }
    } catch (error: any) {
      console.error("Error joining course:", error);
      setError(error.message || "Failed to join course. Please check the code and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/learn">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Join a Course
            </CardTitle>
            <CardDescription>
              Enter the course join code provided by your teacher
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success && joinedCourse ? (
              <div className="text-center py-8 space-y-4">
                <div className="h-16 w-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Successfully Joined!
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    You've been enrolled in <strong>{joinedCourse.title}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Redirecting to course...
                  </p>
                </div>
                <Button asChild>
                  <Link href={`/learn/courses/${joinedCourse.id}`}>
                    Go to Course
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleJoinCourse} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="joinCode">Course Join Code</Label>
                  <Input
                    id="joinCode"
                    placeholder="Enter 6-character code (e.g., ABC123)"
                    value={joinCode}
                    onChange={(e) => {
                      // Convert to uppercase and limit to 6 characters
                      const value = e.target.value.toUpperCase().slice(0, 6);
                      setJoinCode(value);
                      setError(null);
                    }}
                    className="text-center text-2xl font-mono font-bold tracking-widest"
                    maxLength={6}
                    required
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Ask your teacher for the course join code
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <p>{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !joinCode || joinCode.length < 3}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Join Course
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h4 className="font-medium">How to join a course:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Ask your teacher for the course join code</li>
                <li>Enter the code in the field above</li>
                <li>Click "Join Course" to enroll</li>
                <li>Start learning immediately!</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

