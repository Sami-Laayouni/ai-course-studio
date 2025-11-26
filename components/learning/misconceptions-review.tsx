"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  Lightbulb,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  ReviewMisconceptionAnalysis,
  ReviewAnalysisResult,
} from "./review-activity";

type ReviewSummary = Pick<
  ReviewAnalysisResult,
  "overall_assessment" | "recommended_review" | "strengths" | "concepts_understood"
>;

interface MisconceptionsReviewProps {
  activityId: string;
  onComplete: () => void;
  initialMisconceptions?: ReviewMisconceptionAnalysis[];
  analysisSummary?: ReviewSummary;
}

interface Misconception {
  id?: string;
  concept: string;
  misconception_description: string;
  correct_understanding: string;
  severity: "low" | "medium" | "high";
  evidence: any;
}

export default function MisconceptionsReview({
  activityId,
  onComplete,
  initialMisconceptions,
  analysisSummary,
}: MisconceptionsReviewProps) {
  const toSentenceList = (items: string[]) => {
    if (!items || items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    const head = items.slice(0, -1).join(", ");
    const tail = items[items.length - 1];
    return `${head}, and ${tail}`;
  };

  const normalizeSeverity = (
    value?: string | null
  ): Misconception["severity"] => {
    if (!value) return "medium";
    const normalized = value.toLowerCase();
    if (normalized === "high") return "high";
    if (normalized === "low") return "low";
    return "medium";
  };

  const transformAnalysisMisconceptions = (
    items: ReviewMisconceptionAnalysis[]
  ): Misconception[] =>
    items.map((item, index) => ({
      id: item.evidence?.id || `analysis-${index}`,
      concept: item.concept || "Concept needs review",
      misconception_description:
        item.misconception ||
        item.evidence?.response ||
        "We spotted a possible misunderstanding here.",
      correct_understanding:
        item.correct_understanding ||
        "Review this concept carefully and compare it with the correct explanation.",
      severity: normalizeSeverity(item.severity),
      evidence: item.evidence || {},
    }));

  const [misconceptions, setMisconceptions] = useState<Misconception[]>(
    initialMisconceptions && initialMisconceptions.length > 0
      ? transformAnalysisMisconceptions(initialMisconceptions)
      : []
  );
  const [isLoading, setIsLoading] = useState(
    !(initialMisconceptions && initialMisconceptions.length > 0)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [summary, setSummary] = useState<ReviewSummary | undefined>(
    analysisSummary
  );
  const hasLoadedRef = useRef(false);
  const supabase = createClient();

  const loadMisconceptions = async (skipLoading = false) => {
    // Prevent multiple simultaneous loads
    if (hasLoadedRef.current && !skipLoading) {
      return;
    }

    try {
      if (!skipLoading) {
        setIsLoading(true);
        hasLoadedRef.current = true;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!skipLoading) {
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("student_misconceptions")
        .select("*")
        .eq("student_id", user.id)
        .eq("activity_id", activityId)
        .is("resolved_at", null)
        .order("severity", { ascending: false });

      if (error) throw error;

      const transformed = (data || []).map((m) => ({
        id: m.id,
        concept: m.concept,
        misconception_description: m.misconception_description,
        correct_understanding:
          m.evidence?.correct_understanding || "Please review this concept",
        severity: normalizeSeverity(m.severity),
        evidence: m.evidence,
      }));

      if (transformed.length > 0) {
        setMisconceptions(transformed);
      } else if (!initialMisconceptions || initialMisconceptions.length === 0) {
        setMisconceptions([]);
      }
    } catch (error) {
      console.error("Error loading misconceptions:", error);
    } finally {
      if (!skipLoading) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    // Reset loading state when activityId changes
    if (hasLoadedRef.current) {
      hasLoadedRef.current = false;
    }

    let skipInitialLoading = false;

    if (initialMisconceptions && initialMisconceptions.length > 0) {
      setMisconceptions(transformAnalysisMisconceptions(initialMisconceptions));
      skipInitialLoading = true;
    }

    if (analysisSummary) {
      setSummary(analysisSummary);
    }

    // Only load if not already loaded
    if (!hasLoadedRef.current) {
      loadMisconceptions(skipInitialLoading);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  const markAllMisconceptionsResolved = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("student_misconceptions")
        .update({ resolved_at: new Date().toISOString() })
        .eq("student_id", user.id)
        .eq("activity_id", activityId)
        .is("resolved_at", null);
    } catch (error) {
      console.error("Error marking misconceptions as resolved:", error);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your review...</p>
        </CardContent>
      </Card>
    );
  }

  const summaryStrengths =
    summary?.strengths && summary.strengths.length > 0
      ? summary.strengths
      : summary?.concepts_understood || [];

  const primaryMisconception = misconceptions[0];
  const studentSummaryMessage =
    misconceptions.length > 0
      ? (() => {
          const strengthsFragment = summaryStrengths.length
            ? `You did a great job with ${toSentenceList(
                summaryStrengths.map((item) => item.toLowerCase())
              )}`
            : "You made thoughtful progress";
          const conceptFragment = primaryMisconception?.concept
            ? primaryMisconception.concept.toLowerCase()
            : "this concept";
          const correction =
            primaryMisconception?.correct_understanding ||
            "Let's revisit the correct explanation together.";
          return `${strengthsFragment}, however some things you didn't quite nail down were around ${conceptFragment}. ${correction}`;
        })()
      : "";

  if (misconceptions.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-semibold mb-2">Great Job!</h3>
          <p className="text-gray-600 mb-6">
            No major misconceptions were identified. You're doing well!
          </p>

          {summary && (summary.overall_assessment || summaryStrengths.length > 0 || summary.recommended_review?.length) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left space-y-3 mb-6">
              {summary.overall_assessment && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    Overall Assessment
                  </p>
                  <p className="text-sm text-slate-700">{summary.overall_assessment}</p>
                </div>
              )}
              {summaryStrengths.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-emerald-900 mb-1">
                    Strengths
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {summaryStrengths.slice(0, 6).map((item, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs border-emerald-200 text-emerald-800">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {summary.recommended_review && summary.recommended_review.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-orange-900 mb-1">
                    Recommended Focus
                  </p>
                  <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                    {summary.recommended_review.slice(0, 5).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={async () => {
              await markAllMisconceptionsResolved();
              onComplete();
            }}
            size="lg"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentMisconception = misconceptions[currentIndex];
  const severityColors = {
    high: "bg-red-100 border-red-500 text-red-900",
    medium: "bg-orange-100 border-orange-500 text-orange-900",
    low: "bg-yellow-100 border-yellow-500 text-yellow-900",
  };

  const handleNext = async () => {
    if (currentIndex < misconceptions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await markAllMisconceptionsResolved();
      onComplete();
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          Review Your Understanding
        </CardTitle>
        <p className="text-sm text-gray-600">
          Let's review some concepts you may have misunderstood
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {summary && (summary.overall_assessment || summaryStrengths.length > 0 || summary.recommended_review?.length) && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
            {summary.overall_assessment && (
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  Overall Assessment
                </p>
                <p className="text-sm text-slate-700">
                  {summary.overall_assessment}
                </p>
              </div>
            )}
            {summaryStrengths.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-emerald-900 mb-1">
                  Strengths
                </p>
                <div className="flex flex-wrap gap-2">
                  {summaryStrengths.slice(0, 6).map((item, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs border-emerald-200 text-emerald-800"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {summary.recommended_review && summary.recommended_review.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-orange-900 mb-1">
                  Recommended Focus
                </p>
                <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                  {summary.recommended_review.slice(0, 5).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline">
            {currentIndex + 1} of {misconceptions.length}
          </Badge>
          <Badge
            className={severityColors[currentMisconception.severity]}
          >
            {currentMisconception.severity.toUpperCase()} Priority
          </Badge>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-6 space-y-4">
          <div className="space-y-4">
            {/* Positive feedback first */}
            {summaryStrengths.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-base font-medium text-green-900">
                  ✅ You did this really well: {summaryStrengths.slice(0, 2).join(", ")}
                </p>
              </div>
            )}
            
            {/* Simple explanation of what they got wrong */}
            <div className="bg-white rounded-lg p-5 border-2 border-blue-200">
              <p className="text-base text-gray-900 mb-3">
                <span className="font-semibold">However, some things you didn't seem to get is that</span>{" "}
                <span className="text-blue-700 font-medium">
                  {currentMisconception.correct_understanding || 
                   `you may have misunderstood ${currentMisconception.concept}. ${currentMisconception.misconception_description || "Let's review this concept together."}`}
                </span>
              </p>
              
              {currentMisconception.misconception_description && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">What you said:</span> "{currentMisconception.misconception_description}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Recommendation:
              </p>
              <p className="text-sm text-blue-800">
                Take some time to review this concept. You might want to revisit
                the related materials or ask your teacher for clarification.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleNext} size="lg">
            {currentIndex < misconceptions.length - 1 ? (
              <>
                Next Concept
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Complete Review
                <CheckCircle className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

