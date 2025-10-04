"use client";

import React, { useState } from "react";
import { generateUUID } from "@/lib/utils";
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
  Play,
  FileText,
  Brain,
  MessageSquare,
  Upload,
  Link,
  Zap,
  CheckCircle,
  Clock,
  Star,
  Youtube,
  File,
  Gamepad2,
  Users,
  Target,
  BookOpen,
  Settings,
} from "lucide-react";
import ContextSelector from "./context-selector";

interface ContextSource {
  id: string;
  type: "pdf" | "youtube";
  title: string;
  url?: string;
  filename?: string;
  summary?: string;
  key_points?: string[];
  key_concepts?: string[];
  thumbnail?: string;
}

interface ActivityCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onActivityCreated: (activity: any) => void;
  lessonContext?: {
    title: string;
    learning_objectives: string[];
    course_context: any;
    course_id?: string;
  };
}

const ACTIVITY_TYPES = [
  {
    id: "youtube",
    name: "YouTube Video",
    description: "Add educational videos from YouTube",
    icon: Youtube,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    features: [
      "Auto-embed",
      "Interactive controls",
      "Note-taking",
      "Progress tracking",
    ],
  },
  {
    id: "pdf",
    name: "PDF Document",
    description: "Upload and share PDF documents",
    icon: File,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    features: ["Document viewer", "Annotations", "Search", "Bookmarks"],
  },
  {
    id: "ai_chat",
    name: "AI Chat Tutor",
    description: "Personalized AI tutoring with mastery tracking",
    icon: Brain,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
    features: [
      "Adaptive learning",
      "Concept mastery",
      "Quiz progression",
      "Personalized",
    ],
  },
  {
    id: "custom_game",
    name: "Custom Game",
    description: "Create interactive educational games",
    icon: Gamepad2,
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    features: [
      "Drag & drop builder",
      "Multiple game types",
      "Scoring system",
      "Analytics",
    ],
  },
  {
    id: "collaborative",
    name: "Collaborative Activity",
    description: "Group work and peer learning",
    icon: Users,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
    features: [
      "Real-time collaboration",
      "Peer review",
      "Group projects",
      "Discussion",
    ],
  },
];

