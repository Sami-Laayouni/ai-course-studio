import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Brain, BarChart3, Users } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();

  // Check if user is already logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Get user profile to determine redirect
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "student";

    // Redirect based on role
    if (userRole === "admin") {
      redirect("/admin");
    } else if (userRole === "teacher") {
      redirect("/dashboard");
    } else {
      redirect("/learn");
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 text-balance">
            AI Course Authoring Studio
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto text-pretty">
            Empower educators with AI-driven tools to create personalized,
            adaptive learning experiences that engage students and improve
            outcomes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/auth/signup">Get Started</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 bg-transparent"
            >
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <BookOpen className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <CardTitle>AI Content Creation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate quizzes, assignments, and interactive content with AI
                assistance tailored to your curriculum.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Brain className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <CardTitle>Adaptive Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Personalized learning paths that adapt to each student's pace,
                strengths, and areas for improvement.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <BarChart3 className="h-12 w-12 mx-auto text-purple-600 mb-4" />
              <CardTitle>Real-time Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track student progress, identify learning gaps, and make
                data-driven instructional decisions.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto text-orange-600 mb-4" />
              <CardTitle>Collaborative Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Share resources, collaborate with colleagues, and build a
                community of innovative educators.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">
                Ready to Transform Your Teaching?
              </CardTitle>
              <CardDescription className="text-lg">
                Join thousands of educators already using AI to create better
                learning experiences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="/auth/signup">Start Your Free Trial</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
