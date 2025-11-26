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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  Brain,
  MessageSquare,
  FileText,
  Video,
  Gamepad2,
  Trophy,
  Award,
  BarChart3,
  Eye,
  Download,
  Filter,
  Calendar,
  Zap,
  Lightbulb,
  BookOpen,
  Activity,
} from "lucide-react";

interface StudentAnalytics {
  id: string;
  name: string;
  email: string;
  total_points: number;
  assignments_completed: number;
  average_grade: number;
  time_spent: number;
  last_activity: string;
  struggling_concepts: string[];
  mastered_concepts: string[];
  engagement_score: number;
  ai_chat_sessions: number;
  quiz_attempts: number;
  video_watch_time: number;
  reading_progress: number;
}

interface ConceptAnalytics {
  concept: string;
  total_students: number;
  mastered_students: number;
  struggling_students: number;
  average_time_to_master: number;
  difficulty_level: number;
  common_misconceptions: string[];
  recommended_activities: string[];
}

interface ActivityAnalytics {
  activity_type: string;
  total_attempts: number;
  completion_rate: number;
  average_score: number;
  average_time: number;
  engagement_rating: number;
  student_feedback: number;
}

interface CourseInsights {
  overall_engagement: number;
  completion_rate: number;
  average_grade: number;
  time_to_completion: number;
  struggling_areas: string[];
  top_performers: string[];
  at_risk_students: string[];
  recommended_interventions: string[];
}

