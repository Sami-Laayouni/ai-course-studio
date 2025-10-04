"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileText,
  Plus,
  Calendar as CalendarIcon,
  Users,
  Clock,
  Edit,
  Trash2,
  Copy,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  due_date: string | null;
  points: number;
  is_published: boolean;
  created_at: string;
  courses: {
    title: string;
    subject: string;
  };
  lessons?: {
    title: string;
    description: string;
  };
  assignment_submissions: Array<{
    id: string;
    status: string;
    grade: number | null;
    submitted_at: string | null;
    profiles: {
      full_name: string;
      email: string;
    };
  }>;
}

interface Course {
  id: string;
  title: string;
  subject: string;
  grade_level: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  course_id: string;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isPublishing, setIsPublishing] = useState(false);

  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    instructions: "",
    points: 10,
    due_date: "",
    is_published: false,
  });

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load assignments
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select(
          `
          *,
          courses(title, subject),
          lessons(title, description),
          assignment_submissions(
            id, status, grade, submitted_at,
            profiles(full_name, email)
          )
        `
        )
        .order("created_at", { ascending: false });

      setAssignments(assignmentsData || []);

      // Load courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, title, subject, grade_level")
        .order("title");

      setCourses(coursesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLessons = async (courseId: string) => {
    try {
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("id, title, description, course_id")
        .eq("course_id", courseId)
        .order("title");

      setLessons(lessonsData || []);
    } catch (error) {
      console.error("Error loading lessons:", error);
    }
  };

  const handleCreateAssignment = async () => {
    try {
      setIsPublishing(true);

      const assignmentData = {
        ...newAssignment,
        course_id: selectedCourse,
        lesson_id: selectedLesson || null,
        due_date: dueDate ? dueDate.toISOString() : null,
      };

      const { data, error } = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignmentData),
      }).then((res) => res.json());

      if (error) {
        throw new Error(error);
      }

      // Reset form
      setNewAssignment({
        title: "",
        description: "",
        instructions: "",
        points: 10,
        due_date: "",
        is_published: false,
      });
      setSelectedCourse("");
      setSelectedLesson("");
      setDueDate(undefined);
      setIsCreateDialogOpen(false);

      // Reload data
      await loadData();
    } catch (error) {
      console.error("Error creating assignment:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishAssignment = async (assignmentId: string) => {
    try {
      const { error } = await fetch("/api/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignmentId,
          is_published: true,
        }),
      }).then((res) => res.json());

      if (error) {
        throw new Error(error);
      }

      await loadData();
    } catch (error) {
      console.error("Error publishing assignment:", error);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;

    try {
      const { error } = await fetch(`/api/assignments?id=${assignmentId}`, {
        method: "DELETE",
      }).then((res) => res.json());

      if (error) {
        throw new Error(error);
      }

      await loadData();
    } catch (error) {
      console.error("Error deleting assignment:", error);
    }
  };

  const copyInviteLink = async (assignmentId: string) => {
    try {
      // Create lesson invite for this assignment
      const { data: assignment } = await supabase
        .from("assignments")
        .select("lesson_id, course_id")
        .eq("id", assignmentId)
        .single();

      if (assignment?.lesson_id) {
        const { data: invite } = await fetch("/api/invites/lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lesson_id: assignment.lesson_id,
            course_id: assignment.course_id,
            expires_at: null,
            max_uses: null,
          }),
        }).then((res) => res.json());

        if (invite?.invite?.invite_url) {
          await navigator.clipboard.writeText(invite.invite.invite_url);
          alert("Invite link copied to clipboard!");
        }
      }
    } catch (error) {
      console.error("Error creating invite link:", error);
    }
  };

  const getSubmissionStats = (assignment: Assignment) => {
    const totalStudents = assignment.assignment_submissions.length;
    const submitted = assignment.assignment_submissions.filter(
      (s) => s.status === "submitted" || s.status === "graded"
    ).length;
    const graded = assignment.assignment_submissions.filter(
      (s) => s.status === "graded"
    ).length;

    return { totalStudents, submitted, graded };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Assignments</h1>
            <p className="text-muted-foreground">
              Manage and track student assignments
            </p>
          </div>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
                <DialogDescription>
                  Create a new assignment for your students
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newAssignment.title}
                    onChange={(e) =>
                      setNewAssignment((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Assignment title"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newAssignment.description}
                    onChange={(e) =>
                      setNewAssignment((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Assignment description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Instructions</label>
                  <Textarea
                    value={newAssignment.instructions}
                    onChange={(e) =>
                      setNewAssignment((prev) => ({
                        ...prev,
                        instructions: e.target.value,
                      }))
                    }
                    placeholder="Detailed instructions for students"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Course</label>
                    <Select
                      value={selectedCourse}
                      onValueChange={(value) => {
                        setSelectedCourse(value);
                        setSelectedLesson("");
                        loadLessons(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title} - {course.subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Lesson (Optional)
                    </label>
                    <Select
                      value={selectedLesson}
                      onValueChange={setSelectedLesson}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select lesson" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No specific lesson</SelectItem>
                        {lessons.map((lesson) => (
                          <SelectItem key={lesson.id} value={lesson.id}>
                            {lesson.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Points</label>
                    <Input
                      type="number"
                      value={newAssignment.points}
                      onChange={(e) =>
                        setNewAssignment((prev) => ({
                          ...prev,
                          points: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Due Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP") : "No due date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="publish"
                    checked={newAssignment.is_published}
                    onChange={(e) =>
                      setNewAssignment((prev) => ({
                        ...prev,
                        is_published: e.target.checked,
                      }))
                    }
                  />
                  <label htmlFor="publish" className="text-sm font-medium">
                    Publish immediately
                  </label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateAssignment}
                    disabled={isPublishing}
                  >
                    {isPublishing ? "Creating..." : "Create Assignment"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Assignments List */}
        <div className="space-y-6">
          {assignments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No assignments yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Create your first assignment to get started
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </CardContent>
            </Card>
          ) : (
            assignments.map((assignment) => {
              const stats = getSubmissionStats(assignment);
              const isOverdue =
                assignment.due_date &&
                new Date(assignment.due_date) < new Date();

              return (
                <Card
                  key={assignment.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">
                            {assignment.title}
                          </h3>
                          <Badge
                            variant={
                              assignment.is_published ? "default" : "secondary"
                            }
                          >
                            {assignment.is_published ? "Published" : "Draft"}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive">Overdue</Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {assignment.courses.title} -{" "}
                          {assignment.courses.subject}
                        </p>

                        {assignment.lessons && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Lesson: {assignment.lessons.title}
                          </p>
                        )}

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {assignment.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(assignment.id)}
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.totalStudents}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total Students
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {stats.submitted}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Submitted
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {stats.graded}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Graded
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {assignment.points}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Points
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        {assignment.due_date && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Due:{" "}
                            {new Date(assignment.due_date).toLocaleDateString()}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          Created:{" "}
                          {new Date(assignment.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {!assignment.is_published && (
                        <Button
                          size="sm"
                          onClick={() => handlePublishAssignment(assignment.id)}
                        >
                          Publish
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
