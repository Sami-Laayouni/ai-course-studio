"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Users,
  Star,
  TrendingUp,
  Bell,
  Filter,
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  points: number;
  status: "not_started" | "in_progress" | "submitted" | "graded";
  course_title: string;
  lesson_title: string;
  created_at: string;
  submitted_at: string | null;
  grade: number | null;
  feedback: string | null;
  priority: "low" | "normal" | "high" | "urgent";
}

interface Course {
  id: string;
  title: string;
  subject: string;
  progress: number;
  next_lesson: string;
  total_assignments: number;
  completed_assignments: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function AssignmentDashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("due_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load assignments, courses, and notifications in parallel
      const [assignmentsRes, coursesRes, notificationsRes] = await Promise.all([
        fetch("/api/assignments"),
        fetch("/api/courses"),
        fetch("/api/notifications?unread_only=true&limit=10"),
      ]);

      const [assignmentsData, coursesData, notificationsData] =
        await Promise.all([
          assignmentsRes.json(),
          coursesRes.json(),
          notificationsRes.json(),
        ]);

      if (assignmentsData.assignments) {
        setAssignments(assignmentsData.assignments);
      }
      if (coursesData.courses) {
        setCourses(coursesData.courses);
      }
      if (notificationsData.notifications) {
        setNotifications(notificationsData.notifications);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAssignments = assignments
    .filter((assignment) => {
      const matchesSearch =
        assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.course_title
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesFilter =
        filterStatus === "all" || assignment.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "due_date":
          const aDate = a.due_date ? new Date(a.due_date) : new Date(0);
          const bDate = b.due_date ? new Date(b.due_date) : new Date(0);
          comparison = aDate.getTime() - bDate.getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "points":
          comparison = a.points - b.points;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not_started":
        return "bg-gray-500";
      case "in_progress":
        return "bg-blue-500";
      case "submitted":
        return "bg-yellow-500";
      case "graded":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "not_started":
        return <AlertCircle className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "submitted":
        return <CheckCircle className="h-4 w-4" />;
      case "graded":
        return <Star className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-600";
      case "high":
        return "text-orange-600";
      case "normal":
        return "text-blue-600";
      case "low":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const upcomingAssignments = assignments
    .filter((a) => a.status !== "graded" && a.due_date)
    .sort(
      (a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    )
    .slice(0, 5);

  const recentNotifications = notifications.slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Assignments</h1>
          <p className="text-muted-foreground">
            Track your progress and stay on top of your work
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Bell className="h-3 w-3" />
            {notifications.length} new
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Assignments
                </p>
                <p className="text-2xl font-bold">{assignments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {assignments.filter((a) => a.status === "graded").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {assignments.filter((a) => a.status === "in_progress").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold">
                  {assignments.reduce((sum, a) => sum + a.points, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assignments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="graded">Graded</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_date">Due Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="points">Points</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                >
                  {sortOrder === "asc" ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <SortDesc className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assignments List */}
          <div className="space-y-4">
            {filteredAssignments.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No assignments found
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm || filterStatus !== "all"
                      ? "Try adjusting your search or filters"
                      : "You don't have any assignments yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredAssignments.map((assignment) => (
                <Card
                  key={assignment.id}
                  className={`${
                    isOverdue(assignment.due_date) &&
                    assignment.status !== "graded"
                      ? "border-red-200 bg-red-50"
                      : ""
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">
                            {assignment.course_title}
                          </Badge>
                          <div
                            className={`w-2 h-2 rounded-full ${getStatusColor(
                              assignment.status
                            )}`}
                          />
                          <span className="text-sm text-muted-foreground capitalize">
                            {assignment.status.replace("_", " ")}
                          </span>
                          {assignment.priority !== "normal" && (
                            <Badge
                              variant="outline"
                              className={getPriorityColor(assignment.priority)}
                            >
                              {assignment.priority}
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-semibold text-lg mb-2">
                          {assignment.title}
                        </h3>
                        <p className="text-muted-foreground mb-3">
                          {assignment.description}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {assignment.due_date
                              ? formatDate(assignment.due_date)
                              : "No due date"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4" />
                            {assignment.points} points
                          </div>
                          {assignment.grade !== null && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Grade: {assignment.grade}%
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {assignment.status === "not_started" && (
                          <Button size="sm">Start Assignment</Button>
                        )}
                        {assignment.status === "in_progress" && (
                          <Button size="sm" variant="outline">
                            Continue
                          </Button>
                        )}
                        {assignment.status === "submitted" && (
                          <Button size="sm" variant="outline" disabled>
                            Submitted
                          </Button>
                        )}
                        {assignment.status === "graded" && (
                          <Button size="sm" variant="outline">
                            View Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming assignments
                  </p>
                ) : (
                  upcomingAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-3 bg-muted rounded-lg"
                    >
                      <h4 className="font-medium text-sm mb-1">
                        {assignment.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {assignment.course_title}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {assignment.due_date
                            ? formatDate(assignment.due_date)
                            : "No due date"}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {assignment.points} pts
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentNotifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No new notifications
                  </p>
                ) : (
                  recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-3 bg-muted rounded-lg"
                    >
                      <h4 className="font-medium text-sm mb-1">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Course Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Course Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{course.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {course.progress}%
                      </span>
                    </div>
                    <Progress value={course.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {course.completed_assignments} /{" "}
                      {course.total_assignments} assignments
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
