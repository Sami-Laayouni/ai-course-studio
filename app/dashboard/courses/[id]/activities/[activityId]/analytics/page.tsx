"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Users,
  Clock,
  Award,
  Target,
  TrendingUp,
  BarChart3,
  Activity,
  Play,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import MisconceptionsAnalytics from "@/components/teacher/misconceptions-analytics";

interface ActivityAnalyticsPageProps {
  params: Promise<{ id: string; activityId: string }>;
}

interface StudentProgress {
  id: string;
  student_id: string;
  status: string;
  score: number | null;
  attempts: number;
  time_spent: number;
  started_at: string | null;
  completed_at: string | null;
  student: {
    full_name: string;
    email: string;
  };
}

interface RealTimeAnalytics {
  id: string;
  student_id: string;
  node_id: string;
  node_type: string;
  performance_data: any;
  timestamp: string;
  student: {
    full_name: string;
  };
}

interface StudentReplay {
  student_id: string;
  student_name: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  time_spent: number;
  nodes: RealTimeAnalytics[];
}

export default function ActivityAnalyticsPage({
  params,
}: ActivityAnalyticsPageProps) {
  const [courseId, setCourseId] = useState<string>("");
  const [activityId, setActivityId] = useState<string>("");
  const [activity, setActivity] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Overview data
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [averageTimeSpent, setAverageTimeSpent] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  
  // Performance data
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<number[]>([]);
  
  // Engagement data
  const [realTimeAnalytics, setRealTimeAnalytics] = useState<RealTimeAnalytics[]>([]);
  const [nodeEngagement, setNodeEngagement] = useState<any[]>([]);
  const [totalInteractions, setTotalInteractions] = useState(0);
  
  // Student replays
  const [studentReplays, setStudentReplays] = useState<StudentReplay[]>([]);
  const [selectedReplay, setSelectedReplay] = useState<StudentReplay | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setCourseId(resolvedParams.id);
      setActivityId(resolvedParams.activityId);
      loadActivity(resolvedParams.activityId);
      loadAnalytics(resolvedParams.activityId);
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
      setActivity(data);
    } catch (error) {
      console.error("Error loading activity:", error);
      setError("Failed to load activity");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async (id: string) => {
    try {
      // Load student progress data
      const { data: progressData, error: progressError } = await supabase
        .from("student_progress")
        .select(`
          *,
          student:profiles!student_progress_student_id_fkey(id, full_name, email)
        `)
        .eq("activity_id", id);

      if (progressError) {
        console.error("Error loading progress:", progressError);
      } else {
        const progress = (progressData || []) as StudentProgress[];
        setStudentProgress(progress);
        
        // Calculate overview metrics
        const attempted = progress.filter(p => p.status !== 'not_started').length;
        const completed = progress.filter(p => p.status === 'completed').length;
        const total = progress.length;
        
        setTotalAttempts(attempted);
        setTotalStudents(total);
        setCompletionRate(total > 0 ? Math.round((completed / total) * 100) : 0);
        
        // Calculate average score
        const scoresWithValues = progress
          .filter(p => p.score !== null && p.score !== undefined)
          .map(p => Number(p.score));
        if (scoresWithValues.length > 0) {
          const avgScore = scoresWithValues.reduce((a, b) => a + b, 0) / scoresWithValues.length;
          setAverageScore(Math.round(avgScore * 100) / 100);
        }
        
        // Calculate average time spent
        const timesWithValues = progress
          .filter(p => p.time_spent > 0)
          .map(p => p.time_spent);
        if (timesWithValues.length > 0) {
          const avgTime = timesWithValues.reduce((a, b) => a + b, 0) / timesWithValues.length;
          setAverageTimeSpent(Math.round(avgTime / 60)); // Convert to minutes
        }
        
        // Calculate score distribution (0-20, 21-40, 41-60, 61-80, 81-100)
        const distribution = [0, 0, 0, 0, 0];
        scoresWithValues.forEach(score => {
          if (score <= 20) distribution[0]++;
          else if (score <= 40) distribution[1]++;
          else if (score <= 60) distribution[2]++;
          else if (score <= 80) distribution[3]++;
          else distribution[4]++;
        });
        setScoreDistribution(distribution);
      }

      // Load real-time analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("real_time_analytics")
        .select(`
          *,
          student:profiles!real_time_analytics_student_id_fkey(id, full_name)
        `)
        .eq("activity_id", id)
        .order("timestamp", { ascending: false })
        .limit(1000);

      if (analyticsError) {
        console.error("Error loading analytics:", analyticsError);
      } else {
        const analytics = (analyticsData || []) as RealTimeAnalytics[];
        setRealTimeAnalytics(analytics);
        setTotalInteractions(analytics.length);
        
        // Calculate node engagement
        const nodeMap = new Map<string, { count: number; types: Set<string> }>();
        analytics.forEach(a => {
          const existing = nodeMap.get(a.node_id) || { count: 0, types: new Set() };
          existing.count++;
          existing.types.add(a.node_type);
          nodeMap.set(a.node_id, existing);
        });
        
        const nodeEngagementData = Array.from(nodeMap.entries()).map(([nodeId, data]) => ({
          node_id: nodeId,
          interactions: data.count,
          types: Array.from(data.types),
        }));
        setNodeEngagement(nodeEngagementData);
      }

      // Build student replays
      const { data: allProgress } = await supabase
        .from("student_progress")
        .select(`
          student_id,
          started_at,
          completed_at,
          score,
          time_spent,
          student:profiles!student_progress_student_id_fkey(id, full_name)
        `)
        .eq("activity_id", id)
        .neq("status", "not_started");

      if (allProgress) {
        const replays: StudentReplay[] = [];
        
        for (const progress of allProgress) {
          const { data: studentAnalytics } = await supabase
            .from("real_time_analytics")
            .select("*")
            .eq("activity_id", id)
            .eq("student_id", progress.student_id)
            .order("timestamp", { ascending: true });

          replays.push({
            student_id: progress.student_id,
            student_name: (progress.student as any)?.full_name || "Unknown",
            started_at: progress.started_at || new Date().toISOString(),
            completed_at: progress.completed_at,
            score: progress.score,
            time_spent: progress.time_spent,
            nodes: (studentAnalytics || []) as RealTimeAnalytics[],
          });
        }
        
        setStudentReplays(replays);
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Activity not found"}</p>
          <Button onClick={() => router.push(`/dashboard/courses/${courseId}`)}>
            Back to Course
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/courses/${courseId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course
              </Link>
            </Button>
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">{activity.title}</h1>
            <p className="text-gray-600">Activity Analytics & Performance</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="misconceptions">Misconceptions</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="replays">Student Replays</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Total Students
                  </CardTitle>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Users className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-gray-900">{totalStudents}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enrolled in course
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Total Attempts
                  </CardTitle>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Target className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-gray-900">{totalAttempts}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {totalStudents > 0 ? Math.round((totalAttempts / totalStudents) * 100) : 0}% attempted
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Completion Rate
                  </CardTitle>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-gray-900">{completionRate}%</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Students completed
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Average Score
                  </CardTitle>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Award className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-gray-900">
                    {averageScore !== null ? `${averageScore.toFixed(1)}%` : "—"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Average performance
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Avg. Time
                  </CardTitle>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-gray-900">
                    {averageTimeSpent} min
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Average completion time
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">Activity Details</CardTitle>
                <CardDescription className="text-gray-600">Information about this activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Type
                    </p>
                    <Badge variant="outline" className="text-sm">
                      {activity.activity_type || "Activity"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Points
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {activity.points || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Duration
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {activity.estimated_duration || 0} min
                    </p>
                  </div>
                </div>
                {activity.description && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Description
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{activity.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-lg font-semibold text-gray-900">Score Distribution</CardTitle>
                  <CardDescription className="text-gray-600">
                    Distribution of student scores across performance ranges
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-5">
                    {[
                      { label: "0-20%", color: "bg-red-500", bgColor: "bg-red-50" },
                      { label: "21-40%", color: "bg-orange-500", bgColor: "bg-orange-50" },
                      { label: "41-60%", color: "bg-yellow-500", bgColor: "bg-yellow-50" },
                      { label: "61-80%", color: "bg-blue-500", bgColor: "bg-blue-50" },
                      { label: "81-100%", color: "bg-green-500", bgColor: "bg-green-50" },
                    ].map((range, index) => {
                      const count = scoreDistribution[index] || 0;
                      const percentage = totalStudents > 0 ? (count / totalStudents) * 100 : 0;
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-700">{range.label}</span>
                            <span className="text-gray-600">{count} students</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div
                              className={`${range.color} h-full rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          {percentage > 0 && (
                            <p className="text-xs text-gray-500">{percentage.toFixed(1)}% of students</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-lg font-semibold text-gray-900">Student Performance</CardTitle>
                  <CardDescription className="text-gray-600">
                    Individual student results and progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {studentProgress.length === 0 ? (
                      <div className="text-center py-12">
                        <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">
                          No performance data available yet
                        </p>
                      </div>
                    ) : (
                      studentProgress.map((progress) => (
                        <div
                          key={progress.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {(progress.student as any)?.full_name || "Unknown Student"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {progress.status === "completed" ? (
                                <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                                  Completed
                                </Badge>
                              ) : progress.status === "in_progress" ? (
                                <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                                  In Progress
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs border-gray-200 text-gray-600 bg-gray-50">
                                  Not Started
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            {progress.score !== null ? (
                              <p className="font-semibold text-gray-900">{progress.score}%</p>
                            ) : (
                              <p className="text-gray-400">—</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {formatTime(progress.time_spent)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="misconceptions" className="space-y-6">
            <MisconceptionsAnalytics activityId={activityId} />
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Total Interactions
                  </CardTitle>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Activity className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-gray-900">{totalInteractions}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Node interactions tracked
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Active Nodes
                  </CardTitle>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Target className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-gray-900">{nodeEngagement.length}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Nodes with student activity
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Avg. Interactions
                  </CardTitle>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-gray-900">
                    {totalAttempts > 0 ? Math.round(totalInteractions / totalAttempts) : 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Per student attempt
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">Node Engagement</CardTitle>
                <CardDescription className="text-gray-600">
                  Nodes students interact with most frequently
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {nodeEngagement.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">
                        No engagement data available yet
                      </p>
                    </div>
                  ) : (
                    nodeEngagement
                      .sort((a, b) => b.interactions - a.interactions)
                      .slice(0, 10)
                      .map((node, index) => (
                        <div
                          key={node.node_id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                #{index + 1}
                              </span>
                              <p className="font-medium text-sm text-gray-900">
                                Node {node.node_id.slice(-8)}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {node.types.map((type, i) => (
                                <Badge key={i} variant="outline" className="text-xs border-gray-200 text-gray-700">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-gray-900">{node.interactions}</p>
                            <p className="text-xs text-gray-500">interactions</p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="replays" className="space-y-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">Student Activity Replays</CardTitle>
                <CardDescription className="text-gray-600">
                  View detailed timeline of individual student activity sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {studentReplays.length === 0 ? (
                  <div className="text-center py-12">
                    <Play className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      No student replays available yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {studentReplays.map((replay) => (
                      <div
                        key={replay.student_id}
                        className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors bg-white"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <Users className="h-4 w-4 text-gray-600" />
                              </div>
                              <p className="font-semibold text-gray-900">{replay.student_name}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-6 mb-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Started</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {new Date(replay.started_at).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(replay.started_at).toLocaleTimeString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Score</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {replay.score !== null ? `${replay.score}%` : "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Time Spent</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {formatTime(replay.time_spent)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Activity className="h-3 w-3" />
                              <span>{replay.nodes.length} node interactions tracked</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReplay(selectedReplay?.student_id === replay.student_id ? null : replay)}
                            className="ml-4"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {selectedReplay?.student_id === replay.student_id ? "Hide" : "View"} Timeline
                          </Button>
                        </div>

                        {selectedReplay?.student_id === replay.student_id && (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <p className="font-medium text-sm text-gray-900 mb-4">Activity Timeline</p>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {replay.nodes.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">
                                  No node interactions recorded
                                </p>
                              ) : (
                                replay.nodes.map((node, index) => (
                                  <div
                                    key={node.id}
                                    className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
                                  >
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
                                          {node.node_type}
                                        </Badge>
                                        <span className="text-xs text-gray-500">
                                          {new Date(node.timestamp).toLocaleTimeString()}
                                        </span>
                                      </div>
                                      {node.performance_data && (
                                        <div className="text-xs text-gray-600 space-y-1">
                                          {node.performance_data.score && (
                                            <p>Score: <span className="font-medium">{node.performance_data.score}%</span></p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
