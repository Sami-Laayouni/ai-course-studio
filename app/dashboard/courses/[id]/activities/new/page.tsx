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
import { ArrowLeft, Brain, Save, Zap } from "lucide-react";
import Link from "next/link";
import SimpleZapierBuilder from "@/components/learning/simple-zapier-builder";
import { Checkbox } from "@/components/ui/checkbox";

interface NewActivityPageProps {
  params: Promise<{ id: string }>;
}

interface Student {
  id: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export default function NewActivityPage({ params }: NewActivityPageProps) {
  const [courseId, setCourseId] = useState<string>("");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [assignToAll, setAssignToAll] = useState<boolean>(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
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
      loadStudents(resolvedParams.id);

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
      
      // Load assigned students if they exist
      // assigned_to can be the JSON string "all" or an array of student IDs
      if (data.assigned_to) {
        // Check if it's the string "all" (could be stored as JSON string or plain string)
        if (data.assigned_to === "all" || data.assigned_to === '"all"') {
          setAssignToAll(true);
          setSelectedStudents([]);
        } else if (Array.isArray(data.assigned_to) && data.assigned_to.length > 0) {
          setAssignToAll(false);
          setSelectedStudents(data.assigned_to);
        } else {
          // Empty array or null - default to all
          setAssignToAll(true);
          setSelectedStudents([]);
        }
      } else {
        // Default to all students
        setAssignToAll(true);
        setSelectedStudents([]);
      }
      
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

  const loadStudents = async (id: string) => {
    try {
      const response = await fetch(`/api/courses/${id}/students`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        // Auto-select all students by default
        if (data.students && data.students.length > 0) {
          setSelectedStudents(data.students.map((s: Student) => s.id));
        }
      } else {
        console.error("Failed to load students");
        setStudents([]);
      }
    } catch (error) {
      console.error("Error loading students:", error);
      setStudents([]);
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

    if (!title) {
      setError("Please fill in title");
      return;
    }

    // Determine assigned_to value
    // Store "all" as JSON string or array of student IDs
    const assignedTo = assignToAll ? "all" : selectedStudents;

    // Create activity in database first if it doesn't exist
    if (!activityId) {
      try {
        setIsLoading(true);
        const activityData: any = {
            course_id: courseId,
            title,
            description: description || "",
            activity_type: "interactive", // Use 'interactive' which is definitely in the allowed list
            content: {}, // Empty JSONB object
            is_adaptive: true,
            order_index: 0,
            points: 0,
        };

        // Add assigned_to if the column exists
        try {
          activityData.assigned_to = assignedTo;
        } catch (e) {
          console.log("assigned_to column might not exist, skipping...");
        }

        const { data, error } = await supabase
          .from("activities")
          .insert(activityData)
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
    } else {
      // Update existing activity with assigned_to
      try {
        const updateData: any = {
          title,
          description: description || "",
        };
        
        // Add assigned_to if the column exists
        try {
          updateData.assigned_to = assignedTo;
        } catch (e) {
          console.log("assigned_to column might not exist, skipping...");
        }

        const { error } = await supabase
          .from("activities")
          .update(updateData)
          .eq("id", activityId);

        if (error) {
          console.error("Error updating activity:", error);
        }
      } catch (error) {
        console.error("Error updating activity:", error);
      }
    }

    // Save basic info and open builder
    setBasicInfoComplete(true);
    setShowBuilder(true);
  };

  const handleActivityCreated = async (activity: any) => {
    try {
      setIsLoading(true);

      // Determine assigned_to value
      const assignedTo = assignToAll ? "all" : selectedStudents;

      // Save activity to database - use title and description from form, not from activity
      // Only include columns that exist in the database
      const activityData: any = {
        course_id: courseId,
        title: title, // Use title from form
        description: description, // Use description from form
        content: activity.content || activity,
        activity_type: "interactive", // Use 'interactive' which exists in the schema
        points: activity.points || 100,
        is_adaptive: true,
        order_index: 0,
      };

      // Add assigned_to if the column exists
      try {
        activityData.assigned_to = assignedTo;
      } catch (e) {
        console.log("assigned_to column might not exist, skipping...");
      }

      // Only add optional columns if they exist in the database schema
      // These might not exist, so we'll try to add them but won't fail if they don't

      if (activityId) {
        // Update existing
        const { error } = await supabase
          .from("activities")
          .update(activityData)
          .eq("id", activityId);
        if (error) throw error;
        
        // Earl analysis is automatically triggered by the API route, no need to call it again
      } else {
        // Create new
        const { data, error } = await supabase
          .from("activities")
          .insert(activityData)
          .select()
          .single();
        if (error) throw error;
        setActivityId(data.id);
        
        // Earl analysis is automatically triggered by the API route, no need to call it again
      }

      router.push(`/dashboard/courses/${courseId}`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuilderClose = async () => {
    // Save title/description and assigned_to changes if activityId exists
    if (activityId && (title || description)) {
      try {
        const assignedTo = assignToAll ? "all" : selectedStudents;
        const updateData: any = {
          title,
          description,
        };

        // Add assigned_to if the column exists
        try {
          updateData.assigned_to = assignedTo;
        } catch (e) {
          console.log("assigned_to column might not exist, skipping...");
        }

        const { error } = await supabase
          .from("activities")
          .update(updateData)
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

                {/* Assign to Students */}
                <div className="space-y-3">
                  <Label>Assign to Specific Students</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="assign-all"
                        checked={assignToAll}
                        onCheckedChange={(checked) => {
                          setAssignToAll(checked === true);
                          if (checked) {
                            // Select all students when "assign to all" is checked
                            setSelectedStudents(students.map((s) => s.id));
                          }
                        }}
                      />
                      <Label
                        htmlFor="assign-all"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Assign to all students in the class
                      </Label>
                  </div>

                    {!assignToAll && (
                      <div className="space-y-2 pl-6 border-l-2 border-border">
                        <Label className="text-sm text-muted-foreground">
                          Select specific students:
                        </Label>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {students.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No students enrolled in this course yet.
                            </p>
                          ) : (
                            students.map((student) => (
                              <div
                                key={student.id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={student.id}
                                  checked={selectedStudents.includes(student.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedStudents((prev) => [
                                        ...prev,
                                        student.id,
                                      ]);
                                    } else {
                                      setSelectedStudents((prev) =>
                                        prev.filter((id) => id !== student.id)
                                      );
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={student.id}
                                  className="text-sm font-normal cursor-pointer"
                          >
                                  {student.profiles?.full_name || "Unknown Student"}
                                  {student.profiles?.email && (
                                    <span className="text-muted-foreground ml-1">
                                      ({student.profiles.email})
                                    </span>
                                  )}
                                </Label>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
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
