"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Target,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
} from "recharts";

interface LearningObjectiveAnalyticsPageProps {
  params: Promise<{ courseId?: string }>;
}

interface LearningObjectiveData {
  objective: string;
  mastery_level: number;
  attempts: number;
  students_count: number;
  average_time: number;
  last_assessed: string;
  difficulty: number;
}

interface StudentProgress {
  student_id: string;
  student_name: string;
  objective: string;
  mastery_level: number;
  attempts: number;
  last_assessed: string;
}

export default function LearningObjectiveAnalyticsPage({
  params,
}: LearningObjectiveAnalyticsPageProps) {
  const [courseId, setCourseId] = useState<string>("");
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [objectivesData, setObjectivesData] = useState<LearningObjectiveData[]>(
    []
  );
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("30"); // days
  const [viewType, setViewType] = useState<"overview" | "detailed" | "trends">(
    "overview"
  );

  const supabase = createClient();

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      if (resolvedParams.courseId) {
        setCourseId(resolvedParams.courseId);
        loadCourse(resolvedParams.courseId);
      } else {
        loadCourses();
      }
    };
    loadParams();
  }, [params]);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error loading courses:", error);
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
      setSelectedCourse(data);
      loadObjectivesData(id);
    } catch (error) {
      console.error("Error loading course:", error);
    }
  };

  const loadObjectivesData = async (courseId: string) => {
    setIsLoading(true);
    try {
      // Get learning objectives from lessons
      const { data: lessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("learning_objectives")
        .eq("course_id", courseId);

      if (lessonsError) throw lessonsError;

      const allObjectives =
        lessons?.flatMap((lesson) => lesson.learning_objectives || []) || [];
      const uniqueObjectives = [...new Set(allObjectives)];

      // Get mastery data for each objective
      const objectivesWithData = await Promise.all(
        uniqueObjectives.map(async (objective) => {
          const { data: masteryData, error: masteryError } = await supabase
            .from("learning_objective_mastery")
            .select(
              `
              mastery_score,
              attempts,
              last_assessed_at,
              student_id,
              profiles(full_name)
            `
            )
            .eq("course_id", courseId)
            .eq("learning_objective", objective);

          if (masteryError) {
            console.error(
              `Error loading mastery for ${objective}:`,
              masteryError
            );
            return null;
          }

          const students = masteryData || [];
          const averageMastery =
            students.length > 0
              ? students.reduce((sum, s) => sum + s.mastery_score, 0) /
                students.length
              : 0;
          const averageAttempts =
            students.length > 0
              ? students.reduce((sum, s) => sum + s.attempts, 0) /
                students.length
              : 0;
          const lastAssessed =
            students.length > 0
              ? Math.max(
                  ...students.map((s) => new Date(s.last_assessed_at).getTime())
                )
              : 0;

          return {
            objective,
            mastery_level: Math.round(averageMastery),
            attempts: Math.round(averageAttempts),
            students_count: students.length,
            average_time: 0, // TODO: Calculate from activity completion times
            last_assessed: new Date(lastAssessed).toISOString(),
            difficulty: Math.round(averageAttempts / 2), // Rough difficulty estimate
          };
        })
      );

      setObjectivesData(
        objectivesWithData.filter(Boolean) as LearningObjectiveData[]
      );

      // Load detailed student progress
      loadStudentProgress(courseId, uniqueObjectives);
    } catch (error) {
      console.error("Error loading objectives data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudentProgress = async (
    courseId: string,
    objectives: string[]
  ) => {
    try {
      const { data, error } = await supabase
        .from("learning_objective_mastery")
        .select(
          `
          student_id,
          learning_objective,
          mastery_score,
          attempts,
          last_assessed_at,
          profiles(full_name)
        `
        )
        .eq("course_id", courseId)
        .in("learning_objective", objectives);

      if (error) throw error;

      const progressData: StudentProgress[] = (data || []).map((item) => ({
        student_id: item.student_id,
        student_name: item.profiles?.full_name || "Unknown",
        objective: item.learning_objective,
        mastery_level: item.mastery_score,
        attempts: item.attempts,
        last_assessed: item.last_assessed_at,
      }));

      setStudentProgress(progressData);
    } catch (error) {
      console.error("Error loading student progress:", error);
    }
  };

  const getMasteryColor = (level: number) => {
    if (level >= 80) return "text-green-600";
    if (level >= 60) return "text-yellow-600";
    if (level >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getMasteryBadgeVariant = (level: number) => {
    if (level >= 80) return "default";
    if (level >= 60) return "secondary";
    if (level >= 40) return "outline";
    return "destructive";
  };

  const exportData = () => {
    const csvData = objectivesData.map((obj) => ({
      "Learning Objective": obj.objective,
      "Average Mastery (%)": obj.mastery_level,
      "Average Attempts": obj.attempts,
      "Students Count": obj.students_count,
      "Last Assessed": new Date(obj.last_assessed).toLocaleDateString(),
    }));

    const csv = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `learning-objectives-${selectedCourse?.title || "course"}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const chartData = objectivesData.map((obj) => ({
    name:
      obj.objective.length > 30
        ? obj.objective.substring(0, 30) + "..."
        : obj.objective,
    mastery: obj.mastery_level,
    attempts: obj.attempts,
    students: obj.students_count,
  }));

  const pieData = [
    {
      name: "Mastered (80%+)",
      value: objectivesData.filter((obj) => obj.mastery_level >= 80).length,
      color: "#22c55e",
    },
    {
      name: "Developing (60-79%)",
      value: objectivesData.filter(
        (obj) => obj.mastery_level >= 60 && obj.mastery_level < 80
      ).length,
      color: "#eab308",
    },
    {
      name: "Emerging (40-59%)",
      value: objectivesData.filter(
        (obj) => obj.mastery_level >= 40 && obj.mastery_level < 60
      ).length,
      color: "#f97316",
    },
    {
      name: "Needs Support (<40%)",
      value: objectivesData.filter((obj) => obj.mastery_level < 40).length,
      color: "#ef4444",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              Learning Objectives Analytics
            </h1>
            <p className="text-muted-foreground">
              Track student mastery of learning objectives across your courses
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Select
              value={courseId}
              onValueChange={(value) => {
                setCourseId(value);
                loadCourse(value);
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {selectedCourse && (
          <Tabs
            value={viewType}
            onValueChange={(value) => setViewType(value as any)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed View</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Objectives
                    </CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {objectivesData.length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Average Mastery
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {objectivesData.length > 0
                        ? Math.round(
                            objectivesData.reduce(
                              (sum, obj) => sum + obj.mastery_level,
                              0
                            ) / objectivesData.length
                          )
                        : 0}
                      %
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Mastered Objectives
                    </CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {
                        objectivesData.filter((obj) => obj.mastery_level >= 80)
                          .length
                      }
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Needs Support
                    </CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {
                        objectivesData.filter((obj) => obj.mastery_level < 40)
                          .length
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Mastery Distribution</CardTitle>
                    <CardDescription>
                      Distribution of learning objectives by mastery level
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <RechartsPieChart
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </RechartsPieChart>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Mastery vs Attempts</CardTitle>
                    <CardDescription>
                      Relationship between mastery level and attempts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsLineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="mastery"
                          stroke="#8884d8"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="attempts"
                          stroke="#82ca9d"
                          strokeWidth={2}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Objectives List */}
              <Card>
                <CardHeader>
                  <CardTitle>Learning Objectives Performance</CardTitle>
                  <CardDescription>
                    Detailed view of each learning objective
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {objectivesData.map((objective, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{objective.objective}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{objective.students_count} students</span>
                            <span>{objective.attempts} avg attempts</span>
                            <span>
                              Last assessed:{" "}
                              {new Date(
                                objective.last_assessed
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32">
                            <Progress
                              value={objective.mastery_level}
                              className="h-2"
                            />
                          </div>
                          <Badge
                            variant={getMasteryBadgeVariant(
                              objective.mastery_level
                            )}
                          >
                            {objective.mastery_level}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Student Progress by Objective</CardTitle>
                  <CardDescription>
                    Individual student mastery for each learning objective
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {objectivesData.map((objective, index) => {
                      const studentData = studentProgress.filter(
                        (p) => p.objective === objective.objective
                      );
                      return (
                        <div key={index} className="border rounded-lg p-4">
                          <h3 className="font-medium mb-3">
                            {objective.objective}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {studentData.map((student, studentIndex) => (
                              <div
                                key={studentIndex}
                                className="flex items-center justify-between p-3 bg-muted rounded"
                              >
                                <span className="text-sm font-medium">
                                  {student.student_name}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={student.mastery_level}
                                    className="w-16 h-2"
                                  />
                                  <Badge
                                    variant={getMasteryBadgeVariant(
                                      student.mastery_level
                                    )}
                                  >
                                    {student.mastery_level}%
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mastery Trends</CardTitle>
                  <CardDescription>
                    How learning objectives mastery has changed over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Trend analysis coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!selectedCourse && (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Select a course to view learning objectives analytics
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