export default function EnhancedAnalyticsDashboard() {
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("30d");
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics[]>(
    []
  );
  const [conceptAnalytics, setConceptAnalytics] = useState<ConceptAnalytics[]>(
    []
  );
  const [activityAnalytics, setActivityAnalytics] = useState<
    ActivityAnalytics[]
  >([]);
  const [courseInsights, setCourseInsights] = useState<CourseInsights | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentAnalytics | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [selectedCourse, selectedTimeframe]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls
      await Promise.all([
        loadStudentAnalytics(),
        loadConceptAnalytics(),
        loadActivityAnalytics(),
        loadCourseInsights(),
      ]);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudentAnalytics = async () => {
    // Simulate API call
    const mockData: StudentAnalytics[] = [
      {
        id: "1",
        name: "Alice Johnson",
        email: "alice@example.com",
        total_points: 1250,
        assignments_completed: 8,
        average_grade: 92.5,
        time_spent: 12.5,
        last_activity: "2024-01-15T10:30:00Z",
        struggling_concepts: ["fractions", "decimals"],
        mastered_concepts: ["addition", "subtraction", "multiplication"],
        engagement_score: 85,
        ai_chat_sessions: 15,
        quiz_attempts: 12,
        video_watch_time: 4.5,
        reading_progress: 78,
      },
      {
        id: "2",
        name: "Bob Smith",
        email: "bob@example.com",
        total_points: 980,
        assignments_completed: 6,
        average_grade: 78.3,
        time_spent: 8.2,
        last_activity: "2024-01-14T15:45:00Z",
        struggling_concepts: ["algebra", "geometry"],
        mastered_concepts: ["basic_math"],
        engagement_score: 65,
        ai_chat_sessions: 8,
        quiz_attempts: 15,
        video_watch_time: 6.2,
        reading_progress: 45,
      },
      {
        id: "3",
        name: "Carol Davis",
        email: "carol@example.com",
        total_points: 1450,
        assignments_completed: 10,
        average_grade: 95.8,
        time_spent: 15.3,
        last_activity: "2024-01-15T14:20:00Z",
        struggling_concepts: [],
        mastered_concepts: [
          "addition",
          "subtraction",
          "multiplication",
          "division",
          "fractions",
        ],
        engagement_score: 95,
        ai_chat_sessions: 22,
        quiz_attempts: 8,
        video_watch_time: 3.8,
        reading_progress: 92,
      },
    ];
    setStudentAnalytics(mockData);
  };

  const loadConceptAnalytics = async () => {
    const mockData: ConceptAnalytics[] = [
      {
        concept: "Fractions",
        total_students: 25,
        mastered_students: 18,
        struggling_students: 7,
        average_time_to_master: 4.2,
        difficulty_level: 7,
        common_misconceptions: [
          "denominator confusion",
          "equivalent fractions",
        ],
        recommended_activities: ["visual_fractions", "fraction_games"],
      },
      {
        concept: "Algebra",
        total_students: 25,
        mastered_students: 12,
        struggling_students: 13,
        average_time_to_master: 6.8,
        difficulty_level: 9,
        common_misconceptions: ["variable isolation", "equation solving"],
        recommended_activities: ["step_by_step_solving", "algebra_simulations"],
      },
      {
        concept: "Geometry",
        total_students: 25,
        mastered_students: 20,
        struggling_students: 5,
        average_time_to_master: 3.5,
        difficulty_level: 5,
        common_misconceptions: ["angle measurement", "shape properties"],
        recommended_activities: ["interactive_shapes", "geometry_games"],
      },
    ];
    setConceptAnalytics(mockData);
  };

  const loadActivityAnalytics = async () => {
    const mockData: ActivityAnalytics[] = [
      {
        activity_type: "AI Chat",
        total_attempts: 150,
        completion_rate: 92,
        average_score: 88,
        average_time: 12.5,
        engagement_rating: 4.5,
        student_feedback: 4.7,
      },
      {
        activity_type: "Quiz",
        total_attempts: 200,
        completion_rate: 85,
        average_score: 76,
        average_time: 8.3,
        engagement_rating: 3.8,
        student_feedback: 4.2,
      },
      {
        activity_type: "Video",
        total_attempts: 180,
        completion_rate: 78,
        average_score: 82,
        average_time: 15.2,
        engagement_rating: 4.1,
        student_feedback: 4.0,
      },
      {
        activity_type: "Game",
        total_attempts: 120,
        completion_rate: 95,
        average_score: 91,
        average_time: 20.5,
        engagement_rating: 4.8,
        student_feedback: 4.9,
      },
    ];
    setActivityAnalytics(mockData);
  };

  const loadCourseInsights = async () => {
    const mockData: CourseInsights = {
      overall_engagement: 82,
      completion_rate: 76,
      average_grade: 84.2,
      time_to_completion: 5.8,
      struggling_areas: ["Algebra", "Word Problems", "Problem Solving"],
      top_performers: ["Carol Davis", "Alice Johnson", "David Wilson"],
      at_risk_students: ["Bob Smith", "Emma Brown", "Mike Johnson"],
      recommended_interventions: [
        "Provide additional AI tutoring for algebra concepts",
        "Create more visual learning materials for struggling students",
        "Implement peer tutoring program",
        "Add more practice problems with step-by-step solutions",
      ],
    };
    setCourseInsights(mockData);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "AI Chat":
        return Brain;
      case "Quiz":
        return Target;
      case "Video":
        return Video;
      case "Game":
        return Gamepad2;
      case "Reading":
        return FileText;
      case "Discussion":
        return MessageSquare;
      default:
        return Activity;
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return "text-green-600";
    if (grade >= 80) return "text-blue-600";
    if (grade >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const chartData = conceptAnalytics.map((concept) => ({
    name: concept.concept,
    mastered: concept.mastered_students,
    struggling: concept.struggling_students,
    total: concept.total_students,
  }));

  const activityChartData = activityAnalytics.map((activity) => ({
    name: activity.activity_type,
    completion: activity.completion_rate,
    engagement: activity.engagement_rating * 20, // Scale to 0-100
    score: activity.average_score,
  }));

  const studentProgressData = studentAnalytics.map((student) => ({
    name: student.name.split(" ")[0],
    points: student.total_points,
    grade: student.average_grade,
    engagement: student.engagement_score,
  }));

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
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into student learning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="math-101">Math 101</SelectItem>
              <SelectItem value="algebra-1">Algebra 1</SelectItem>
              <SelectItem value="geometry">Geometry</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={selectedTimeframe}
            onValueChange={setSelectedTimeframe}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {courseInsights && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Overall Engagement</p>
                  <p className="text-2xl font-bold">
                    {courseInsights.overall_engagement}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Completion Rate</p>
                  <p className="text-2xl font-bold">
                    {courseInsights.completion_rate}%
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
                  <p className="text-sm font-medium">Average Grade</p>
                  <p className="text-2xl font-bold">
                    {courseInsights.average_grade}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Avg. Time to Complete</p>
                  <p className="text-2xl font-bold">
                    {courseInsights.time_to_completion}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="concepts">Concepts</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="misconceptions">Misconceptions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Concept Mastery Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Concept Mastery</CardTitle>
                <CardDescription>
                  Student progress across different concepts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="mastered" fill="#10b981" name="Mastered" />
                    <Bar
                      dataKey="struggling"
                      fill="#ef4444"
                      name="Struggling"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Activity Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Performance</CardTitle>
                <CardDescription>
                  Completion rates and engagement by activity type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="completion"
                      fill="#3b82f6"
                      name="Completion Rate %"
                    />
                    <Bar
                      dataKey="engagement"
                      fill="#8b5cf6"
                      name="Engagement Score"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Student Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Student Progress Overview</CardTitle>
              <CardDescription>
                Individual student performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={studentProgressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="points"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                  />
                  <Area
                    type="monotone"
                    dataKey="grade"
                    stackId="2"
                    stroke="#10b981"
                    fill="#10b981"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {studentAnalytics.map((student) => (
              <Card
                key={student.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Points</p>
                        <p className="font-bold">{student.total_points}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Grade</p>
                        <p
                          className={`font-bold ${getGradeColor(
                            student.average_grade
                          )}`}
                        >
                          {student.average_grade}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Engagement</p>
                        <p
                          className={`font-bold ${getEngagementColor(
                            student.engagement_score
                          )}`}
                        >
                          {student.engagement_score}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Time Spent</p>
                        <p className="font-bold">
                          {formatTime(student.time_spent)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Mastered Concepts
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {student.mastered_concepts.map((concept, index) => (
                          <Badge
                            key={index}
                            variant="default"
                            className="text-xs"
                          >
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Struggling Areas
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {student.struggling_concepts.map((concept, index) => (
                          <Badge
                            key={index}
                            variant="destructive"
                            className="text-xs"
                          >
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="concepts" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {conceptAnalytics.map((concept, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{concept.concept}</CardTitle>
                      <CardDescription>
                        Difficulty Level: {concept.difficulty_level}/10
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {concept.mastered_students}/{concept.total_students}{" "}
                      mastered
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Mastery Rate</h4>
                      <Progress
                        value={
                          (concept.mastered_students / concept.total_students) *
                          100
                        }
                        className="h-2"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        {Math.round(
                          (concept.mastered_students / concept.total_students) *
                            100
                        )}
                        %
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Average Time to Master
                      </h4>
                      <p className="text-lg font-bold">
                        {concept.average_time_to_master} hours
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Struggling Students
                      </h4>
                      <p className="text-lg font-bold text-red-600">
                        {concept.struggling_students}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Common Misconceptions
                      </h4>
                      <ul className="text-sm text-gray-600">
                        {concept.common_misconceptions.map(
                          (misconception, i) => (
                            <li key={i} className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-red-500" />
                              {misconception}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Recommended Activities
                      </h4>
                      <ul className="text-sm text-gray-600">
                        {concept.recommended_activities.map((activity, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {activity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activityAnalytics.map((activity, index) => {
              const Icon = getActivityIcon(activity.activity_type);
              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle>{activity.activity_type}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Attempts</p>
                        <p className="text-2xl font-bold">
                          {activity.total_attempts}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Completion Rate</p>
                        <p className="text-2xl font-bold">
                          {activity.completion_rate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Average Score</p>
                        <p className="text-2xl font-bold">
                          {activity.average_score}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Avg. Time</p>
                        <p className="text-2xl font-bold">
                          {formatTime(activity.average_time)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">
                          Engagement Rating
                        </span>
                        <span className="text-sm font-medium">
                          {activity.engagement_rating}/5
                        </span>
                      </div>
                      <Progress
                        value={activity.engagement_rating * 20}
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {courseInsights && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {courseInsights.recommended_interventions.map(
                      (intervention, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg"
                        >
                          <Zap className="h-4 w-4 text-blue-600 mt-0.5" />
                          <p className="text-sm text-blue-800">
                            {intervention}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Areas of Concern
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Struggling Areas
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {courseInsights.struggling_areas.map((area, index) => (
                          <Badge
                            key={index}
                            variant="destructive"
                            className="text-xs"
                          >
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        At-Risk Students
                      </h4>
                      <div className="space-y-1">
                        {courseInsights.at_risk_students.map(
                          (student, index) => (
                            <div
                              key={index}
                              className="text-sm text-red-600 flex items-center gap-1"
                            >
                              <AlertCircle className="h-3 w-3" />
                              {student}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="misconceptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Student Misconceptions Analysis
              </CardTitle>
              <CardDescription>
                Detailed breakdown of misconceptions identified through review activities and AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Individual Student Misconceptions */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Individual Student Struggles</h3>
                  <div className="space-y-4">
                    {studentAnalytics.map((student) => (
                      <Card key={student.id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold mb-2">{student.name}</h4>
                              {student.struggling_concepts.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-600">
                                    Struggling with:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {student.struggling_concepts.map((concept, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="destructive"
                                        className="text-xs"
                                      >
                                        {concept}
                                      </Badge>
                                    ))}
                                  </div>
                                  <p className="text-sm text-gray-700 mt-2">
                                    <strong>Understanding:</strong> {student.name} seems to understand{" "}
                                    {student.mastered_concepts.slice(0, 2).join(", ")}
                                    {student.mastered_concepts.length > 2 && " and more"}, but not{" "}
                                    {student.struggling_concepts.slice(0, 2).join(", ")}
                                    {student.struggling_concepts.length > 2 && " and more"}.
                                  </p>
                                </div>
                              ) : (
                                <p className="text-sm text-green-600">
                                  No major misconceptions identified. Student is performing well.
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={
                                  student.struggling_concepts.length > 0
                                    ? "destructive"
                                    : "default"
                                }
                              >
                                {student.struggling_concepts.length} Issues
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Common Struggles */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Common Struggles Across Students</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {conceptAnalytics
                      .filter((c) => c.struggling_students > 0)
                      .map((concept, idx) => (
                        <Card key={idx} className="border-l-4 border-l-orange-500">
                          <CardHeader>
                            <CardTitle className="text-base">{concept.concept}</CardTitle>
                            <CardDescription>
                              {concept.struggling_students} of {concept.total_students} students struggling
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm font-medium mb-1">Common Misconceptions:</p>
                                <div className="flex flex-wrap gap-1">
                                  {concept.common_misconceptions.map((misconception, mIdx) => (
                                    <Badge
                                      key={mIdx}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {misconception}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium mb-1">Recommended Interventions:</p>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {concept.recommended_activities.map((activity, aIdx) => (
                                    <li key={aIdx}>• {activity}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>

                {/* Real-time Insights */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <Lightbulb className="h-5 w-5" />
                      AI-Powered Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm text-blue-800">
                      <p>
                        <strong>Pattern Detected:</strong> Multiple students showing similar struggle patterns in{" "}
                        {conceptAnalytics
                          .filter((c) => c.struggling_students > conceptAnalytics.length * 0.3)
                          .map((c) => c.concept)
                          .join(", ") || "advanced topics"}.
                      </p>
                      <p>
                        <strong>Recommendation:</strong> Consider creating additional review activities or
                        providing targeted interventions for these concepts.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
