"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  Eye,
  Headphones,
  Hand,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const ICONS = {
  visual: Eye,
  auditory: Headphones,
  reading: BookOpen,
  kinesthetic: Hand,
};

const questions = [
  {
    id: 1,
    question: "When learning something new, I prefer to:",
    options: [
      {
        value: "visual-1",
        label: "See diagrams or visual examples",
        style: "visual",
      },
      {
        value: "auditory-1",
        label: "Listen to explanations or discussions",
        style: "auditory",
      },
      {
        value: "reading-1",
        label: "Read written instructions or text",
        style: "reading",
      },
      {
        value: "kinesthetic-1",
        label: "Try it out hands-on",
        style: "kinesthetic",
      },
    ],
  },
  {
    id: 2,
    question: "I remember information best when I:",
    options: [
      {
        value: "visual-2",
        label: "Picture it or see it written down",
        style: "visual",
      },
      {
        value: "auditory-2",
        label: "Hear it explained or discussed",
        style: "auditory",
      },
      {
        value: "reading-2",
        label: "Read it or write it repeatedly",
        style: "reading",
      },
      { value: "kinesthetic-2", label: "Do it myself", style: "kinesthetic" },
    ],
  },
  {
    id: 3,
    question: "When studying for a test, I:",
    options: [
      {
        value: "visual-3",
        label: "Use mind maps or flashcards",
        style: "visual",
      },
      {
        value: "auditory-3",
        label: "Read aloud or discuss concepts",
        style: "auditory",
      },
      {
        value: "reading-3",
        label: "Write and summarize notes",
        style: "reading",
      },
      {
        value: "kinesthetic-3",
        label: "Practice or act out concepts",
        style: "kinesthetic",
      },
    ],
  },
  {
    id: 4,
    question: "I learn best from:",
    options: [
      { value: "visual-4", label: "Videos or infographics", style: "visual" },
      {
        value: "auditory-4",
        label: "Podcasts or discussions",
        style: "auditory",
      },
      { value: "reading-4", label: "Books or articles", style: "reading" },
      {
        value: "kinesthetic-4",
        label: "Hands-on activities",
        style: "kinesthetic",
      },
    ],
  },
];

export default function LearningStyleAssessment() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push("/auth/login");

      const { data: profile } = await supabase
        .from("profiles")
        .select("has_completed_assessment, role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "student") return router.push("/dashboard");
      if (profile?.has_completed_assessment) return router.push("/learn");
      setLoading(false);
    })();
  }, [router]);

  const progress = ((index + 1) / questions.length) * 100;

  const handleNext = () =>
    index < questions.length - 1 ? setIndex(index + 1) : handleSubmit();

  const handlePrev = () => index > 0 && setIndex(index - 1);

  const calculateResults = () => {
    const scores = { visual: 0, auditory: 0, reading: 0, kinesthetic: 0 };
    Object.values(answers).forEach((val) => {
      const q = questions.find((q) => q.options.some((o) => o.value === val));
      const opt = q?.options.find((o) => o.value === val);
      if (opt) scores[opt.style]++;
    });
    const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    return { primary_style: top, scores };
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length)
      return alert("Please answer all questions.");
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push("/auth/login");

      const results = calculateResults();
      const { error } = await supabase
        .from("profiles")
        .update({
          learning_style_preferences: results,
          has_completed_assessment: true,
          assessment_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      setDone(true);
      setTimeout(() => router.push("/learn"), 2000);
    } catch (e) {
      console.error(e);
      alert("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );

  if (done) {
    const { primary_style, scores } = calculateResults();
    const Icon = ICONS[primary_style as keyof typeof ICONS];
    const labels = {
      visual: "Visual Learner",
      auditory: "Auditory Learner",
      reading: "Reading/Writing Learner",
      kinesthetic: "Kinesthetic Learner",
    };

    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-xl text-center p-6 shadow-xl">
          <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center bg-green-100 rounded-full">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
          <CardDescription className="text-lg mb-6">
            You’re a{" "}
            <span className="font-semibold text-indigo-600">
              {labels[primary_style]}
            </span>
          </CardDescription>
          <Icon className="h-10 w-10 mx-auto text-indigo-600 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(scores).map(([k, v]) => {
              const SIcon = ICONS[k as keyof typeof ICONS];
              return (
                <div
                  key={k}
                  className={`p-3 rounded-lg border-2 ${
                    k === primary_style
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SIcon className="h-4 w-4" />
                    <span className="capitalize font-medium">{k}</span>
                  </div>
                  <div className="text-xl font-bold">{v}</div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Redirecting to dashboard...
          </p>
        </Card>
      </div>
    );
  }

  const q = questions[index];
  const selected = answers[q.id];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle>Learning Style Assessment</CardTitle>
              <CardDescription>
                Personalize your learning experience
              </CardDescription>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Question {index + 1} / {questions.length}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4">{q.question}</h3>
          <RadioGroup
            value={selected}
            onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}
            className="space-y-3"
          >
            {q.options.map((o) => {
              const Icon = ICONS[o.style as keyof typeof ICONS];
              const active = selected === o.value;
              return (
                <div
                  key={o.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    active
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                  onClick={() => setAnswers({ ...answers, [q.id]: o.value })}
                >
                  <RadioGroupItem
                    value={o.value}
                    id={o.value}
                    className="mt-1"
                  />
                  <Label
                    htmlFor={o.value}
                    className="flex-1 cursor-pointer flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4 text-indigo-600" />
                    {o.label}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={handlePrev}
            >
              Previous
            </Button>
            <Button onClick={handleNext} disabled={!selected}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : index === questions.length - 1 ? (
                "Submit"
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
