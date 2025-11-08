"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SimpleActivityPlayer from "@/components/learning/simple-activity-player";
import AgenticActivityPlayer from "@/components/learning/agentic-activity-player";
import EnhancedActivityPlayer from "@/components/learning/enhanced-activity-player";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Trophy, Users, Clock, User } from "lucide-react";
import Link from "next/link";

interface StudentLoginFormProps {
  onLogin: (name: string) => void;
}

function StudentLoginForm({ onLogin }: StudentLoginFormProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="studentName">Your Name</Label>
        <Input
          id="studentName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name..."
          required
          className="mt-1"
        />
      </div>
      <Button type="submit" className="w-full">
        <User className="h-4 w-4 mr-2" />
        Start Activity
      </Button>
    </form>
  );
}

interface Activity {
  id: string;
  title: string;
  description: string;
  content: {
    nodes: any[];
    connections: any[];
  };
  points: number;
  estimated_duration: number;
}

export default function ActivityPage({ params }: { params: { id: string } }) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [studentName, setStudentName] = useState("");
  const router = useRouter();

  const loadActivityFromDatabase = async (activityId: string) => {
    try {
      // Check if this is an old format ID (starts with "activity_" followed by numbers)
      const isOldFormat = activityId.match(/^activity_\d+$/);

      if (isOldFormat) {
        console.log(
          "Detected old format activity ID, skipping database lookup:",
          activityId
        );
        loadActivityFromLocalStorage(activityId);
        return;
      }

      console.log("Loading activity from database:", activityId);
      const response = await fetch(`/api/activities?activity_id=${activityId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.activities && data.activities.length > 0) {
          const activityData = data.activities[0];
          console.log("Loaded activity from database:", activityData);
          setActivity(activityData);
        } else {
          console.log("Activity not found in database, trying localStorage...");
          loadActivityFromLocalStorage(activityId);
        }
      } else {
        console.log("Database request failed, trying localStorage...");
        loadActivityFromLocalStorage(activityId);
      }
    } catch (error) {
      console.error("Error loading activity from database:", error);
      console.log("Falling back to localStorage...");
      loadActivityFromLocalStorage(activityId);
    }
  };

  const loadActivityFromLocalStorage = (activityId: string) => {
    // Check if this is an old format ID (starts with "activity_" followed by numbers)
    const isOldFormat = activityId.match(/^activity_\d+$/);

    let savedActivity;
    let lookupKey;

    if (isOldFormat) {
      // For old format, the ID already includes "activity_" prefix
      lookupKey = activityId;
      savedActivity = localStorage.getItem(activityId);
    } else {
      // For new format (UUID), add the "activity_" prefix
      lookupKey = `activity_${activityId}`;
      savedActivity = localStorage.getItem(lookupKey);
    }

    console.log("Looking for activity with key:", lookupKey);
    console.log("Activity ID format:", isOldFormat ? "OLD" : "NEW");
    console.log(
      "Available keys:",
      Object.keys(localStorage).filter((key) => key.startsWith("activity_"))
    );

    if (savedActivity) {
      const activityData = JSON.parse(savedActivity);
      console.log("Loaded activity from localStorage:", activityData);
      setActivity(activityData);
    } else {
      console.log("Activity not found in localStorage");
      console.log("Tried keys:", [
        lookupKey,
        activityId,
        `activity_${activityId}`,
      ]);

      // Try alternative lookup methods
      const allActivityKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith("activity_")
      );
      console.log("All activity keys found:", allActivityKeys);

      // Check if there's a partial match
      const partialMatch = allActivityKeys.find(
        (key) =>
          key.includes(activityId) ||
          activityId.includes(key.replace("activity_", ""))
      );
      if (partialMatch) {
        console.log("Found partial match:", partialMatch);
        const partialData = localStorage.getItem(partialMatch);
        if (partialData) {
          const activityData = JSON.parse(partialData);
          console.log("Loaded activity from partial match:", activityData);
          setActivity(activityData);
          return;
        }
      }
    }
  };

  useEffect(() => {
    // Check authentication
    const savedStudent = localStorage.getItem("student_session");
    if (savedStudent) {
      const studentData = JSON.parse(savedStudent);
      setIsAuthenticated(true);
      setStudentName(studentData.name || "Student");
    } else {
      // Redirect to login or show login form
      setIsAuthenticated(false);
    }

    // Load activity from database
    loadActivityFromDatabase(params.id);
    setLoading(false);
  }, [params.id]);

  const handleActivityComplete = (
    finalScore?: number,
    finalTimeSpent?: number
  ) => {
    setCompleted(true);
    setScore(finalScore || 0);
    setTimeSpent(finalTimeSpent || 0);

    // Save completion data (in a real app, this would save to database)
    const completionData = {
      activityId: params.id,
      completedAt: new Date().toISOString(),
      score: finalScore || 0,
      timeSpent: finalTimeSpent || 0,
      studentId: `student_${Date.now()}`,
      studentName: studentName,
    };

    const existingCompletions = JSON.parse(
      localStorage.getItem("activity_completions") || "[]"
    );
    existingCompletions.push(completionData);
    localStorage.setItem(
      "activity_completions",
      JSON.stringify(existingCompletions)
    );
  };

  const handleStudentLogin = (name: string) => {
    const studentData = {
      name,
      id: `student_${Date.now()}`,
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem("student_session", JSON.stringify(studentData));
    setIsAuthenticated(true);
    setStudentName(name);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              Student Login Required
            </CardTitle>
            <CardDescription className="text-center">
              Please enter your name to access this activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StudentLoginForm onLogin={handleStudentLogin} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Activity Not Found
            </CardTitle>
            <CardDescription className="text-center">
              The activity you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/learn">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Learning
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">
                Activity Completed!
              </CardTitle>
              <CardDescription>
                Congratulations! You have successfully completed "
                {activity.title}"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {score}
                  </div>
                  <div className="text-sm text-blue-600">Points Earned</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {timeSpent}
                  </div>
                  <div className="text-sm text-purple-600">Minutes Spent</div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  Great job! You've earned <strong>{score} points</strong> and
                  completed this activity in{" "}
                  <strong>{timeSpent} minutes</strong>.
                </p>

                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Retry Activity
                  </Button>
                  <Link href="/learn">
                    <Button>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Learning
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check if activity has node-based structure (from Zapier builder)
  const hasNodes = activity?.content?.nodes && Array.isArray(activity.content.nodes) && activity.content.nodes.length > 0;
  const isEnhancedWorkflow = activity?.activity_type === "enhanced_workflow" || activity?.type === "enhanced_workflow";
  
  // Check if it's an agentic activity
  const isAgentic =
    activity?.activity_type === "custom" ||
    activity?.content?.mode ||
    activity?.content?.diagram ||
    activity?.content?.steps ||
    activity?.content?.prompts;

  // Use EnhancedActivityPlayer for node-based activities
  if (hasNodes || isEnhancedWorkflow) {
    return (
      <EnhancedActivityPlayer
        activity={activity}
        onComplete={handleActivityComplete}
      />
    );
  }

  // Use AgenticActivityPlayer for agentic activities
  if (isAgentic) {
    return (
      <AgenticActivityPlayer
        activity={activity}
        onComplete={handleActivityComplete}
      />
    );
  }

  // Default to SimpleActivityPlayer
  return (
    <SimpleActivityPlayer
      activity={activity}
      onComplete={handleActivityComplete}
    />
  );
}
