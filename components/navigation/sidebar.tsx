"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Home,
  PlusCircle,
  Brain,
  GraduationCap,
  Shield,
  Menu,
  X,
  LogOut,
  Database,
} from "lucide-react";

interface SidebarProps {
  userRole: "admin" | "teacher" | "student";
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const supabase = createClient();

  const getNavItems = () => {
    switch (userRole) {
      case "admin":
        return [
          { href: "/admin", label: "Admin Dashboard", icon: Shield },
          {
            href: "/admin/database-status",
            label: "Database Status",
            icon: Database,
          },
          { href: "/admin/users", label: "User Management", icon: Users },
          {
            href: "/admin/courses",
            label: "Course Management",
            icon: BookOpen,
          },
          { href: "/admin/fix-roles", label: "Fix User Roles", icon: Users },
          { href: "/admin/settings", label: "System Settings", icon: Settings },
        ];
      case "teacher":
        return [
          { href: "/dashboard", label: "Dashboard", icon: Home },
          { href: "/dashboard/courses", label: "My Courses", icon: BookOpen },

          { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
        ];
      case "student":
        return [{ href: "/learn", label: "My Learning", icon: GraduationCap }];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/auth/login");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-r",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-foreground">
            AI Course Studio
          </h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto"
        >
          {isCollapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          <TooltipProvider>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              const buttonEl = (
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isCollapsed && "px-2",
                    isActive && "bg-primary text-primary-foreground shadow"
                  )}
                >
                  <Icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                  {!isCollapsed && item.label}
                </Button>
              );

              return (
                <Link key={item.href} href={item.href}>
                  {isCollapsed ? (
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>{buttonEl}</TooltipTrigger>
                      <TooltipContent side="right">
                        <span>{item.label}</span>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    buttonEl
                  )}
                </Link>
              );
            })}
          </TooltipProvider>
        </nav>
      </ScrollArea>

      <div className="p-4 border-t space-y-2">
        <Button
          variant="outline"
          className={cn("w-full", isCollapsed && "px-2")}
          asChild
        >
          <Link href="/dashboard/settings">
            <Settings className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
            {!isCollapsed && "Settings"}
          </Link>
        </Button>
        <Button
          variant="outline"
          className={cn("w-full", isCollapsed && "px-2")}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
          {!isCollapsed && "Logout"}
        </Button>
      </div>
    </div>
  );
}
