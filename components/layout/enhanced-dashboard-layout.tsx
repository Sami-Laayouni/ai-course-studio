"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/ui/notification-bell";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Plus,
  Home,
  GraduationCap,
  BarChart3,
  FileText,
  Video,
  MessageSquare,
  Zap,
  Brain,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface EnhancedDashboardLayoutProps {
  children: React.ReactNode;
  userRole?: "teacher" | "student" | "admin";
}

export default function EnhancedDashboardLayout({
  children,
  userRole = "teacher",
}: EnhancedDashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();

  const teacherNavigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      current: pathname === "/dashboard",
    },
    {
      name: "Courses",
      href: "/dashboard/courses",
      icon: BookOpen,
      current: pathname.startsWith("/dashboard/courses"),
    },
    {
      name: "AI Generator",
      href: "/dashboard/ai-generator",
      icon: Brain,
      current: pathname.startsWith("/dashboard/ai-generator"),
    },
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: BarChart3,
      current: pathname.startsWith("/dashboard/analytics"),
    },
    {
      name: "Students",
      href: "/dashboard/students",
      icon: Users,
      current: pathname.startsWith("/dashboard/students"),
    },
  ];

  const studentNavigation = [
    {
      name: "My Learning",
      href: "/learn",
      icon: GraduationCap,
      current: pathname === "/learn",
    },
    {
      name: "Courses",
      href: "/learn/courses",
      icon: BookOpen,
      current: pathname.startsWith("/learn/courses"),
    },
    {
      name: "Assignments",
      href: "/learn/assignments",
      icon: FileText,
      current: pathname.startsWith("/learn/assignments"),
    },
    {
      name: "Activities",
      href: "/learn/activities",
      icon: Zap,
      current: pathname.startsWith("/learn/activities"),
    },
  ];

  const navigation =
    userRole === "teacher" ? teacherNavigation : studentNavigation;

  const activityTypes = [
    { name: "AI Chat", icon: MessageSquare, color: "text-blue-600" },
    { name: "Quiz", icon: FileText, color: "text-green-600" },
    { name: "Video", icon: Video, color: "text-red-600" },
    { name: "Simulation", icon: Zap, color: "text-purple-600" },
    { name: "Whiteboard", icon: Brain, color: "text-orange-600" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">EduAI</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.current
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Activity Types (for teachers) */}
          {userRole === "teacher" && (
            <div className="px-4 py-4 border-t border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Activity Types
              </h3>
              <div className="space-y-2">
                {activityTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.name}
                      className="flex items-center gap-2 px-2 py-1 rounded text-xs"
                    >
                      <Icon className={`h-4 w-4 ${type.color}`} />
                      <span className="text-muted-foreground">{type.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* User section */}
          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src="/placeholder-user.jpg" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">User Name</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {userRole}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses, lessons, activities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Quick actions for teachers */}
              {userRole === "teacher" && (
                <div className="hidden sm:flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    New Course
                  </Button>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    New Lesson
                  </Button>
                </div>
              )}

              {/* Notifications */}
              <NotificationBell />

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
