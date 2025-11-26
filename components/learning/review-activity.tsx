"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardCheck,
  BookOpen,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AdvancedTextarea } from "@/components/ui/advanced-textarea";
import katex from "katex";
import "katex/dist/katex.min.css";

// Helper function to render math in text
function renderMathInText(text: string): string {
  if (!text) return "";

  // Check if text has math notation
  const hasMath =
    /[\^_+\-*/=<>≤≥≠≈∑∫√π∞αβγθλσΔρ]/.test(text) ||
    /\b(sqrt|frac|sum|int|pi|inf|alpha|beta|gamma|theta|lambda|sigma|Delta|rho)\b/i.test(
      text
    ) ||
    /[A-Z][a-z]*\d+/.test(text) ||
    /\d+\/\d+/.test(text);

  if (!hasMath) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Convert simple notation to LaTeX
  let result = text;

  // Chemical formulas: H2O -> H_{2}O
  result = result.replace(/([A-Z][a-z]*)(\d+)/g, (match, element, num) => {
    return `${element}_{${num}}`;
  });

  // sqrt(x) -> \sqrt{x}
  result = result.replace(/sqrt\(([^)]+)\)/g, (match, content) => {
    return `\\sqrt{${content}}`;
  });

  // Powers: x^2 -> x^{2}
  result = result.replace(/([a-zA-Z0-9\)]+)\^(\d+)/g, (match, base, exp) => {
    return `${base}^{${exp}}`;
  });

  result = result.replace(
    /([a-zA-Z0-9\)]+)\^([a-zA-Z]+)/g,
    (match, base, exp) => {
      return `${base}^{${exp}}`;
    }
  );

  // Subscripts: x_2 -> x_{2}
  result = result.replace(/([a-zA-Z]+)_(\d+)/g, (match, base, sub) => {
    return `${base}_{${sub}}`;
  });

  result = result.replace(/([a-zA-Z]+)_([a-zA-Z]+)/g, (match, base, sub) => {
    return `${base}_{${sub}}`;
  });

  // Fractions: a/b -> \frac{a}{b}
  result = result.replace(
    /\b([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)\b/g,
    (match, num, den) => {
      return `\\frac{${num}}{${den}}`;
    }
  );

  // Constants
  result = result.replace(/\bpi\b/g, "\\pi");
  result = result.replace(/\binf\b/g, "\\infty");
  result = result.replace(/\bsum\b/g, "\\sum");
  result = result.replace(/\bint\b/g, "\\int");
  result = result.replace(/\balpha\b/g, "\\alpha");
  result = result.replace(/\bbeta\b/g, "\\beta");
  result = result.replace(/\bgamma\b/g, "\\gamma");
  result = result.replace(/\btheta\b/g, "\\theta");
  result = result.replace(/\blambda\b/g, "\\lambda");
  result = result.replace(/\bsigma\b/g, "\\sigma");
  result = result.replace(/\bDelta\b/g, "\\Delta");
  result = result.replace(/\brho\b/g, "\\rho");

  try {
    const rendered = katex.renderToString(result, {
      displayMode: false,
      throwOnError: false,
    });
    return rendered;
  } catch (error) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

export interface ReviewMisconceptionAnalysis {
  concept: string;
  misconception: string;
  evidence?: string;
  severity?: "low" | "medium" | "high";
  correct_understanding?: string;
}

export interface ReviewAnalysisResult {
  concepts_understood?: string[];
  strengths?: string[];
  misconceptions?: ReviewMisconceptionAnalysis[];
  recommended_review?: string[];
  overall_assessment?: string;
}

interface ReviewResponsesPayload {
  review_type: "flashcards" | "teacher_review";
  flashcard_terms?: {
    term: string;
    student_definition: string;
  }[];
  teacher_responses?: {
    prompt: string;
    response: string;
  }[];
}

export interface ReviewCompletionPayload {
  responses: ReviewResponsesPayload;
  analysis?: ReviewAnalysisResult | null;
}

interface ReviewActivityProps {
  nodeConfig: {
    review_type: "flashcards" | "teacher_review";
    context?: string;
    num_terms?: number;
    prompts?: string;
    points?: number;
    instructions?: string;
    flashcard_terms?: Array<{ id?: string; term: string } | string>;
  };
  activityId: string;
  nodeId: string;
  contextSources?: any[];
  onComplete: (payload: ReviewCompletionPayload) => void;
}

interface FlashcardTerm {
  id: string;
  term: string;
  studentDefinition: string;
}

export default function ReviewActivity({
  nodeConfig,
  activityId,
  nodeId,
  contextSources = [],
  onComplete,
}: ReviewActivityProps) {
  const initialFlashcardTerms: FlashcardTerm[] = Array.isArray(
    nodeConfig.flashcard_terms
  )
    ? (nodeConfig.flashcard_terms
        .map((item: any, index: number) => {
          if (typeof item === "string") {
            return {
              id: `term_${index}`,
              term: item,
              studentDefinition: "",
            };
          }
          if (item && typeof item === "object") {
            return {
              id: item.id || `term_${index}`,
              term: item.term || `Term ${index + 1}`,
              studentDefinition: "",
            };
          }
          return null;
        })
        .filter(Boolean) as FlashcardTerm[])
    : [];

  const [reviewType, setReviewType] = useState<"flashcards" | "teacher_review">(
    nodeConfig.review_type || "flashcards"
  );
  const [flashcardTerms, setFlashcardTerms] = useState<FlashcardTerm[]>(
    initialFlashcardTerms
  );
  const [currentTermIndex, setCurrentTermIndex] = useState(0);
  const [teacherPrompts, setTeacherPrompts] = useState<string[]>([]);
  const [teacherResponses, setTeacherResponses] = useState<
    Record<number, string>
  >({});
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showNotebookReminder, setShowNotebookReminder] = useState(true);
  const hasInitializedRef = useRef(false);
  const supabase = createClient();

  // Use pre-generated flashcard terms if available, otherwise generate them
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitializedRef.current) {
      return;
    }

    if (reviewType === "flashcards") {
      // If we have pre-generated terms from the activity, use them
      if (initialFlashcardTerms.length > 0) {
        console.log(
          `✅ Using ${initialFlashcardTerms.length} pre-generated flashcard terms`
        );
        setFlashcardTerms(initialFlashcardTerms);
        hasInitializedRef.current = true;
      } else if (flashcardTerms.length === 0) {
        // Only generate if no pre-generated terms exist
        console.log(
          "⚠️ No pre-generated terms found, generating flashcards on-the-fly (this should be avoided)"
        );
        hasInitializedRef.current = true;
        generateFlashcardTerms();
      }
    } else if (reviewType === "teacher_review" && teacherPrompts.length === 0) {
      hasInitializedRef.current = true;
      loadTeacherPrompts();
    }
  }, [reviewType]);

  const generateFlashcardTerms = async () => {
    // Prevent multiple simultaneous calls
    if (isGenerating) {
      console.log("⏭️ Already generating, skipping duplicate call");
      return;
    }

    setIsGenerating(true);
    try {
      // Build context from uploaded sources
      let contextText = nodeConfig.context || "";

      if (contextSources && contextSources.length > 0) {
        const contextParts = contextSources.map((source) => {
          if (source.type === "document" || source.type === "pdf") {
            return `Document: ${source.title}\n${
              source.summary || ""
            }\nKey Points: ${(source.key_points || []).join(", ")}`;
          } else if (source.type === "youtube" || source.type === "video") {
            return `Video: ${source.title}\n${
              source.summary || ""
            }\nKey Concepts: ${(source.key_concepts || []).join(", ")}`;
          }
          return "";
        });
        contextText = contextParts.join("\n\n") + "\n\n" + contextText;
      }

      // Get user ID for rate limiting
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const response = await fetch("/api/ai/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: contextText,
          num_terms: nodeConfig.num_terms || 10,
          node_id: nodeId, // Include node_id for caching
          user_id: user?.id, // Include user_id for rate limiting
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const terms = data.terms.map((term: string, index: number) => ({
          id: `term_${index}`,
          term,
          studentDefinition: "",
        }));
        setFlashcardTerms(terms);
      } else {
        // Fallback: create sample terms
        const sampleTerms = Array.from(
          { length: nodeConfig.num_terms || 10 },
          (_, i) => ({
            id: `term_${i}`,
            term: `Term ${i + 1}`,
            studentDefinition: "",
          })
        );
        setFlashcardTerms(sampleTerms);
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
      // Fallback
      const sampleTerms = Array.from(
        { length: nodeConfig.num_terms || 10 },
        (_, i) => ({
          id: `term_${i}`,
          term: `Term ${i + 1}`,
          studentDefinition: "",
        })
      );
      setFlashcardTerms(sampleTerms);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadTeacherPrompts = () => {
    const prompts = (nodeConfig.prompts || "")
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    setTeacherPrompts(prompts);
  };

  const updateFlashcardDefinition = (termId: string, definition: string) => {
    setFlashcardTerms((prev) =>
      prev.map((term) =>
        term.id === termId ? { ...term, studentDefinition: definition } : term
      )
    );
  };

  const updateTeacherResponse = (index: number, response: string) => {
    setTeacherResponses((prev) => ({
      ...prev,
      [index]: response,
    }));
  };

  const handleComplete = async () => {
    // Prevent multiple simultaneous completion calls
    if (isLoading || completed) {
      console.log("⏭️ Already processing completion, skipping duplicate call");
      return;
    }

    setIsLoading(true);
    let analysisResult: ReviewAnalysisResult | null = null;

    try {
      const responses: ReviewResponsesPayload = {
        review_type: reviewType,
        flashcard_terms:
          reviewType === "flashcards"
            ? flashcardTerms.map((t) => ({
                term: t.term,
                student_definition: t.studentDefinition,
              }))
            : undefined,
        teacher_responses:
          reviewType === "teacher_review"
            ? teacherPrompts.map((prompt, index) => ({
                prompt,
                response: teacherResponses[index] || "",
              }))
            : undefined,
      };

      // Save responses to database for analytics
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("review_responses").insert({
          activity_id: activityId,
          node_id: nodeId,
          student_id: user.id,
          responses: responses,
          review_type: reviewType,
          created_at: new Date().toISOString(),
        });

        // Trigger AI analysis for misconceptions - wait for it to complete
        try {
          const analysisResponse = await fetch(
            "/api/ai/analyze-review-responses",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                activity_id: activityId,
                node_id: nodeId,
                student_id: user.id,
                responses,
                context: nodeConfig.context,
                context_sources: contextSources,
              }),
            }
          );

          if (!analysisResponse.ok) {
            let errorData: any = null;
            try {
              errorData = await analysisResponse.json();
            } catch (parseError) {
              // Ignore parse errors for non-JSON responses
            }

            if (analysisResponse.status === 429) {
              console.warn(
                "⚠️ Analysis rate limited, but responses saved. Analysis will complete when rate limit resets."
              );
            } else {
              console.error("Error in misconception analysis:", errorData);
            }
          } else {
            const analysisData = await analysisResponse
              .json()
              .catch(() => null);
            analysisResult =
              analysisData?.analysis ||
              analysisData?.data ||
              analysisData ||
              null;
            console.log("✅ Misconception analysis completed", analysisResult);
          }
        } catch (error) {
          console.error("Error triggering misconception analysis:", error);
          // Don't block completion if analysis fails
        }
      }

      // Set completed first to prevent re-renders
      setCompleted(true);

      // Call onComplete after a brief delay to ensure state is set
      setTimeout(() => {
        onComplete({
          responses,
          analysis: analysisResult,
        });
      }, 100);
    } catch (error) {
      console.error("Error completing review:", error);
      setIsLoading(false);
    }
  };

  if (isGenerating) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">
            Generating flashcard terms based on your context...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (completed) {
    // Once completed, don't re-render - just show completion message
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Review Complete!</h3>
          <p className="text-gray-600">
            Your responses have been saved. The AI will analyze your work to
            identify any misconceptions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (reviewType === "flashcards") {
    const currentTerm = flashcardTerms[currentTermIndex];
    const progress =
      flashcardTerms.length > 0
        ? ((currentTermIndex + 1) / flashcardTerms.length) * 100
        : 0;
    const allDefined = flashcardTerms.every(
      (term) => term.studentDefinition.trim().length > 0
    );

    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Flashcard Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                Term {currentTermIndex + 1} of {flashcardTerms.length}
              </Badge>
              <Progress value={progress} className="w-48" />
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
              <div className="text-center mb-6">
                <h3
                  className="text-2xl font-bold text-gray-900 mb-2"
                  dangerouslySetInnerHTML={{
                    __html: renderMathInText(currentTerm?.term || ""),
                  }}
                />
                <p className="text-sm text-gray-500">
                  {nodeConfig.instructions ||
                    "Write on your notebook and then here"}
                </p>
              </div>

              <AdvancedTextarea
                value={currentTerm?.studentDefinition || ""}
                onChange={(val) =>
                  updateFlashcardDefinition(currentTerm.id, val)
                }
                placeholder="Enter the definition you wrote in your notebook..."
                rows={6}
                previewLabel="Preview"
              />
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentTermIndex(Math.max(0, currentTermIndex - 1))
                }
                disabled={currentTermIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              {currentTermIndex < flashcardTerms.length - 1 ? (
                <Button
                  onClick={() =>
                    setCurrentTermIndex(
                      Math.min(flashcardTerms.length - 1, currentTermIndex + 1)
                    )
                  }
                  disabled={!currentTerm?.studentDefinition.trim()}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!allDefined || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Complete Review
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Teacher Review mode
  const currentPrompt = teacherPrompts[currentPromptIndex];
  const progress =
    teacherPrompts.length > 0
      ? ((currentPromptIndex + 1) / teacherPrompts.length) * 100
      : 0;
  const allResponded = teacherPrompts.every(
    (_, index) => (teacherResponses[index] || "").trim().length > 0
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Teacher Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              Prompt {currentPromptIndex + 1} of {teacherPrompts.length}
            </Badge>
            <Progress value={progress} className="w-48" />
          </div>

          <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
            <div className="mb-4">
              <h3
                className="text-lg font-semibold text-gray-900 mb-2"
                dangerouslySetInnerHTML={{
                  __html: renderMathInText(currentPrompt || ""),
                }}
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {nodeConfig.instructions ||
                "Write on your notebook and then here"}
            </p>

            <AdvancedTextarea
              value={teacherResponses[currentPromptIndex] || ""}
              onChange={(val) => updateTeacherResponse(currentPromptIndex, val)}
              placeholder="Enter your response here..."
              rows={6}
              previewLabel="Preview"
            />
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() =>
                setCurrentPromptIndex(Math.max(0, currentPromptIndex - 1))
              }
              disabled={currentPromptIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            {currentPromptIndex < teacherPrompts.length - 1 ? (
              <Button
                onClick={() =>
                  setCurrentPromptIndex(
                    Math.min(teacherPrompts.length - 1, currentPromptIndex + 1)
                  )
                }
                disabled={!teacherResponses[currentPromptIndex]?.trim()}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!allResponded || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Complete Review
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
