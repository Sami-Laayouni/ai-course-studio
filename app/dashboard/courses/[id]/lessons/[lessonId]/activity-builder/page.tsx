"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  Play,
  Settings,
  Brain,
  MessageSquare,
  Video,
  FileText,
  Users,
  Zap,
  Trash2,
  Edit,
  Save,
  Eye,
  ArrowRight,
  CheckCircle,
  Clock,
  Star,
} from "lucide-react";
import Link from "next/link";

interface ActivityBuilderPageProps {
  params: Promise<{ id: string; lessonId: string }>;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  type: string;
  subtype?: string;
  content: any;
  difficulty: number;
  duration: number;
  points: number;
  order_index: number;
  is_adaptive: boolean;
  is_collaborative: boolean;
  collaboration_settings?: any;
  x: number;
  y: number;
  connections: string[];
}

const ACTIVITY_TYPES = [
  {
    value: "ai_chat",
    label: "AI Chat",
    description: "Personalized AI conversation",
    icon: Brain,
    color: "bg-blue-500",
    subtypes: [
      { value: "concept_exploration", label: "Concept Exploration" },
      { value: "q_and_a", label: "Q&A Session" },
      { value: "tutoring", label: "Personal Tutoring" },
    ],
  },
  {
    value: "quiz",
    label: "Quiz",
    description: "Interactive assessment",
    icon: CheckCircle,
    color: "bg-green-500",
    subtypes: [
      { value: "multiple_choice", label: "Multiple Choice" },
      { value: "true_false", label: "True/False" },
      { value: "short_answer", label: "Short Answer" },
      { value: "matching", label: "Matching" },
    ],
  },
  {
    value: "video",
    label: "Video",
    description: "Educational video content",
    icon: Video,
    color: "bg-red-500",
    subtypes: [
      { value: "youtube", label: "YouTube Video" },
      { value: "upload", label: "Uploaded Video" },
      { value: "live", label: "Live Stream" },
    ],
  },
  {
    value: "reading",
    label: "Reading",
    description: "Text-based learning",
    icon: FileText,
    color: "bg-purple-500",
    subtypes: [
      { value: "article", label: "Article" },
      { value: "pdf", label: "PDF Document" },
      { value: "interactive_text", label: "Interactive Text" },
    ],
  },
  {
    value: "collaborative",
    label: "Collaborative",
    description: "Group activities",
    icon: Users,
    color: "bg-orange-500",
    subtypes: [
      { value: "discussion", label: "Discussion Forum" },
      { value: "peer_review", label: "Peer Review" },
      { value: "group_project", label: "Group Project" },
      { value: "brainstorming", label: "Brainstorming" },
    ],
  },
  {
    value: "custom",
    label: "Custom Activity",
    description: "AI-generated custom activity",
    icon: Zap,
    color: "bg-indigo-500",
    subtypes: [
      { value: "simulation", label: "Simulation" },
      { value: "game", label: "Educational Game" },
      { value: "experiment", label: "Virtual Experiment" },
      { value: "creative", label: "Creative Project" },
    ],
  },
];

