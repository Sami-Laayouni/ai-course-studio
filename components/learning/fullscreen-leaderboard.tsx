"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trophy,
  Medal,
  Award,
  Users,
  Clock,
  Target,
  Search,
  X,
  Filter,
  Download,
} from "lucide-react";

interface CompletionData {
  activityId: string;
  completedAt: string;
  score: number;
  timeSpent: number;
  studentId: string;
  studentName?: string;
}

interface StudentStats {
  studentId: string;
  studentName: string;
  totalScore: number;
  totalTime: number;
  activitiesCompleted: number;
  averageScore: number;
  lastActivity: string;
  rank: number;
}

interface FullscreenLeaderboardProps {
  onClose: () => void;
  courseId?: string;
}

export default function FullscreenLeaderboard({
  onClose,
  courseId,
}: FullscreenLeaderboardProps) {
  const [completions, setCompletions] = useState<CompletionData[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "score" | "time" | "activities" | "name"
  >("score");
  const [filterBy, setFilterBy] = useState<"all" | "completed" | "incomplete">(
    "all"
  );

  useEffect(() => {
    loadLeaderboardData();
  }, [courseId]);

  const loadLeaderboardData = () => {
    // Load completion data from localStorage (in a real app, this would be from database)
    const savedCompletions = localStorage.getItem("activity_completions");
    if (savedCompletions) {
      const allCompletions = JSON.parse(savedCompletions);
      setCompletions(allCompletions);

      // Calculate student statistics
      const statsMap = new Map<string, StudentStats>();

      allCompletions.forEach((completion: CompletionData) => {
        const studentId = completion.studentId;
        const studentName = completion.studentName || `Student ${studentId}`;

        if (!statsMap.has(studentId)) {
          statsMap.set(studentId, {
            studentId,
            studentName,
            totalScore: 0,
            totalTime: 0,
            activitiesCompleted: 0,
            averageScore: 0,
            lastActivity: completion.completedAt,
            rank: 0,
          });
        }

        const stats = statsMap.get(studentId)!;
        stats.totalScore += completion.score;
        stats.totalTime += completion.timeSpent;
        stats.activitiesCompleted += 1;
        stats.averageScore = stats.totalScore / stats.activitiesCompleted;

        if (new Date(completion.completedAt) > new Date(stats.lastActivity)) {
          stats.lastActivity = completion.completedAt;
        }
      });

      // Sort and assign ranks
      const sortedStats = Array.from(statsMap.values()).sort(
        (a, b) => b.totalScore - a.totalScore
      );
      sortedStats.forEach((stats, index) => {
        stats.rank = index + 1;
      });

      setStudentStats(sortedStats);
    }

    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
            {rank}
          </div>
        );
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-50 border-yellow-200";
      case 2:
        return "bg-gray-50 border-gray-200";
      case 3:
        return "bg-amber-50 border-amber-200";
      default:
        return "bg-white border-gray-200";
    }
  };

  const filteredStudents = studentStats.filter((student) => {
    const matchesSearch =
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterBy === "completed") {
      return matchesSearch && student.activitiesCompleted > 0;
    } else if (filterBy === "incomplete") {
      return matchesSearch && student.activitiesCompleted === 0;
    }

    return matchesSearch;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortBy) {
      case "score":
        return b.totalScore - a.totalScore;
      case "time":
        return b.totalTime - a.totalTime;
      case "activities":
        return b.activitiesCompleted - a.activitiesCompleted;
      case "name":
        return a.studentName.localeCompare(b.studentName);
      default:
        return a.rank - b.rank;
    }
  });

  const exportData = () => {
    const csvContent = [
      [
        "Rank",
        "Student Name",
        "Student ID",
        "Total Score",
        "Activities Completed",
        "Average Score",
        "Total Time (min)",
        "Last Activity",
      ],
      ...sortedStudents.map((student) => [
        student.rank,
        student.studentName,
        student.studentId,
        student.totalScore,
        student.activitiesCompleted,
        Math.round(student.averageScore),
        student.totalTime,
        new Date(student.lastActivity).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaderboard_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Activity Leaderboard
            </h1>
            <p className="text-gray-600 mt-1">
              Student performance and engagement metrics ({studentStats.length}{" "}
              students)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={onClose} variant="outline">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="score">Sort by Score</option>
              <option value="time">Sort by Time</option>
              <option value="activities">Sort by Activities</option>
              <option value="name">Sort by Name</option>
            </select>

            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Students</option>
              <option value="completed">Completed Activities</option>
              <option value="incomplete">No Activities</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {studentStats.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-600 mb-2">
              No Activity Data Yet
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Students haven't completed any activities yet. Share activity URLs
              with students to see their progress here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedStudents.map((student) => (
              <Card
                key={student.studentId}
                className={`transition-all hover:shadow-lg ${getRankColor(
                  student.rank
                )}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getRankIcon(student.rank)}
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {student.studentName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          ID: {student.studentId} •{" "}
                          {student.activitiesCompleted} activities completed
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {student.totalScore}
                        </div>
                        <div className="text-sm text-gray-500">
                          Total Points
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(student.averageScore)}
                        </div>
                        <div className="text-sm text-gray-500">Avg Score</div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {student.totalTime}m
                        </div>
                        <div className="text-sm text-gray-500">Total Time</div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {student.activitiesCompleted}
                        </div>
                        <div className="text-sm text-gray-500">Activities</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Badge variant="outline" className="text-sm">
                      <Target className="h-3 w-3 mr-1" />
                      {student.activitiesCompleted} activities
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      <Clock className="h-3 w-3 mr-1" />
                      Last:{" "}
                      {new Date(student.lastActivity).toLocaleDateString()}
                    </Badge>
                    <Badge
                      variant={student.rank <= 3 ? "default" : "secondary"}
                      className="text-sm"
                    >
                      Rank #{student.rank}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {studentStats.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Class Summary</CardTitle>
              <CardDescription>
                Overall performance metrics for this class
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {studentStats.reduce((sum, s) => sum + s.totalScore, 0)}
                  </div>
                  <div className="text-gray-600">Total Points Earned</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {studentStats.reduce(
                      (sum, s) => sum + s.activitiesCompleted,
                      0
                    )}
                  </div>
                  <div className="text-gray-600">Activities Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {Math.round(
                      studentStats.reduce((sum, s) => sum + s.totalTime, 0) /
                        studentStats.length
                    )}
                    m
                  </div>
                  <div className="text-gray-600">Avg Time per Student</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {Math.round(
                      studentStats.reduce((sum, s) => sum + s.averageScore, 0) /
                        studentStats.length
                    )}
                  </div>
                  <div className="text-gray-600">Class Average Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