export default function EnhancedActivityCreator({
  isOpen,
  onClose,
  onActivityCreated,
  lessonContext,
}: ActivityCreatorProps) {
  const [selectedType, setSelectedType] = useState<string>("");
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedContextSources, setSelectedContextSources] = useState<
    ContextSource[]
  >([]);
  const [showContextSelector, setShowContextSelector] = useState(false);

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    setStep(2);
    setFormData({ type: typeId });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleCreateActivity = async () => {
    setIsGenerating(true);

    try {
      // Simulate AI generation for custom activities
      if (selectedType === "custom_game") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const activity = {
        id: generateUUID(),
        type: selectedType,
        title:
          formData.title ||
          `${ACTIVITY_TYPES.find((t) => t.id === selectedType)?.name} Activity`,
        description: formData.description || "",
        content: generateActivityContent(selectedType, formData),
        points: formData.points || 50,
        estimated_duration: formData.estimated_duration || 15,
        created_at: new Date().toISOString(),
      };

      onActivityCreated(activity);
      onClose();
      resetForm();
    } catch (error) {
      console.error("Error creating activity:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateActivityContent = (type: string, data: any) => {
    switch (type) {
      case "youtube":
        return {
          video_url: data.youtube_url || "",
          video_metadata: {
            duration: "Unknown",
            quality: "HD",
            captions: true,
          },
          interactive_elements: {
            pause_points: [],
            note_taking: [],
            discussion_questions: [],
          },
        };
      case "pdf":
        return {
          document_url: data.pdf_file || "",
          document_metadata: {
            pages: 0,
            size: "Unknown",
            type: "PDF",
          },
          interactive_elements: {
            annotations: [],
            bookmarks: [],
            highlights: [],
          },
        };
      case "ai_chat":
        return {
          learning_objectives:
            data.learning_objectives ||
            lessonContext?.learning_objectives ||
            [],
          mastery_goals: data.mastery_goals || [],
          difficulty_level: data.difficulty_level || "intermediate",
          chat_phases: [],
          context_sources: selectedContextSources,
        };
      case "custom_game":
        return {
          game_type: data.game_type || "quiz",
          game_config: data.game_config || {},
          scoring_system: data.scoring_system || {},
          levels: data.levels || [],
        };
      case "collaborative":
        return {
          collaboration_type: data.collaboration_type || "discussion",
          group_size: data.group_size || 4,
          collaboration_tools: data.collaboration_tools || [],
          peer_review: data.peer_review || false,
        };
      default:
        return {};
    }
  };

  const resetForm = () => {
    setSelectedType("");
    setStep(1);
    setFormData({});
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Choose Activity Type</h3>
            <p className="text-muted-foreground">
              Select the type of activity you want to create for your lesson
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ACTIVITY_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedType === type.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleTypeSelect(type.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${type.bgColor}`}>
                        <Icon className={`h-6 w-6 ${type.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{type.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {type.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {type.features.map((feature, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <CheckCircle className="h-3 w-3" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <div>
              <h3 className="text-lg font-semibold">Configure Activity</h3>
              <p className="text-sm text-muted-foreground">
                {ACTIVITY_TYPES.find((t) => t.id === selectedType)?.description}
              </p>
            </div>
          </div>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Activity Title</Label>
                  <Input
                    id="title"
                    value={formData.title || ""}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Enter activity title..."
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Describe what students will learn..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="points">Points</Label>
                    <Input
                      id="points"
                      type="number"
                      value={formData.points || 50}
                      onChange={(e) =>
                        handleInputChange("points", parseInt(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.estimated_duration || 15}
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
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              {renderContentForm()}
            </TabsContent>
          </Tabs>
        </div>
      );
    }
  };

  const renderContentForm = () => {
    switch (selectedType) {
      case "youtube":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="youtube_url">YouTube URL</Label>
              <Input
                id="youtube_url"
                value={formData.youtube_url || ""}
                onChange={(e) =>
                  handleInputChange("youtube_url", e.target.value)
                }
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste the YouTube video URL here
              </p>
            </div>
          </div>
        );

      case "pdf":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pdf_file">Upload PDF Document</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop your PDF file here, or click to browse
                </p>
                <Button variant="outline" size="sm">
                  Choose File
                </Button>
              </div>
            </div>
          </div>
        );

      case "ai_chat":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="learning_objectives">Learning Objectives</Label>
              <Textarea
                id="learning_objectives"
                value={formData.learning_objectives || ""}
                onChange={(e) =>
                  handleInputChange(
                    "learning_objectives",
                    e.target.value.split("\n")
                  )
                }
                placeholder="Enter learning objectives (one per line)..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="mastery_goals">Mastery Goals</Label>
              <Textarea
                id="mastery_goals"
                value={formData.mastery_goals || ""}
                onChange={(e) =>
                  handleInputChange("mastery_goals", e.target.value.split("\n"))
                }
                placeholder="What should students master by the end?"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="difficulty_level">Difficulty Level</Label>
              <select
                id="difficulty_level"
                value={formData.difficulty_level || "intermediate"}
                onChange={(e) =>
                  handleInputChange("difficulty_level", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Context Sources for AI Chat */}
            {lessonContext?.course_id && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Context Sources</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowContextSelector(!showContextSelector)}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    {showContextSelector ? "Hide" : "Configure"} Context
                  </Button>
                </div>

                {selectedContextSources.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedContextSources.map((source) => (
                      <Badge
                        key={source.id}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        {source.type === "pdf" ? (
                          <File className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {source.title}
                      </Badge>
                    ))}
                  </div>
                )}

                {showContextSelector && (
                  <ContextSelector
                    onContextSelected={setSelectedContextSources}
                    selectedSources={selectedContextSources}
                    courseId={lessonContext.course_id}
                  />
                )}
              </div>
            )}
          </div>
        );

      case "custom_game":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="game_type">Game Type</Label>
              <select
                id="game_type"
                value={formData.game_type || "quiz"}
                onChange={(e) => handleInputChange("game_type", e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="quiz">Quiz Game</option>
                <option value="matching">Matching Game</option>
                <option value="puzzle">Puzzle Game</option>
                <option value="simulation">Interactive Simulation</option>
              </select>
            </div>
            <div>
              <Label htmlFor="game_description">Game Description</Label>
              <Textarea
                id="game_description"
                value={formData.game_description || ""}
                onChange={(e) =>
                  handleInputChange("game_description", e.target.value)
                }
                placeholder="Describe the game mechanics and learning goals..."
                rows={3}
              />
            </div>
          </div>
        );

      case "collaborative":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="collaboration_type">Collaboration Type</Label>
              <select
                id="collaboration_type"
                value={formData.collaboration_type || "discussion"}
                onChange={(e) =>
                  handleInputChange("collaboration_type", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="discussion">Discussion Forum</option>
                <option value="peer_review">Peer Review</option>
                <option value="group_project">Group Project</option>
                <option value="brainstorming">Brainstorming</option>
              </select>
            </div>
            <div>
              <Label htmlFor="group_size">Group Size</Label>
              <Input
                id="group_size"
                type="number"
                value={formData.group_size || 4}
                onChange={(e) =>
                  handleInputChange("group_size", parseInt(e.target.value))
                }
                min="2"
                max="10"
              />
            </div>
          </div>
        );

      default:
        return <div>No configuration needed for this activity type.</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Create New Activity
          </DialogTitle>
          <DialogDescription>
            Add engaging activities to your lesson with our enhanced creator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                1
              </div>
              <span className="text-sm">Choose Type</span>
            </div>
            <div className="flex-1 h-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                2
              </div>
              <span className="text-sm">Configure</span>
            </div>
          </div>

          {renderStepContent()}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {step === 2 && (
              <Button
                onClick={handleCreateActivity}
                disabled={isGenerating}
                className="min-w-[120px]"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Activity
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