export default function ActivityBuilderPage({
  params,
}: ActivityBuilderPageProps) {
  const [courseId, setCourseId] = useState<string>("");
  const [lessonId, setLessonId] = useState<string>("");
  const [lesson, setLesson] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newActivityType, setNewActivityType] = useState("");
  const [newActivitySubtype, setNewActivitySubtype] = useState("");
  const [draggedActivity, setDraggedActivity] = useState<Activity | null>(null);
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [buildSteps, setBuildSteps] = useState<
    { id: string; label: string; status: "pending" | "active" | "done" }[]
  >([]);
  const [agenticPreview, setAgenticPreview] = useState<any | null>(null);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [agentCritique, setAgentCritique] = useState<string>("");
  const [agentRawJSON, setAgentRawJSON] = useState<string>("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setCourseId(resolvedParams.id);
      setLessonId(resolvedParams.lessonId);
      loadLesson(resolvedParams.lessonId);
      loadActivities(resolvedParams.lessonId);
    };
    loadParams();
  }, [params]);

  const loadLesson = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setLesson(data);
    } catch (error) {
      console.error("Error loading lesson:", error);
    }
  };

  const loadActivities = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("lesson_id", id)
        .order("order_index");

      if (error) throw error;

      // Add position data for canvas
      const activitiesWithPosition =
        data?.map((activity, index) => ({
          ...activity,
          x: (index % 3) * 300 + 50,
          y: Math.floor(index / 3) * 200 + 50,
          connections: [],
        })) || [];

      setActivities(activitiesWithPosition);
    } catch (error) {
      console.error("Error loading activities:", error);
    }
  };

  const addActivity = async (type: string, subtype: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const activityData = {
        course_id: courseId,
        lesson_id: lessonId,
        title: `New ${type} Activity`,
        description: "",
        activity_type: type,
        activity_subtype: subtype,
        content: {},
        difficulty_level: 3,
        estimated_duration: 15,
        points: 10,
        order_index: activities.length,
        is_adaptive: true,
        is_collaborative: type === "collaborative",
        collaboration_settings:
          type === "collaborative"
            ? {
                max_participants: 4,
                requires_approval: false,
                peer_review: true,
              }
            : {},
      };

      const { data: activity, error } = await supabase
        .from("activities")
        .insert(activityData)
        .select()
        .single();

      if (error) throw error;

      const newActivity: Activity = {
        ...activity,
        x: (activities.length % 3) * 300 + 50,
        y: Math.floor(activities.length / 3) * 200 + 50,
        connections: [],
      };

      setActivities([...activities, newActivity]);
      setShowAddDialog(false);
      setNewActivityType("");
      setNewActivitySubtype("");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const updateActivity = async (activity: Activity) => {
    try {
      const { error } = await supabase
        .from("activities")
        .update({
          title: activity.title,
          description: activity.description,
          content: activity.content,
          difficulty_level: activity.difficulty,
          estimated_duration: activity.duration,
          points: activity.points,
          is_adaptive: activity.is_adaptive,
          is_collaborative: activity.is_collaborative,
          collaboration_settings: activity.collaboration_settings,
        })
        .eq("id", activity.id);

      if (error) throw error;

      setActivities(
        activities.map((a) => (a.id === activity.id ? activity : a))
      );
      setSelectedActivity(null);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  };

  const deleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", activityId);

      if (error) throw error;

      setActivities(activities.filter((a) => a.id !== activityId));
      setSelectedActivity(null);
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const generateWithAI = async (activity: Activity) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/generate-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_type: activity.type,
          activity_subtype: activity.subtype,
          lesson_context: lesson,
          learning_objectives: lesson.learning_objectives,
          custom_requirements: activity.content.requirements || "",
        }),
      });

      const data = await response.json();
      if (data.content) {
        const updatedActivity = {
          ...activity,
          content: data.content,
          title: data.content.title || activity.title,
          description: data.content.description || activity.description,
        };
        setSelectedActivity(updatedActivity);
      }
    } catch (error) {
      console.error("Error generating with AI:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const runBuildSteps = (current: number) => {
    setBuildSteps((prev) =>
      prev.map((s, idx) =>
        idx < current
          ? { ...s, status: "done" }
          : idx === current
          ? { ...s, status: "active" }
          : { ...s, status: "pending" }
      )
    );
  };

  const buildAgenticActivity = async (activity: Activity) => {
    setAgenticPreview(null);
    setAgentLogs([]);
    setBuildSteps([
      { id: "start", label: "Starting agent", status: "active" },
      { id: "draft", label: "Drafting", status: "pending" },
      { id: "critique", label: "Critiquing & refining", status: "pending" },
      { id: "validate", label: "Validating", status: "pending" },
      { id: "final", label: "Preview ready", status: "pending" },
    ]);

    try {
      await runAgentStream(activity);
    } catch (e) {
      console.error("Agentic build error:", e);
      setAgentLogs((prev) => [...prev, `error: ${String(e)}`]);
    }
  };

  const runAgentStream = async (activity: Activity) => {
    const res = await fetch("/api/ai/generate-activity/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        freeform_prompt:
          activity.content?.requirements || activity.description || "",
        lesson_context: lesson || {},
        learning_objectives: lesson?.learning_objectives || [],
        custom_requirements: activity.content?.constraints || "",
        maxIterations: 3,
        temperature: 0.7,
      }),
    });

    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";

    const updateStep = (id: string) => {
      setBuildSteps((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: "active" }
            : s.id === "final" && id === "final"
            ? { ...s, status: "active" }
            : s
        )
      );
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() || "";
      for (const chunk of chunks) {
        const lines = chunk.split("\n");
        const eventLine = lines.find((l) => l.startsWith("event:"));
        const dataLine = lines.find((l) => l.startsWith("data:"));
        if (!eventLine || !dataLine) continue;
        const event = eventLine.replace("event:", "").trim();
        const json = dataLine.replace("data:", "").trim();
        let data: any = null;
        try {
          data = JSON.parse(json);
        } catch {
          data = { message: json };
        }

        setAgentLogs((prev) => [...prev, `${event}: ${json.slice(0, 200)}`]);

        if (event === "start") updateStep("start");
        if (event === "draft") {
          updateStep("draft");
          try {
            const parsed = JSON.parse(data.preview || "{}");
            setAgenticPreview(parsed);
          } catch {}
        }
        if (event === "critique") updateStep("critique");
        if (event === "critique" && typeof data?.text === "string") {
          setAgentCritique(data.text);
        }
        if (event === "validate") updateStep("validate");
        if (event === "refine") {
          try {
            const parsed = JSON.parse(data.preview || "{}");
            setAgenticPreview(parsed);
            setAgentRawJSON(JSON.stringify(parsed, null, 2));
          } catch {}
        }
        if (event === "final") {
          setAgenticPreview(data);
          try {
            setAgentRawJSON(JSON.stringify(data, null, 2));
          } catch {}
          setBuildSteps((prev) =>
            prev.map((s) =>
              s.id === "final"
                ? { ...s, status: "done" }
                : s.id !== "final"
                ? { ...s, status: s.status === "active" ? "done" : s.status }
                : s
            )
          );
        }
      }
    }
  };

  const publishAgenticPreview = async () => {
    if (!selectedActivity || !agenticPreview) return;
    const updated = {
      ...selectedActivity,
      content: agenticPreview,
      title: agenticPreview.title || selectedActivity.title,
      description: agenticPreview.description || selectedActivity.description,
      activity_type: "custom",
      activity_subtype: agenticPreview.content?.mode || "custom",
      estimated_duration:
        agenticPreview.estimated_duration || selectedActivity.duration,
      points: agenticPreview.points || selectedActivity.points,
    } as any;

    setSelectedActivity(updated);
    setActivities(activities.map((a) => (a.id === updated.id ? updated : a)));
    // Persist
    try {
      const { error } = await supabase
        .from("activities")
        .update({
          title: updated.title,
          description: updated.description,
          content: updated.content,
          activity_type: updated.activity_type,
          activity_subtype: updated.activity_subtype,
          estimated_duration: updated.estimated_duration,
          points: updated.points,
        })
        .eq("id", updated.id);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to publish agentic preview:", err);
    }
  };

  const handleDragStart = (e: React.DragEvent, activity: Activity) => {
    setDraggedActivity(activity);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedActivity) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const updatedActivity = {
      ...draggedActivity,
      x: Math.max(0, x - 100),
      y: Math.max(0, y - 50),
    };

    setActivities(
      activities.map((a) => (a.id === draggedActivity.id ? updatedActivity : a))
    );
    setDraggedActivity(null);
  };

  const startConnection = (activityId: string) => {
    setConnectionMode(true);
    setConnectionStart(activityId);
  };

  const completeConnection = (targetActivityId: string) => {
    if (connectionStart && connectionStart !== targetActivityId) {
      const updatedActivities = activities.map((activity) => {
        if (activity.id === connectionStart) {
          return {
            ...activity,
            connections: [...activity.connections, targetActivityId],
          };
        }
        return activity;
      });
      setActivities(updatedActivities);
    }
    setConnectionMode(false);
    setConnectionStart(null);
  };

  const renderActivityNode = (activity: Activity) => {
    const activityType = ACTIVITY_TYPES.find((t) => t.value === activity.type);
    const Icon = activityType?.icon || Zap;

    return (
      <div
        key={activity.id}
        className={`absolute bg-white border-2 rounded-lg p-4 shadow-lg cursor-move min-w-[200px] ${
          selectedActivity?.id === activity.id
            ? "border-blue-500"
            : "border-gray-300"
        } ${
          connectionMode && connectionStart === activity.id
            ? "ring-2 ring-blue-500"
            : ""
        }`}
        style={{ left: activity.x, top: activity.y }}
        draggable
        onDragStart={(e) => handleDragStart(e, activity)}
        onClick={() => setSelectedActivity(activity)}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`p-2 rounded ${activityType?.color || "bg-gray-500"}`}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm">{activity.title}</h3>
            <p className="text-xs text-gray-500">{activityType?.label}</p>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                startConnection(activity.id);
              }}
              className="h-6 w-6 p-0"
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="h-6 w-6 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{activity.duration}m</span>
          <Star className="h-3 w-3" />
          <span>{activity.points}pts</span>
          {activity.is_collaborative && <Users className="h-3 w-3" />}
        </div>

        {activity.connections.map((connectionId) => {
          const targetActivity = activities.find((a) => a.id === connectionId);
          if (!targetActivity) return null;

          return (
            <div
              key={connectionId}
              className="absolute w-0.5 h-0.5 bg-blue-500"
              style={{
                left: targetActivity.x - activity.x + 100,
                top: targetActivity.y - activity.y + 25,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/courses/${courseId}/lessons`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Lessons
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Activity Builder</h1>
              <p className="text-muted-foreground">{lesson?.title}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Activity
            </Button>
            <Button
              variant="outline"
              onClick={() => setConnectionMode(!connectionMode)}
            >
              {connectionMode ? "Exit Connection Mode" : "Connect Activities"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Activity Canvas */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] relative overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Activity Flow</CardTitle>
                <CardDescription>
                  Drag and drop activities to create your lesson flow. Connect
                  activities to create sequences.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-full">
                <div
                  className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg relative"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {activities.map(renderActivityNode)}

                  {activities.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>
                          No activities yet. Add your first activity to get
                          started!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Details Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedActivity ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={selectedActivity.title}
                        onChange={(e) =>
                          setSelectedActivity({
                            ...selectedActivity,
                            title: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={selectedActivity.description}
                        onChange={(e) =>
                          setSelectedActivity({
                            ...selectedActivity,
                            description: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>Agentic description</Label>
                      <Textarea
                        placeholder="Describe exactly what to build (e.g., Carbon cycle diagram with blanks for processes and reservoirs)"
                        value={selectedActivity.content?.requirements || ""}
                        onChange={(e) =>
                          setSelectedActivity({
                            ...selectedActivity,
                            content: {
                              ...(selectedActivity.content || {}),
                              requirements: e.target.value,
                            },
                          })
                        }
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This text guides the agent to design and build a custom
                        activity.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Duration (min)</Label>
                        <Input
                          type="number"
                          value={selectedActivity.duration}
                          onChange={(e) =>
                            setSelectedActivity({
                              ...selectedActivity,
                              duration: Number(e.target.value),
                            })
                          }
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={selectedActivity.points}
                          onChange={(e) =>
                            setSelectedActivity({
                              ...selectedActivity,
                              points: Number(e.target.value),
                            })
                          }
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateActivity(selectedActivity)}
                            className="flex-1"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => setIsEditing(true)}
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              buildAgenticActivity(selectedActivity)
                            }
                            disabled={isLoading}
                          >
                            <Brain className="h-4 w-4 mr-2" /> Build
                          </Button>
                        </>
                      )}
                    </div>

                    {buildSteps.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          Build progress
                        </div>
                        <ul className="text-sm space-y-1">
                          {buildSteps.map((s) => (
                            <li key={s.id} className="flex items-center gap-2">
                              <span
                                className={
                                  s.status === "done"
                                    ? "text-green-600"
                                    : s.status === "active"
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }
                              >
                                {s.status === "done"
                                  ? "✓"
                                  : s.status === "active"
                                  ? "…"
                                  : "•"}
                              </span>
                              {s.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-3 p-3 border rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Preview</div>
                          <div className="text-xs text-muted-foreground">
                            Sidebar render
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={publishAgenticPreview}
                          disabled={!agenticPreview}
                        >
                          Publish to node
                        </Button>
                      </div>
                      <Tabs
                        defaultValue={agenticPreview ? "preview" : "raw"}
                        className="w-full"
                      >
                        <TabsList>
                          <TabsTrigger value="preview">Preview</TabsTrigger>
                          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                          <TabsTrigger value="critique">Critique</TabsTrigger>
                        </TabsList>
                        <TabsContent value="preview" className="mt-3">
                          {agenticPreview ? (
                            <div className="space-y-2 text-xs">
                              <div className="font-semibold">
                                {agenticPreview.title || "Untitled"}
                              </div>
                              <div className="text-muted-foreground">
                                {agenticPreview.description || ""}
                              </div>
                              {agenticPreview.content?.mode && (
                                <div>
                                  <span className="font-medium">Mode:</span>{" "}
                                  {agenticPreview.content.mode}
                                </div>
                              )}
                              {agenticPreview.content?.diagram && (
                                <div>
                                  <div className="font-medium mb-1">
                                    Diagram nodes
                                  </div>
                                  <ul className="list-disc ml-5">
                                    {(
                                      agenticPreview.content.diagram.nodes || []
                                    ).map((n: any) => (
                                      <li key={n.id}>
                                        {n.label}
                                        {n.isBlank ? " (blank)" : ""}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {Array.isArray(agenticPreview.content?.steps) &&
                                agenticPreview.content.steps.length > 0 && (
                                  <div>
                                    <div className="font-medium mb-1">
                                      Steps
                                    </div>
                                    <ol className="list-decimal ml-5">
                                      {agenticPreview.content.steps.map(
                                        (s: any, i: number) => (
                                          <li key={i}>
                                            <span className="font-medium">
                                              {s.title || `Step ${i + 1}`}:
                                            </span>{" "}
                                            {s.text}
                                          </li>
                                        )
                                      )}
                                    </ol>
                                  </div>
                                )}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              Waiting for draft…
                            </div>
                          )}
                        </TabsContent>
                        <TabsContent value="raw" className="mt-3">
                          <pre className="text-[10px] max-h-48 overflow-auto bg-muted/30 p-2 rounded">
                            {agentRawJSON ||
                              (agenticPreview
                                ? JSON.stringify(agenticPreview, null, 2)
                                : "(no data yet)")}
                          </pre>
                        </TabsContent>
                        <TabsContent value="critique" className="mt-3">
                          <pre className="text-[10px] max-h-48 overflow-auto bg-muted/30 p-2 rounded whitespace-pre-wrap">
                            {agentCritique || "(no critique yet)"}
                          </pre>
                        </TabsContent>
                      </Tabs>
                      {agentLogs.length > 0 && (
                        <div className="text-[10px] text-muted-foreground max-h-40 overflow-auto bg-muted/30 p-2 rounded">
                          {agentLogs.map((l, i) => (
                            <div key={i}>{l}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteActivity(selectedActivity.id)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Activity
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select an activity to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Activity Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Activity</DialogTitle>
              <DialogDescription>
                Choose the type of activity you want to add to your lesson.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={newActivityType} onValueChange={setNewActivityType}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ai_chat">AI Chat</TabsTrigger>
                <TabsTrigger value="quiz">Quiz</TabsTrigger>
                <TabsTrigger value="collaborative">Collaborative</TabsTrigger>
              </TabsList>

              {ACTIVITY_TYPES.map((type) => (
                <TabsContent
                  key={type.value}
                  value={type.value}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {type.subtypes?.map((subtype) => (
                      <Card
                        key={subtype.value}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          setNewActivitySubtype(subtype.value);
                          addActivity(type.value, subtype.value);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded ${type.color}`}>
                              <type.icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-medium">{subtype.label}</h3>
                              <p className="text-sm text-muted-foreground">
                                {type.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </DialogContent>
        </Dialog>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
