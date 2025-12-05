import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  MarketplacePublishControls,
  type MarketplaceCourseSummary,
} from "@/components/dashboard/marketplace-publish-controls";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Rocket } from "lucide-react";

export default async function MarketplacePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const { data: myCourses } = await supabase
    .from("courses")
    .select(
      "id, title, description, subject, grade_level, is_published, learning_objectives, created_at"
    )
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const { data: publishedCourses } = await supabase
    .from("courses")
    .select(
      "id, title, description, subject, grade_level, is_published, learning_objectives, created_at"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(24);

  const publishedList: MarketplaceCourseSummary[] = publishedCourses || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-10">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Share your work
            </p>
            <h1 className="text-3xl font-bold text-foreground mt-1">
              Marketplace
            </h1>
            <p className="text-muted-foreground mt-2">
              Publish courses to the marketplace so other educators can view
              them, enroll, or request access.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/courses/new">Create Course</Link>
          </Button>
        </header>

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Publish your courses</h2>
              <p className="text-muted-foreground">
                Toggle which courses appear in the public marketplace.
              </p>
            </div>
          </div>
          <MarketplacePublishControls initialCourses={myCourses || []} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Live marketplace</h2>
              <p className="text-muted-foreground">
                See what is currently visible to educators and students.
              </p>
            </div>
            <Badge
              variant="secondary"
              className="flex items-center gap-1 w-fit px-3 py-1"
            >
              <Globe className="h-3 w-3" />
              {publishedList.length} live
            </Badge>
          </div>

          {publishedList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedList.map((course) => (
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
                      <Badge className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Published
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                            {course.learning_objectives
                              .slice(0, 2)
                              .map((obj, idx) => (
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
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center space-y-3">
                <CardTitle className="text-xl">Nothing live yet</CardTitle>
                <CardDescription className="text-base">
                  Publish a course above to make it visible in the marketplace.
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
