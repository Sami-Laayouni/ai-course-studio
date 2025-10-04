"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Brain,
  CheckCircle,
  Video,
  FileText,
  Users,
  Zap,
  Pen,
  Square,
  Circle,
  Type,
  Image,
  MessageSquare,
  BookOpen,
  Target,
  Clock,
  Star,
  Settings,
  Plus,
  ArrowRight,
} from "lucide-react";

interface ActivityType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  subtypes: ActivitySubtype[];
  features: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: string;
  points: number;
}

interface ActivitySubtype {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ActivityTypeSelectorProps {
  onActivitySelected: (
    activityType: ActivityType,
    subtype?: ActivitySubtype
  ) => void;
  selectedType?: ActivityType | null;
  selectedSubtype?: ActivitySubtype | null;
}

const activityTypes: ActivityType[] = [
  {
    id: "ai_chat",
    name: "AI Chat",
    description:
      "Personalized AI conversation with unique instructions and quiz progression",
    icon: Brain,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    difficulty: "beginner",
    estimatedTime: "15-30 min",
    points: 50,
    features: [
      "Personalized learning",
      "Quiz progression",
      "Concept mastery tracking",
      "Adaptive difficulty",
    ],
    subtypes: [
      {
        id: "concept_exploration",
        name: "Concept Exploration",
        description: "Deep dive into specific concepts",
        icon: Target,
      },
      {
        id: "q_and_a",
        name: "Q&A Session",
        description: "Interactive question and answer",
        icon: MessageSquare,
      },
      {
        id: "tutoring",
        name: "Personal Tutoring",
        description: "One-on-one AI tutoring",
        icon: BookOpen,
      },
    ],
  },
  {
    id: "quiz",
    name: "Interactive Quiz",
    description: "Engaging assessments with multiple question types",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    difficulty: "beginner",
    estimatedTime: "10-20 min",
    points: 30,
    features: [
      "Multiple choice",
      "True/false",
      "Short answer",
      "Immediate feedback",
    ],
    subtypes: [
      {
        id: "multiple_choice",
        name: "Multiple Choice",
        description: "Choose from multiple options",
        icon: CheckCircle,
      },
      {
        id: "true_false",
        name: "True/False",
        description: "Binary choice questions",
        icon: Target,
      },
      {
        id: "short_answer",
        name: "Short Answer",
        description: "Text-based responses",
        icon: Type,
      },
      {
        id: "matching",
        name: "Matching",
        description: "Match items together",
        icon: Square,
      },
    ],
  },
  {
    id: "simulation",
    name: "Interactive Simulation",
    description: "Hands-on virtual experiments and simulations",
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
    difficulty: "intermediate",
    estimatedTime: "20-45 min",
    points: 75,
    features: [
      "Virtual experiments",
      "Real-time feedback",
      "Step-by-step guidance",
      "Variable manipulation",
    ],
    subtypes: [
      {
        id: "science_experiment",
        name: "Science Experiment",
        description: "Virtual lab experiments",
        icon: Zap,
      },
      {
        id: "math_simulation",
        name: "Math Simulation",
        description: "Interactive math problems",
        icon: Square,
      },
      {
        id: "history_simulation",
        name: "History Simulation",
        description: "Historical scenario exploration",
        icon: BookOpen,
      },
    ],
  },
  {
    id: "collaborative_whiteboard",
    name: "Collaborative Whiteboard",
    description: "Real-time collaborative drawing and brainstorming",
    icon: Pen,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
    difficulty: "intermediate",
    estimatedTime: "30-60 min",
    points: 60,
    features: [
      "Real-time collaboration",
      "Drawing tools",
      "Chat integration",
      "Session recording",
    ],
    subtypes: [
      {
        id: "brainstorming",
        name: "Brainstorming",
        description: "Group idea generation",
        icon: Brain,
      },
      {
        id: "diagramming",
        name: "Diagramming",
        description: "Create visual diagrams",
        icon: Square,
      },
      {
        id: "presentation",
        name: "Presentation",
        description: "Collaborative presentations",
        icon: Target,
      },
    ],
  },
  {
    id: "video",
    name: "Video Learning",
    description: "Educational video content with interactive elements",
    icon: Video,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    difficulty: "beginner",
    estimatedTime: "15-45 min",
    points: 40,
    features: [
      "Video playback",
      "Interactive timestamps",
      "Note-taking",
      "Progress tracking",
    ],
    subtypes: [
      {
        id: "youtube",
        name: "YouTube Video",
        description: "Embedded YouTube content",
        icon: Video,
      },
      {
        id: "upload",
        name: "Uploaded Video",
        description: "Custom video uploads",
        icon: Upload,
      },
      {
        id: "live",
        name: "Live Stream",
        description: "Real-time video streaming",
        icon: Video,
      },
    ],
  },
  {
    id: "reading",
    name: "Reading Material",
    description: "Interactive text-based learning with annotations",
    icon: FileText,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 border-indigo-200",
    difficulty: "beginner",
    estimatedTime: "20-40 min",
    points: 35,
    features: [
      "Interactive text",
      "Annotations",
      "Highlighting",
      "Reading comprehension",
    ],
    subtypes: [
      {
        id: "article",
        name: "Article",
        description: "Educational articles",
        icon: FileText,
      },
      {
        id: "pdf",
        name: "PDF Document",
        description: "PDF document viewer",
        icon: FileText,
      },
      {
        id: "interactive_text",
        name: "Interactive Text",
        description: "Enhanced text with interactions",
        icon: Type,
      },
    ],
  },
  {
    id: "collaborative",
    name: "Collaborative Learning",
    description: "Group activities and peer interaction",
    icon: Users,
    color: "text-teal-600",
    bgColor: "bg-teal-50 border-teal-200",
    difficulty: "intermediate",
    estimatedTime: "30-90 min",
    points: 80,
    features: [
      "Group work",
      "Peer review",
      "Discussion forums",
      "Team projects",
    ],
    subtypes: [
      {
        id: "discussion",
        name: "Discussion Forum",
        description: "Structured discussions",
        icon: MessageSquare,
      },
      {
        id: "peer_review",
        name: "Peer Review",
        description: "Student-to-student feedback",
        icon: Users,
      },
      {
        id: "group_project",
        name: "Group Project",
        description: "Collaborative projects",
        icon: Target,
      },
    ],
  },
  {
    id: "custom",
    name: "Custom Activity",
    description: "AI-generated custom learning experiences",
    icon: Star,
    color: "text-pink-600",
    bgColor: "bg-pink-50 border-pink-200",
    difficulty: "advanced",
    estimatedTime: "Variable",
    points: 100,
    features: [
      "AI-generated content",
      "Adaptive difficulty",
      "Custom scenarios",
      "Unique experiences",
    ],
    subtypes: [
      {
        id: "simulation",
        name: "Custom Simulation",
        description: "AI-generated simulations",
        icon: Zap,
      },
      {
        id: "game",
        name: "Educational Game",
        description: "Gamified learning experiences",
        icon: Star,
      },
      {
        id: "experiment",
        name: "Virtual Experiment",
        description: "Custom virtual experiments",
        icon: Target,
      },
    ],
  },
];

export default function ActivityTypeSelector({
  onActivitySelected,
  selectedType,
  selectedSubtype,
}: ActivityTypeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [showSubtypes, setShowSubtypes] = useState(false);
  const [tempSelectedType, setTempSelectedType] = useState<ActivityType | null>(
    null
  );

  const filteredActivities = activityTypes.filter((activity) => {
    const matchesSearch =
      activity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty =
      difficultyFilter === "all" || activity.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  const handleTypeSelect = (activityType: ActivityType) => {
    setTempSelectedType(activityType);
    if (activityType.subtypes.length === 0) {
      onActivitySelected(activityType);
    } else {
      setShowSubtypes(true);
    }
  };

  const handleSubtypeSelect = (subtype: ActivitySubtype) => {
    if (tempSelectedType) {
      onActivitySelected(tempSelectedType, subtype);
      setShowSubtypes(false);
      setTempSelectedType(null);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "text-green-600 bg-green-100";
      case "intermediate":
        return "text-yellow-600 bg-yellow-100";
      case "advanced":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Activity Type</h2>
        <p className="text-muted-foreground">
          Select the type of learning activity you want to create
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activity types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 border border-input rounded-md bg-background"
        >
          <option value="all">All Difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActivities.map((activity) => {
          const Icon = activity.icon;
          const isSelected = selectedType?.id === activity.id;

          return (
            <Card
              key={activity.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected ? "ring-2 ring-primary" : ""
              } ${activity.bgColor}`}
              onClick={() => handleTypeSelect(activity)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activity.bgColor}`}>
                    <Icon className={`h-6 w-6 ${activity.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{activity.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={getDifficultyColor(activity.difficulty)}
                      >
                        {activity.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {activity.estimatedTime}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {activity.points} pts
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="mb-3">
                  {activity.description}
                </CardDescription>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Features:</h4>
                  <div className="flex flex-wrap gap-1">
                    {activity.features.slice(0, 3).map((feature, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {feature}
                      </Badge>
                    ))}
                    {activity.features.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{activity.features.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {activity.subtypes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {activity.subtypes.length} subtypes available
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Subtype Selection Dialog */}
      <Dialog open={showSubtypes} onOpenChange={setShowSubtypes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose {tempSelectedType?.name} Subtype</DialogTitle>
            <DialogDescription>
              Select the specific type of{" "}
              {tempSelectedType?.name?.toLowerCase()} activity you want to
              create
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tempSelectedType?.subtypes.map((subtype) => {
              const Icon = subtype.icon;
              return (
                <Card
                  key={subtype.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSubtypeSelect(subtype)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{subtype.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {subtype.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected Activity Summary */}
      {selectedType && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <selectedType.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{selectedType.name}</h3>
                  {selectedSubtype && (
                    <p className="text-sm text-muted-foreground">
                      {selectedSubtype.name}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  onActivitySelected(selectedType, selectedSubtype);
                }}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
