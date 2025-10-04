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
import { Trophy, Medal, Award, Users, Clock, Target } from "lucide-react";

interface CompletionData {
  activityId: string;
  completedAt: string;
  score: number;
  timeSpent: number;
  studentId: string;
}

interface StudentStats {
  studentId: string;
  totalScore: number;
  totalTime: number;
  activitiesCompleted: number;
  averageScore: number;
  lastActivity: string;
}

export default function ActivityLeaderboard() {
  const [completions, setCompletions] = useState<CompletionData[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load completion data from localStorage (in a real app, this would be from database)
    const savedCompletions = localStorage.getItem("activity_completions");
    if (savedCompletions) {
      const allCompletions = JSON.parse(savedCompletions);
      setCompletions(allCompletions);

      // Calculate student statistics
      const statsMap = new Map<string, StudentStats>();

      allCompletions.forEach((completion: CompletionData) => {
        const studentId = completion.studentId;

        if (!statsMap.has(studentId)) {
          statsMap.set(studentId, {
            studentId,
            totalScore: 0,
            totalTime: 0,
            activitiesCompleted: 0,
            averageScore: 0,
            lastActivity: completion.completedAt,
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

      const sortedStats = Array.from(statsMap.values()).sort(
        (a, b) => b.totalScore - a.totalScore
      );
      setStudentStats(sortedStats);
    }

    setLoading(false);
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
            {index + 1}
          </div>
        );
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-50 border-yellow-200";
      case 1:
        return "bg-gray-50 border-gray-200";
      case 2:
        return "bg-amber-50 border-amber-200";
      default:
        return "bg-white border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (studentStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Activity Leaderboard
          </CardTitle>
          <CardDescription>
            Student performance and engagement metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              No Activity Data Yet
            </h3>
            <p className="text-gray-500">
              Students haven't completed any activities yet. Share activity URLs
              with students to see their progress here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Activity Leaderboard
        </CardTitle>
        <CardDescription>
          Student performance and engagement metrics ({studentStats.length}{" "}
          students)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {studentStats.map((student, index) => (
            <div
              key={student.studentId}
              className={`p-4 rounded-lg border ${getRankColor(
                index
              )} transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getRankIcon(index)}
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Student {student.studentId}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {student.activitiesCompleted} activities completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {student.totalScore}
                    </div>
                    <div className="text-xs text-gray-500">Total Points</div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {Math.round(student.averageScore)}
                    </div>
                    <div className="text-xs text-gray-500">Avg Score</div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {student.totalTime}m
                    </div>
                    <div className="text-xs text-gray-500">Total Time</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  {student.activitiesCompleted} activities
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Last: {new Date(student.lastActivity).toLocaleDateString()}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-lg font-bold text-blue-600">
                {studentStats.reduce((sum, s) => sum + s.totalScore, 0)}
              </div>
              <div className="text-gray-600">Total Points Earned</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {studentStats.reduce(
                  (sum, s) => sum + s.activitiesCompleted,
                  0
                )}
              </div>
              <div className="text-gray-600">Activities Completed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">
                {Math.round(
                  studentStats.reduce((sum, s) => sum + s.totalTime, 0) /
                    studentStats.length
                )}
                m
              </div>
              <div className="text-gray-600">Avg Time per Student</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
