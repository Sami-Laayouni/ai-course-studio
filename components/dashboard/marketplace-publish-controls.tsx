"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Loader2, Lock } from "lucide-react";

export interface MarketplaceCourseSummary {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  grade_level: string | null;
  is_published: boolean | null;
  created_at: string;
  learning_objectives?: string[] | null;
}

interface MarketplacePublishControlsProps {
  initialCourses: MarketplaceCourseSummary[];
}

export function MarketplacePublishControls({
  initialCourses,
}: MarketplacePublishControlsProps) {
  const supabase = createClient();
  const [courses, setCourses] =
    useState<MarketplaceCourseSummary[]>(initialCourses);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const togglePublish = async (courseId: string, nextState: boolean) => {
    setUpdatingId(courseId);

    const { error } = await supabase
      .from("courses")
      .update({ is_published: nextState })
      .eq("id", courseId);

    if (error) {
      toast({
        title: "Could not update course",
        description: error.message,
        variant: "destructive",
      });
      setUpdatingId(null);
      return;
    }

    setCourses((prev) =>
      prev.map((course) =>
        course.id === courseId ? { ...course, is_published: nextState } : course
      )
    );

    toast({
      title: nextState ? "Course published" : "Course unpublished",
      description: nextState
        ? "Your course is now visible in the marketplace."
        : "The course is hidden from the marketplace.",
    });

    setUpdatingId(null);
  };

  if (!courses.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center space-y-4">
          <CardTitle className="text-xl">No courses to publish yet</CardTitle>
          <CardDescription className="text-base">
            Create a course, then publish it to share with educators in the
            marketplace.
          </CardDescription>
          <Button asChild>
            <Link href="/dashboard/courses/new">Create a course</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => {
        const isPublished = Boolean(course.is_published);

        return (
          <Card
            key={course.id}
            className="hover:shadow-md transition-shadow h-full flex flex-col"
          >
            <CardHeader className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg line-clamp-2">
                    {course.title}
                  </CardTitle>
                  <CardDescription>
                    {[course.subject, course.grade_level]
                      .filter(Boolean)
                      .join(" • ") || "Course"}
                  </CardDescription>
                </div>
                <Badge
                  variant={isPublished ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  {isPublished ? (
                    <>
                      <Globe className="h-3 w-3" />
                      Published
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" />
                      Draft
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {course.description || "No description provided yet."}
              </p>

              {course.learning_objectives &&
                course.learning_objectives.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Sample objectives
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {course.learning_objectives.slice(0, 2).map((obj, idx) => (
                        <li key={idx} className="line-clamp-1">
                          • {obj}
                        </li>
                      ))}
                      {course.learning_objectives.length > 2 && (
                        <li className="text-muted-foreground/70">
                          + {course.learning_objectives.length - 2} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => togglePublish(course.id, !isPublished)}
                  disabled={updatingId === course.id}
                  className="flex-1"
                  variant={isPublished ? "outline" : "default"}
                >
                  {updatingId === course.id && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isPublished ? "Unpublish" : "Publish"}
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/courses/${course.id}`}>View</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
