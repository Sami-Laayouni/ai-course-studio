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
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

interface NewLessonPageProps {
  params: Promise<{ id: string }>;
}

export default function NewLessonPage({ params }: NewLessonPageProps) {
  const [courseId, setCourseId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // Initialize courseId from params
  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setCourseId(resolvedParams.id);
    };
    initializeParams();
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const lessonData = {
        course_id: courseId,
        title,
        description,
        lesson_goal: "", // Can be added in editor
        learning_objectives: [], // Can be added in editor
        estimated_duration: estimatedDuration
          ? Number.parseInt(estimatedDuration)
          : null,
        content_source_type: "manual",
        content_source_data: {},
        generate_ai_plan: false,
      };

      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lessonData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create lesson");
      }

      // Redirect to the visual lesson editor
      router.push(
        `/dashboard/courses/${courseId}/lessons/${data.lesson.id}/edit`
      );
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
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
            <Link href={`/dashboard/courses/${courseId}/lessons`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lessons
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create New Lesson</CardTitle>
            <CardDescription>
              Give your lesson a name and description. You can add activities, quizzes, and interactive content in the editor after creation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Lesson Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Introduction to Fractions"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of what this lesson covers..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="45"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                  />
                </div>
              </div>

              {/* Quick Tips */}
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                      Quick Start Tips
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 list-disc list-inside">
                      <li>Start with a clear title and description</li>
                      <li>Add activities and content in the visual editor</li>
                      <li>Use AI to generate quizzes and interactive content</li>
                    </ul>
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={isLoading} className="flex-1" size="lg">
                  {isLoading ? "Creating..." : "Create Lesson & Open Editor"}
                </Button>
                <Button type="button" variant="outline" size="lg" asChild>
                  <Link href={`/dashboard/courses/${courseId}`}>
                    Cancel
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
