"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Clock,
  Users,
  Target,
  Star,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Eye,
  Send,
  Zap,
  Brain,
  FileText,
  Video,
  Play,
  MessageSquare,
  Gamepad2,
} from "lucide-react";

interface AssignmentCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignmentCreated: (assignment: any) => void;
  courseId: string;
  course: any;
  activities: any[];
  students: any[];
}

interface AssignmentActivity {
  id: string;
  type: string;
  title: string;
  points: number;
  required: boolean;
  order: number;
}

interface AssignmentSettings {
  due_date: string;
  time_limit: number; // in minutes
  attempts_allowed: number;
  late_submission: boolean;
  late_penalty: number; // percentage
  auto_grade: boolean;
  show_answers: boolean;
  allow_resubmission: boolean;
  notification_reminders: boolean;
  peer_review: boolean;
  group_assignment: boolean;
  group_size: number;
}

const ACTIVITY_TYPES = [
  { id: "ai_chat", name: "AI Chat", icon: Brain, color: "text-purple-600" },
  { id: "quiz", name: "Quiz", icon: Target, color: "text-blue-600" },
  { id: "reading", name: "Reading", icon: FileText, color: "text-green-600" },
  { id: "video", name: "Video", icon: Video, color: "text-red-600" },
  { id: "game", name: "Game", icon: Gamepad2, color: "text-orange-600" },
  {
    id: "discussion",
    name: "Discussion",
    icon: MessageSquare,
    color: "text-pink-600",
  },
];

