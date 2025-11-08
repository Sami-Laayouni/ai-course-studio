"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Brain, Save, Zap } from "lucide-react";
import Link from "next/link";
import SimpleZapierBuilder from "@/components/learning/simple-zapier-builder";

interface NewActivityPageProps {
  params: Promise<{ id: string }>;
}

const DIFFICULTY_LEVELS = [
  { value: 1, label: "Beginner" },
  { value: 2, label: "Easy" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Challenging" },
  { value: 5, label: "Advanced" },
];

export default function NewActivityPage({ params }: NewActivityPageProps) {
  const [courseId, setCourseId] = useState<string>("");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<number>(3);
  const [duration, setDuration] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [basicInfoComplete, setBasicInfoComplete] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setCourseId(resolvedParams.id);
      loadCourse(resolvedParams.id);

      // Check if editing existing activity
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get("id");
      if (editId) {
        setActivityId(editId);
        loadActivity(editId);
      } else {
        setIsLoadingData(false);
      }
    };
    loadParams();
  }, [params]);

  const loadActivity = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setTitle(data.title || "");
      setDescription(data.description || "");
      setDifficulty(data.difficulty_level || 3);
      setDuration(data.estimated_duration || 30);
      setIsLoadingData(false);
      // Don't auto-show builder - let user edit title/description first
      // They can click "Continue to Visual Builder" to open the builder
      setBasicInfoComplete(true);
    } catch (error) {
      console.error("Error loading activity:", error);
      setError("Failed to load activity");
      setIsLoadingData(false);
    }
  };

  const loadCourse = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setCourse(data);
    } catch (error) {
      console.error("Error loading course:", error);
    }
  };

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !duration) {
      setError("Please fill in title and duration");
      return;
    }

    // Create activity in database first if it doesn't exist
    if (!activityId) {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("activities")
          .insert({
            course_id: courseId,
            title,
            description: description || "",
            difficulty_level: difficulty,
            estimated_duration: duration,
            activity_type: "interactive", // Use 'interactive' which is definitely in the allowed list
            content: {}, // Empty JSONB object
            is_adaptive: true,
            order_index: 0,
            points: 0,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating activity:", error);
          setError(
            `Failed to create activity: ${error.message || "Unknown error"}`
          );
          setIsLoading(false);
          return;
        }

        setActivityId(data.id);
        setIsLoading(false);
      } catch (error: any) {
        console.error("Error creating activity:", error);
        setError(
          `Failed to create activity: ${error?.message || "Unknown error"}`
        );
        setIsLoading(false);
        return;
      }
    }

    // Save basic info and open builder
    setBasicInfoComplete(true);
    setShowBuilder(true);
  };

  const handleActivityCreated = async (activity: any) => {
    try {
      setIsLoading(true);

      // Save activity to database - use title and description from form, not from activity
      // Only include columns that exist in the database
      const activityData: any = {
        course_id: courseId,
        title: title, // Use title from form
        description: description, // Use description from form
        content: activity.content || activity,
        activity_type: "interactive", // Use 'interactive' which exists in the schema
        difficulty_level: difficulty,
        estimated_duration: duration || activity.estimated_duration || 30,
        points: activity.points || 100,
        is_adaptive: true,
        order_index: 0,
      };

      // Only add optional columns if they exist in the database schema
      // These might not exist, so we'll try to add them but won't fail if they don't

      if (activityId) {
        // Update existing
        const { error } = await supabase
          .from("activities")
          .update(activityData)
          .eq("id", activityId);
        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("activities")
          .insert(activityData)
          .select()
          .single();
        if (error) throw error;
        setActivityId(data.id);
      }

      router.push(`/dashboard/courses/${courseId}`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuilderClose = async () => {
    // Save title/description changes if activityId exists
    if (activityId && (title || description)) {
      try {
        const { error } = await supabase
          .from("activities")
          .update({
            title,
            description,
            difficulty_level: difficulty,
            estimated_duration: duration,
          })
          .eq("id", activityId);

        if (error) {
          console.error("Error saving title/description:", error);
        } else {
          console.log("Title/description saved successfully");
        }
      } catch (error) {
        console.error("Error saving title/description:", error);
      }
    }

    // Don't reset form - keep title/description so user can edit them
    setShowBuilder(false);
    // Title and description remain in state so user can modify them
  };

  // Load saved content when opening builder
  const [savedContent, setSavedContent] = useState<any>(null);

  useEffect(() => {
    const loadSavedContent = async () => {
      if (showBuilder && activityId) {
        try {
          const { data, error } = await supabase
            .from("activities")
            .select("content")
            .eq("id", activityId)
            .single();

          if (!error && data?.content) {
            setSavedContent(data.content);
          }
        } catch (error) {
          console.error("Error loading saved content:", error);
        }
      } else if (showBuilder && !activityId) {
        // Check localStorage for draft
        const draftKey = `activity_draft_${courseId}`;
        const drafts = Object.keys(localStorage)
          .filter((key) => key.startsWith(draftKey))
          .sort()
          .reverse();

        if (drafts.length > 0) {
          const latestDraft = localStorage.getItem(drafts[0]);
          if (latestDraft) {
            try {
              const parsed = JSON.parse(latestDraft);
              if (parsed.nodes && parsed.connections) {
                setSavedContent({
                  nodes: parsed.nodes,
                  connections: parsed.connections,
                  context_sources: parsed.context_sources || [],
                });
              }
            } catch (error) {
              console.error("Error loading draft:", error);
            }
          }
        }
      }
    };
    loadSavedContent();
  }, [showBuilder, activityId, courseId]);

  // Show Zapier builder if basic info is complete
  if (showBuilder) {
    return (
      <SimpleZapierBuilder
        onActivityCreated={handleActivityCreated}
        onClose={handleBuilderClose}
        courseId={courseId}
        title={title}
        description={description}
        activityId={activityId || undefined}
        initialContent={savedContent}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/courses/${courseId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Link>
          </Button>
        </div>

        {isLoadingData ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                {activityId ? "Edit Activity" : "Create Custom Activity"}
              </CardTitle>
              <CardDescription>
                {course
                  ? `${activityId ? "Edit" : "Create a custom"} activity for "${
                      course.title
                    }" using the visual builder`
                  : `${
                      activityId ? "Edit" : "Create a new"
                    } custom learning activity`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
                {/* Activity Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Activity Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Introduction to Photosynthesis"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Activity Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what students will learn or do in this activity..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Duration and Difficulty */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">
                      Estimated Duration (minutes) *
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      min="5"
                      max="180"
                      value={duration}
                      onChange={(e) =>
                        setDuration(Number.parseInt(e.target.value) || 30)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select
                      value={difficulty.toString()}
                      onValueChange={(value) =>
                        setDifficulty(Number.parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_LEVELS.map((level) => (
                          <SelectItem
                            key={level.value}
                            value={level.value.toString()}
                          >
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <p className="font-medium mb-1">Error:</p>
                    <p>{error}</p>
                    <p className="text-xs mt-2 text-muted-foreground">
                      Check the browser console for more details.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1"
                    size="lg"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Continue to Visual Builder
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
