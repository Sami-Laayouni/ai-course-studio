"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  Target,
  Star,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Eye,
  FileText,
  Video,
  Brain,
  MessageSquare,
  Gamepad2,
  Trophy,
  TrendingUp,
  BarChart3,
  Award,
  Users,
  Zap,
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  points: number;
  due_date: string;
  created_at: string;
  status: "not_started" | "in_progress" | "submitted" | "graded" | "late";
  progress: number;
  grade?: number;
  feedback?: string;
  submission?: {
    content: any;
    submitted_at: string;
    attempts: number;
  };
  activities: Array<{
    id: string;
    type: string;
    title: string;
    points: number;
    required: boolean;
    completed: boolean;
    progress: number;
  }>;
  settings: {
    time_limit: number;
    attempts_allowed: number;
    late_submission: boolean;
    late_penalty: number;
    auto_grade: boolean;
    show_answers: boolean;
    allow_resubmission: boolean;
    peer_review: boolean;
    group_assignment: boolean;
  };
}

interface StudentStats {
  total_assignments: number;
  completed_assignments: number;
  total_points: number;
  average_grade: number;
  current_streak: number;
  longest_streak: number;
  rank: number;
  total_students: number;
}

export default function EnhancedAssignmentDashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [selectedTab, setSelectedTab] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  useEffect(() => {
    loadAssignments();
    loadStats();
  }, []);

  const loadAssignments = async () => {
    try {
      // Simulate API call
      const mockAssignments: Assignment[] = [
        {
          id: "1",
          title: "Fractions Mastery Assignment",
          description:
            "Master the fundamentals of fractions through interactive activities",
          instructions:
            "Complete all activities in order. Show your work for full credit.",
          points: 100,
          due_date: "2024-01-15T23:59:00Z",
          created_at: "2024-01-01T00:00:00Z",
          status: "in_progress",
          progress: 65,
          activities: [
            {
              id: "a1",
              type: "ai_chat",
              title: "AI Chat: Understanding Fractions",
              points: 30,
              required: true,
              completed: true,
              progress: 100,
            },
            {
              id: "a2",
              type: "quiz",
              title: "Fractions Quiz",
              points: 40,
              required: true,
              completed: false,
              progress: 0,
            },
            {
              id: "a3",
              type: "game",
              title: "Fraction Game",
              points: 30,
              required: false,
              completed: true,
              progress: 100,
            },
          ],
          settings: {
            time_limit: 120,
            attempts_allowed: 3,
            late_submission: true,
            late_penalty: 10,
            auto_grade: true,
            show_answers: false,
            allow_resubmission: true,
            peer_review: false,
            group_assignment: false,
          },
        },
        {
          id: "2",
          title: "Algebra Basics",
          description: "Introduction to algebraic concepts and problem solving",
          instructions:
            "Work through each activity carefully. Use the AI tutor if you need help.",
          points: 150,
          due_date: "2024-01-20T23:59:00Z",
          created_at: "2024-01-05T00:00:00Z",
          status: "not_started",
          progress: 0,
          activities: [
            {
              id: "a4",
              type: "reading",
              title: "Algebra Fundamentals",
              points: 50,
              required: true,
              completed: false,
              progress: 0,
            },
            {
              id: "a5",
              type: "video",
              title: "Solving Equations",
              points: 50,
              required: true,
              completed: false,
              progress: 0,
            },
            {
              id: "a6",
              type: "quiz",
              title: "Algebra Quiz",
              points: 50,
              required: true,
              completed: false,
              progress: 0,
            },
          ],
          settings: {
            time_limit: 180,
            attempts_allowed: 2,
            late_submission: true,
            late_penalty: 15,
            auto_grade: true,
            show_answers: true,
            allow_resubmission: false,
            peer_review: true,
            group_assignment: false,
          },
        },
        {
          id: "3",
          title: "Geometry Project",
          description: "Collaborative geometry project with peer review",
          instructions: "Work in groups to create a geometry presentation",
          points: 200,
          due_date: "2024-01-25T23:59:00Z",
          created_at: "2024-01-10T00:00:00Z",
          status: "submitted",
          progress: 100,
          grade: 85,
          feedback:
            "Great work on the presentation! Consider adding more real-world examples.",
          submission: {
            content: { presentation_url: "https://example.com/presentation" },
            submitted_at: "2024-01-24T15:30:00Z",
            attempts: 1,
          },
          activities: [
            {
              id: "a7",
              type: "discussion",
              title: "Group Discussion",
              points: 50,
              required: true,
              completed: true,
              progress: 100,
            },
            {
              id: "a8",
              type: "game",
              title: "Geometry Simulation",
              points: 75,
              required: true,
              completed: true,
              progress: 100,
            },
            {
              id: "a9",
              type: "quiz",
              title: "Geometry Quiz",
              points: 75,
              required: true,
              completed: true,
              progress: 100,
            },
          ],
          settings: {
            time_limit: 0,
            attempts_allowed: 1,
            late_submission: false,
            late_penalty: 0,
            auto_grade: false,
            show_answers: false,
            allow_resubmission: false,
            peer_review: true,
            group_assignment: true,
          },
        },
      ];
      setAssignments(mockAssignments);
    } catch (error) {
      console.error("Error loading assignments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Simulate API call
      const mockStats: StudentStats = {
        total_assignments: 12,
        completed_assignments: 8,
        total_points: 1250,
        average_grade: 87.5,
        current_streak: 5,
        longest_streak: 12,
        rank: 3,
        total_students: 25,
      };
      setStats(mockStats);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "not_started":
        return <Play className="h-4 w-4" />;
      case "in_progress":
        return <Pause className="h-4 w-4" />;
      case "submitted":
        return <CheckCircle className="h-4 w-4" />;
      case "graded":
        return <Trophy className="h-4 w-4" />;
      case "late":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Play className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not_started":
        return "bg-gray-100 text-gray-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "submitted":
        return "bg-yellow-100 text-yellow-800";
      case "graded":
        return "bg-green-100 text-green-800";
      case "late":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "ai_chat":
        return Brain;
      case "quiz":
        return Target;
      case "reading":
        return FileText;
      case "video":
        return Video;
      case "game":
        return Gamepad2;
      case "discussion":
        return MessageSquare;
      default:
        return Target;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();

    if (diff <= 0) return "Overdue";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const filteredAssignments = assignments.filter((assignment) => {
    switch (selectedTab) {
      case "active":
        return (
          assignment.status === "in_progress" ||
          assignment.status === "not_started"
        );
      case "completed":
        return (
          assignment.status === "submitted" || assignment.status === "graded"
        );
      case "overdue":
        return assignment.status === "late";
      default:
        return true;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Assignments</h1>
          <p className="text-muted-foreground">
            Track your progress and complete assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            Rank #{stats?.rank} of {stats?.total_students}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Assignments</p>
                  <p className="text-2xl font-bold">
                    {stats.completed_assignments}/{stats.total_assignments}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Total Points</p>
                  <p className="text-2xl font-bold">{stats.total_points}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Average Grade</p>
                  <p className="text-2xl font-bold">{stats.average_grade}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Current Streak</p>
                  <p className="text-2xl font-bold">
                    {stats.current_streak} days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assignment Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredAssignments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">
                  No assignments found
                </h3>
                <p className="text-gray-600">
                  {selectedTab === "all"
                    ? "You don't have any assignments yet."
                    : `No ${selectedTab} assignments found.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAssignments.map((assignment) => (
                <Card
                  key={assignment.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {assignment.title}
                          <Badge className={getStatusColor(assignment.status)}>
                            {getStatusIcon(assignment.status)}
                            <span className="ml-1 capitalize">
                              {assignment.status.replace("_", " ")}
                            </span>
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {assignment.description}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {assignment.points} points
                        </div>
                        <div className="text-xs text-gray-600">
                          Due: {formatDate(assignment.due_date)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {getTimeRemaining(assignment.due_date)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{assignment.progress}%</span>
                      </div>
                      <Progress value={assignment.progress} className="h-2" />
                    </div>

                    {/* Activities */}
                    <div className="space-y-2 mb-4">
                      <h4 className="text-sm font-medium">Activities</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {assignment.activities.map((activity) => {
                          const Icon = getActivityIcon(activity.type);
                          return (
                            <div
                              key={activity.id}
                              className="flex items-center gap-2 p-2 rounded border"
                            >
                              <Icon className="h-4 w-4 text-gray-600" />
                              <div className="flex-1">
                                <span className="text-sm">
                                  {activity.title}
                                </span>
                                <span className="text-xs text-gray-600 ml-2">
                                  {activity.points} pts
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {activity.required && (
                                  <Badge variant="outline" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                                {activity.completed ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <div className="w-4 h-4 border-2 border-gray-300 rounded" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Grade and Feedback */}
                    {assignment.grade !== undefined && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="h-4 w-4 text-green-600" />
                          <span className="font-medium">
                            Grade: {assignment.grade}%
                          </span>
                        </div>
                        {assignment.feedback && (
                          <p className="text-sm text-green-800">
                            {assignment.feedback}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setSelectedAssignment(assignment)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        {assignment.status === "not_started"
                          ? "Start"
                          : "Continue"}
                      </Button>

                      {assignment.status === "submitted" &&
                        assignment.settings.allow_resubmission && (
                          <Button variant="outline" size="sm">
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Resubmit
                          </Button>
                        )}

                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