export default function EnhancedAssignmentCreator({
  isOpen,
  onClose,
  onAssignmentCreated,
  courseId,
  course,
  activities,
  students,
}: AssignmentCreatorProps) {
  const [step, setStep] = useState(1);
  const [assignmentData, setAssignmentData] = useState({
    title: "",
    description: "",
    instructions: "",
    points: 100,
    estimated_duration: 60,
  });
  const [selectedActivities, setSelectedActivities] = useState<
    AssignmentActivity[]
  >([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [settings, setSettings] = useState<AssignmentSettings>({
    due_date: "",
    time_limit: 0,
    attempts_allowed: 1,
    late_submission: true,
    late_penalty: 10,
    auto_grade: true,
    show_answers: false,
    allow_resubmission: false,
    notification_reminders: true,
    peer_review: false,
    group_assignment: false,
    group_size: 4,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-select all students by default
      setSelectedStudents(students.map((s) => s.id));
    }
  }, [isOpen, students]);

  const handleInputChange = (field: string, value: any) => {
    setAssignmentData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSettingsChange = (
    field: keyof AssignmentSettings,
    value: any
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const addActivity = (activity: any) => {
    const assignmentActivity: AssignmentActivity = {
      id: activity.id,
      type: activity.type,
      title: activity.title,
      points: Math.floor(
        assignmentData.points / (selectedActivities.length + 1)
      ),
      required: true,
      order: selectedActivities.length + 1,
    };
    setSelectedActivities((prev) => [...prev, assignmentActivity]);
  };

  const removeActivity = (activityId: string) => {
    setSelectedActivities((prev) => prev.filter((a) => a.id !== activityId));
  };

  const updateActivityPoints = (activityId: string, points: number) => {
    setSelectedActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, points } : a))
    );
  };

  const toggleActivityRequired = (activityId: string) => {
    setSelectedActivities((prev) =>
      prev.map((a) =>
        a.id === activityId ? { ...a, required: !a.required } : a
      )
    );
  };

  const reorderActivities = (fromIndex: number, toIndex: number) => {
    const newActivities = [...selectedActivities];
    const [moved] = newActivities.splice(fromIndex, 1);
    newActivities.splice(toIndex, 0, moved);
    setSelectedActivities(
      newActivities.map((a, index) => ({ ...a, order: index + 1 }))
    );
  };

  const generateAISuggestions = async () => {
    try {
      const response = await fetch("/api/ai/generate-assignment-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_context: course,
          learning_objectives: course.learning_objectives || [],
          available_activities: activities,
          assignment_title: assignmentData.title,
          assignment_description: assignmentData.description,
        }),
      });

      const data = await response.json();
      setAiSuggestions(data);
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
    }
  };

  const applyAISuggestions = (suggestions: any) => {
    if (suggestions.activities) {
      suggestions.activities.forEach((activity: any) => {
        addActivity(activity);
      });
    }
    if (suggestions.settings) {
      setSettings((prev) => ({ ...prev, ...suggestions.settings }));
    }
  };

  const createAssignment = async () => {
    setIsCreating(true);

    try {
      const assignment = {
        course_id: courseId,
        title: assignmentData.title,
        description: assignmentData.description,
        instructions: assignmentData.instructions,
        points: assignmentData.points,
        estimated_duration: assignmentData.estimated_duration,
        activities: selectedActivities,
        assigned_students: selectedStudents,
        settings,
        due_date: settings.due_date
          ? new Date(settings.due_date).toISOString()
          : null,
        created_at: new Date().toISOString(),
      };

      onAssignmentCreated(assignment);
      onClose();
      resetForm();
    } catch (error) {
      console.error("Error creating assignment:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setAssignmentData({
      title: "",
      description: "",
      instructions: "",
      points: 100,
      estimated_duration: 60,
    });
    setSelectedActivities([]);
    setSelectedStudents([]);
    setSettings({
      due_date: "",
      time_limit: 0,
      attempts_allowed: 1,
      late_submission: true,
      late_penalty: 10,
      auto_grade: true,
      show_answers: false,
      allow_resubmission: false,
      notification_reminders: true,
      peer_review: false,
      group_assignment: false,
      group_size: 4,
    });
    setAiSuggestions(null);
  };

  const getActivityIcon = (type: string) => {
    const activityType = ACTIVITY_TYPES.find((t) => t.id === type);
    return activityType ? activityType.icon : Target;
  };

  const getActivityColor = (type: string) => {
    const activityType = ACTIVITY_TYPES.find((t) => t.id === type);
    return activityType ? activityType.color : "text-gray-600";
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Assignment Details</h3>
              <p className="text-muted-foreground">
                Provide basic information about your assignment
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Assignment Title</Label>
                <Input
                  id="title"
                  value={assignmentData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="e.g., Fractions Mastery Assignment"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={assignmentData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe what students will learn and accomplish..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={assignmentData.instructions}
                  onChange={(e) =>
                    handleInputChange("instructions", e.target.value)
                  }
                  placeholder="Provide clear instructions for students..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="points">Total Points</Label>
                  <Input
                    id="points"
                    type="number"
                    value={assignmentData.points}
                    onChange={(e) =>
                      handleInputChange("points", parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={assignmentData.estimated_duration}
                    onChange={(e) =>
                      handleInputChange(
                        "estimated_duration",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Select Activities</h3>
              <p className="text-muted-foreground">
                Choose which activities to include in this assignment
              </p>
            </div>

            {/* AI Suggestions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  AI Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAISuggestions}
                    disabled={!assignmentData.title}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Suggestions
                  </Button>
                  {aiSuggestions && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => applyAISuggestions(aiSuggestions)}
                    >
                      Apply Suggestions
                    </Button>
                  )}
                </div>
                {aiSuggestions && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {aiSuggestions.reasoning}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Activities */}
            <div className="space-y-3">
              <h4 className="font-medium">Available Activities</h4>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  const isSelected = selectedActivities.some(
                    (a) => a.id === activity.id
                  );

                  return (
                    <Card
                      key={activity.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50 border-blue-200"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => !isSelected && addActivity(activity)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-5 w-5 ${getActivityColor(
                            activity.type
                          )}`}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-600">
                            {activity.description}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Selected Activities */}
            {selectedActivities.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Selected Activities</h4>
                <div className="space-y-2">
                  {selectedActivities.map((activity, index) => {
                    const Icon = getActivityIcon(activity.type);

                    return (
                      <Card key={activity.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {index + 1}
                            </span>
                            <Icon
                              className={`h-4 w-4 ${getActivityColor(
                                activity.type
                              )}`}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {activity.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="number"
                                value={activity.points}
                                onChange={(e) =>
                                  updateActivityPoints(
                                    activity.id,
                                    parseInt(e.target.value)
                                  )
                                }
                                className="w-20 h-6 text-xs"
                              />
                              <span className="text-xs text-gray-600">
                                points
                              </span>
                              <Checkbox
                                checked={activity.required}
                                onCheckedChange={() =>
                                  toggleActivityRequired(activity.id)
                                }
                              />
                              <span className="text-xs text-gray-600">
                                Required
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeActivity(activity.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Assignment Settings
              </h3>
              <p className="text-muted-foreground">
                Configure how the assignment will work for students
              </p>
            </div>

            <Tabs defaultValue="timing" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="timing">Timing</TabsTrigger>
                <TabsTrigger value="grading">Grading</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
              </TabsList>

              <TabsContent value="timing" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={settings.due_date}
                      onChange={(e) =>
                        handleSettingsChange("due_date", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                    <Input
                      id="time_limit"
                      type="number"
                      value={settings.time_limit}
                      onChange={(e) =>
                        handleSettingsChange(
                          "time_limit",
                          parseInt(e.target.value)
                        )
                      }
                      placeholder="0 = no limit"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="attempts">Attempts Allowed</Label>
                    <Input
                      id="attempts"
                      type="number"
                      value={settings.attempts_allowed}
                      onChange={(e) =>
                        handleSettingsChange(
                          "attempts_allowed",
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="late_penalty">Late Penalty (%)</Label>
                    <Input
                      id="late_penalty"
                      type="number"
                      value={settings.late_penalty}
                      onChange={(e) =>
                        handleSettingsChange(
                          "late_penalty",
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="late_submission"
                      checked={settings.late_submission}
                      onCheckedChange={(checked) =>
                        handleSettingsChange("late_submission", checked)
                      }
                    />
                    <Label htmlFor="late_submission">
                      Allow late submissions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notification_reminders"
                      checked={settings.notification_reminders}
                      onCheckedChange={(checked) =>
                        handleSettingsChange("notification_reminders", checked)
                      }
                    />
                    <Label htmlFor="notification_reminders">
                      Send reminder notifications
                    </Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="grading" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto_grade"
                      checked={settings.auto_grade}
                      onCheckedChange={(checked) =>
                        handleSettingsChange("auto_grade", checked)
                      }
                    />
                    <Label htmlFor="auto_grade">Auto-grade assignments</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show_answers"
                      checked={settings.show_answers}
                      onCheckedChange={(checked) =>
                        handleSettingsChange("show_answers", checked)
                      }
                    />
                    <Label htmlFor="show_answers">
                      Show correct answers after submission
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow_resubmission"
                      checked={settings.allow_resubmission}
                      onCheckedChange={(checked) =>
                        handleSettingsChange("allow_resubmission", checked)
                      }
                    />
                    <Label htmlFor="allow_resubmission">
                      Allow resubmission
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="peer_review"
                      checked={settings.peer_review}
                      onCheckedChange={(checked) =>
                        handleSettingsChange("peer_review", checked)
                      }
                    />
                    <Label htmlFor="peer_review">Enable peer review</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="students" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="group_assignment"
                      checked={settings.group_assignment}
                      onCheckedChange={(checked) =>
                        handleSettingsChange("group_assignment", checked)
                      }
                    />
                    <Label htmlFor="group_assignment">Group assignment</Label>
                  </div>

                  {settings.group_assignment && (
                    <div>
                      <Label htmlFor="group_size">Group Size</Label>
                      <Input
                        id="group_size"
                        type="number"
                        value={settings.group_size}
                        onChange={(e) =>
                          handleSettingsChange(
                            "group_size",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label>Assign to Students</Label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {students.map((student) => (
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
                        <Label htmlFor={student.id} className="text-sm">
                          {student.full_name} ({student.email})
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Create Assignment
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive assignment with activities and settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {stepNumber}
                </div>
                <span className="text-sm">
                  {stepNumber === 1
                    ? "Details"
                    : stepNumber === 2
                    ? "Activities"
                    : "Settings"}
                </span>
                {stepNumber < 3 && <div className="w-8 h-px bg-gray-200" />}
              </div>
            ))}
          </div>

          {renderStepContent()}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  ← Previous
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {step < 3 ? (
                <Button onClick={() => setStep(step + 1)}>Next →</Button>
              ) : (
                <Button
                  onClick={createAssignment}
                  disabled={
                    isCreating ||
                    !assignmentData.title ||
                    selectedActivities.length === 0
                  }
                  className="min-w-[120px]"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create Assignment
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
