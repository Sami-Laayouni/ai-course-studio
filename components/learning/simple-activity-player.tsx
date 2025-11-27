"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Play,
  CheckCircle,
  Brain,
  FileText,
  Video,
  Target,
  Zap,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Star,
  Clock,
} from "lucide-react";

const YOUTUBE_REGEX =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([^?&/]+)/;

const getYoutubeEmbedUrl = (url?: string) => {
  if (!url) return null;
  const match = url.match(YOUTUBE_REGEX);
  if (!match) return null;
  return `https://www.youtube.com/embed/${match[1]}`;
};

interface SimpleActivityPlayerProps {
  activity: any;
  onComplete?: (score?: number, timeSpent?: number) => void;
  isPreview?: boolean;
}

export default function SimpleActivityPlayer({
  activity,
  onComplete,
  isPreview = false,
}: SimpleActivityPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [userProgress, setUserProgress] = useState<Record<string, any>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizScores, setQuizScores] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});
  const [totalScore, setTotalScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [aiPerformance, setAiPerformance] = useState<
    "mastery" | "novel" | null
  >(null);

  const rawSteps = activity.content?.nodes || [];
  const connections = activity.content?.connections || [];

  // Order steps based on connections, starting from the start node
  const steps = React.useMemo(() => {
    if (!rawSteps.length) return [];
    const startNode =
      rawSteps.find((s: any) => s.type === "start") || rawSteps[0];
    const ordered: any[] = [];
    const visited = new Set<string>();
    let current = startNode;

    while (current && !visited.has(current.id)) {
      ordered.push(current);
      visited.add(current.id);
      const nextConn = connections.find((c: any) => c.from === current.id);
      if (!nextConn) break;
      current = rawSteps.find((s: any) => s.id === nextConn.to);
    }

    // Append any nodes not reached to avoid losing them in preview
    rawSteps.forEach((node: any) => {
      if (!visited.has(node.id)) ordered.push(node);
    });

    return ordered;
  }, [rawSteps, connections]);

  const getStepIcon = (step: any) => {
    switch (step.type) {
      case "start":
        return <Play className="h-5 w-5 text-green-600" />;
      case "end":
        return <CheckCircle className="h-5 w-5 text-gray-600" />;
      case "ai_chat":
        return <Brain className="h-5 w-5 text-purple-600" />;
      case "pdf":
        return <UploadCloud className="h-5 w-5 text-orange-600" />;
      case "video":
        return <Video className="h-5 w-5 text-red-600" />;
      case "quiz":
        return <Target className="h-5 w-5 text-blue-600" />;
      case "custom":
        return <Zap className="h-5 w-5 text-indigo-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const calculateQuizScore = (step: any, answers: any): number => {
    const questions = step.config?.questions || [];
    if (!questions.length) return 0;

    let correctCount = 0;
    const norm = (val: any) =>
      val === undefined || val === null
        ? ""
        : String(val).toLowerCase().trim();

    questions.forEach((question: any) => {
      const userAnswer = answers[question.id];
      const correctAnswer = question.correct_answer;
      if (question.type === "multiple_choice") {
        if (norm(userAnswer) === norm(correctAnswer)) {
          correctCount++;
        }
      } else if (question.type === "true_false") {
        if (norm(userAnswer) === norm(correctAnswer)) {
          correctCount++;
        }
      } else if (question.type === "fill_blank" || question.type === "short_answer") {
        // For text answers, do a simple lowercase comparison
        if (norm(userAnswer) === norm(correctAnswer)) {
          correctCount++;
        }
      }
    });

    return Math.round((correctCount / questions.length) * 100);
  };

  const handleQuizSubmit = (stepIndex: number) => {
    const step = steps[stepIndex];
    if (quizSubmitted[step.id]) {
      handleStepComplete(stepIndex);
      return;
    }
    const answers = quizAnswers[step.id] || {};
    const score = calculateQuizScore(step, answers);
    
    setQuizScores((prev) => ({ ...prev, [step.id]: score }));
    setQuizSubmitted((prev) => ({ ...prev, [step.id]: true }));
    setTotalScore((prev) => prev + score);
    
    handleStepComplete(stepIndex, { answers, score });
  };

  const handleStepComplete = (stepIndex: number, data?: any) => {
    const step = steps[stepIndex];

    // Capture video auto-questions for downstream AI chat
    if (step.type === "video" && step.config?.auto_questions?.length) {
      data = {
        ...(data || {}),
        autoQuestions: step.config.auto_questions,
        keyConcepts: step.config?.key_concepts || [],
      };
    }

    setCompletedSteps((prev) => new Set([...prev, stepIndex]));
    if (data) {
      setUserProgress((prev) => ({ ...prev, [stepIndex]: data }));
    }

    // Check for AI branching
    if (step.type === "ai_chat" && step.config?.enable_branching) {
      // Simulate AI performance analysis
      const performance = Math.random() > 0.5 ? "mastery" : "novel";
      setAiPerformance(performance);
    }

    // Move to next step
    const nextStep = getNextStep(stepIndex);
    if (nextStep !== null) {
      setCurrentStep(nextStep);
    } else {
      // Activity completed
      onComplete?.();
    }
  };

  const getNextStep = (currentIndex: number) => {
    const step = steps[currentIndex];

    // Handle quiz branching based on score
    if (step.type === "quiz") {
      const score =
        userProgress[currentIndex]?.score ??
        quizScores[step.id] ??
        undefined;

      const quizConnections = connections.filter(
        (conn) => conn.from === step.id
      );

      if (quizConnections.length) {
        const targetLabel =
          typeof score === "number"
            ? score >= 80
              ? "high_score"
              : score >= 60
              ? "medium_score"
              : "low_score"
            : null;

        const matched =
          quizConnections.find((conn) => conn.label === targetLabel) ||
          quizConnections[0];

        const nextStepIndex = steps.findIndex((s) => s.id === matched.to);
        if (nextStepIndex >= 0) return nextStepIndex;
      }
    }

    // Handle AI branching
    if (
      step.type === "ai_chat" &&
      step.config?.enable_branching &&
      aiPerformance
    ) {
      const pathConnections = connections.filter(
        (conn) =>
          conn.from === step.id &&
          (conn.label === "mastery" || conn.label === "novel")
      );

      const pathConnection = pathConnections.find(
        (conn) => conn.label === aiPerformance
      );

      if (pathConnection) {
        const nextStepIndex = steps.findIndex(
          (s) => s.id === pathConnection.to
        );
        return nextStepIndex;
      }
    }

    // Regular connection
    const connection = connections.find((conn) => conn.from === step.id);
    if (connection) {
      const nextStepIndex = steps.findIndex((s) => s.id === connection.to);
      return nextStepIndex;
    }

    return null;
  };

  const renderStep = (step: any, index: number) => {
    const isActive = index === currentStep;
    const isCompleted = completedSteps.has(index);
    const isAccessible = index === 0 || completedSteps.has(index - 1);

    if (!isActive && !isCompleted) return null;

    return (
      <Card
        key={step.id}
        className={`mb-4 transition-all ${
          isActive
            ? "ring-2 ring-blue-500 shadow-lg"
            : isCompleted
            ? "opacity-75 bg-gray-50"
            : ""
        }`}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3">
            <div className="flex-shrink-0">{getStepIcon(step)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span>{step.title}</span>
                {isCompleted && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>
          </CardTitle>
          {step.description && (
            <CardDescription className="mt-1">{step.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {step.type === "start" && (
            <div className="space-y-4 text-gray-700">
              <p>{step.config?.instructions || "Review the overview and start the activity when ready."}</p>
              <Button onClick={() => handleStepComplete(index)} className="w-full">
                Start Activity
              </Button>
            </div>
          )}
          {step.type === "pdf" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-orange-100 bg-orange-50/70 p-4">
                <div className="flex items-center gap-2 mb-2 text-orange-900">
                  <UploadCloud className="h-4 w-4" />
                  <span className="font-semibold text-sm">Reading Material</span>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {step.config?.content || "Review the provided material to continue."}
                </div>
                {step.config?.estimated_time && (
                  <p className="mt-3 text-xs text-orange-800 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ~{step.config.estimated_time} minutes
                  </p>
                )}
              </div>
              <Button onClick={() => handleStepComplete(index)} className="w-full">
                Mark as Read
              </Button>
            </div>
          )}

          {step.type === "ai_chat" && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">AI Tutor</h4>
                <p className="text-sm text-purple-700">
                  {step.config?.enable_branching
                    ? "This AI tutor will analyze your performance and guide you through personalized learning paths."
                    : "Ask me anything about the topic!"}
                </p>
              </div>

              {step.config?.enable_branching && aiPerformance && (
                <div className="p-4 bg-amber-50 rounded-lg">
                  <h4 className="font-medium text-amber-900 mb-2">
                    Performance Analysis
                  </h4>
                  <p className="text-sm text-amber-700">
                    Based on your responses, you're showing {aiPerformance}{" "}
                    level understanding.
                    {aiPerformance === "mastery"
                      ? " You'll be guided to advanced topics."
                      : " You'll receive additional support and practice."}
                  </p>
                </div>
              )}

              {/* Surface any generated questions from earlier steps for context */}
              {Object.values(userProgress).some(
                (entry: any) => entry?.autoQuestions?.length
              ) && (
                <div className="p-4 bg-white border rounded-lg shadow-sm">
                  <h5 className="font-semibold text-sm mb-2">
                    Suggested Questions to Discuss
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {Object.values(userProgress)
                      .flatMap((entry: any) => entry?.autoQuestions || [])
                      .slice(0, 5)
                      .map((q: any, idx: number) => (
                        <li key={q?.id || idx}>
                          {q?.question || q?.text || "Question"}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <Button
                onClick={() => handleStepComplete(index, { aiPerformance })}
                className="w-full"
              >
                Continue with AI Tutor
              </Button>
            </div>
          )}

          {step.type === "video" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-100 bg-red-50/70 p-4">
                <div className="flex items-center gap-2 mb-3 text-red-900">
                  <Video className="h-4 w-4" />
                  <span className="font-semibold text-sm">Video Lesson</span>
                </div>
                {getYoutubeEmbedUrl(step.config?.youtube_url) ? (
                  <div className="aspect-video rounded-lg overflow-hidden border border-red-200">
                    <iframe
                      src={getYoutubeEmbedUrl(step.config?.youtube_url)}
                      className="w-full h-full"
                      title={step.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <p className="text-sm text-red-800">
                    {step.config?.description || "Watch the associated video and continue."}
                  </p>
                )}
                {step.config?.duration && (
                  <p className="mt-3 text-xs text-red-800 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {step.config.duration} minutes
                  </p>
                )}
              </div>
              <Button onClick={() => handleStepComplete(index)} className="w-full">
                Mark Video as Watched
              </Button>
            </div>
          )}

          {step.type === "quiz" && (
            <QuizContent
              step={step}
              stepIndex={index}
              quizAnswers={quizAnswers[step.id] || {}}
              setQuizAnswers={(answers) =>
                setQuizAnswers((prev) => ({ ...prev, [step.id]: answers }))
              }
              quizScore={quizScores[step.id]}
              isSubmitted={quizSubmitted[step.id] || false}
              onSubmit={() => handleQuizSubmit(index)}
            />
          )}

          {step.type === "custom" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900">
                  <Zap className="h-4 w-4" />
                  <span className="font-semibold text-sm">Custom Activity</span>
                </div>
                <p className="text-sm text-indigo-800 whitespace-pre-wrap leading-relaxed">
                  {step.config?.instructions ||
                    step.config?.content ||
                    "Complete the custom scenario or follow the teacher's instructions."}
                </p>
                {step.config?.points && (
                  <Badge variant="outline" className="text-indigo-700 border-indigo-200 w-fit">
                    Worth {step.config.points} pts
                  </Badge>
                )}
              </div>
              <Button onClick={() => handleStepComplete(index)} className="w-full">
                Complete Activity
              </Button>
            </div>
          )}

          {step.type === "end" && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <h3 className="text-xl font-semibold text-green-700">
                Activity Complete!
              </h3>
              <p className="text-gray-600">
                You've successfully completed this learning activity.
              </p>
              {totalScore > 0 && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-center gap-4">
                    <Badge variant="outline" className="gap-1 text-lg px-4 py-2">
                      <Star className="h-4 w-4" />
                      Total Score: {totalScore}%
                    </Badge>
              </div>
              {step.config?.auto_questions?.length ? (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                  <h5 className="text-sm font-semibold text-red-900 mb-1">
                    Auto-Generated Questions
                  </h5>
                  <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                    {step.config.auto_questions.slice(0, 5).map((q: any, i: number) => (
                      <li key={q?.id || i}>{q?.question || q?.text || "Question"}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
              <Button onClick={handleComplete} className="w-full">
                Finish
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleComplete = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onComplete?.(totalScore, timeSpent);
  };

  const progress = steps.length > 0 ? (completedSteps.size / steps.length) * 100 : 0;
  const timeSpent = Math.floor((Date.now() - startTime) / 60);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {isPreview && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-900">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Preview Mode</span>
          </div>
          <p className="text-sm text-amber-700 mt-1">
            You're previewing the activity flow. Scores and progress won't be saved.
          </p>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{activity.title}</h1>
        {activity.description && (
          <p className="text-gray-600 mb-4">{activity.description}</p>
        )}

        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-gray-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full h-2" />
          
          <div className="flex gap-4 text-sm">
            {totalScore > 0 && (
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3" />
                {totalScore} points
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {timeSpent}m
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => renderStep(step, index))}
      </div>

      {aiPerformance && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-900 mb-2">
            AI Learning Path
          </h3>
          <p className="text-sm text-purple-700">
            You're following the <strong>{aiPerformance}</strong> learning path,
            which has been customized based on your performance.
          </p>
        </div>
      )}
    </div>
  );
}

// Quiz Content Component
function QuizContent({
  step,
  stepIndex,
  quizAnswers,
  setQuizAnswers,
  quizScore,
  isSubmitted,
  onSubmit,
}: {
  step: any;
  stepIndex: number;
  quizAnswers: any;
  setQuizAnswers: (answers: any) => void;
  quizScore?: number;
  isSubmitted: boolean;
  onSubmit: () => void;
}) {
  const questions = step.config?.questions || [];
  const questionType = step.config?.question_type || "multiple_choice";

  const handleAnswerChange = (questionId: string, value: string) => {
    setQuizAnswers({ ...quizAnswers, [questionId]: value });
  };

  const allQuestionsAnswered = questions.every(
    (q: any) => quizAnswers[q.id] !== undefined && quizAnswers[q.id] !== ""
  );

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold text-blue-900">Quiz Questions</h4>
        </div>
        <p className="text-sm text-blue-700">
          {questions.length} question{questions.length !== 1 ? "s" : ""} • {step.config?.time_limit ? `${step.config.time_limit} min time limit` : "No time limit"}
        </p>
      </div>

      <div className="space-y-6">
        {questions.map((question: any, qIndex: number) => {
      const userAnswer = quizAnswers[question.id];
      const norm = (val: any) =>
        val === undefined || val === null
          ? ""
          : val.toString().toLowerCase().trim();
      const isCorrect =
        isSubmitted &&
        userAnswer &&
        norm(userAnswer) === norm(question.correct_answer);
      const isIncorrect = isSubmitted && userAnswer && !isCorrect;

          return (
            <Card
              key={question.id}
              className={`${
                isSubmitted
                  ? isCorrect
                    ? "border-green-200 bg-green-50/50"
                    : isIncorrect
                    ? "border-red-200 bg-red-50/50"
                    : ""
                  : "border-gray-200"
              }`}
            >
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
                    {qIndex + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-3">
                      {question.question}
                    </p>

                    {question.type === "multiple_choice" && (
                      <RadioGroup
                        value={userAnswer || ""}
                        onValueChange={(value) =>
                          handleAnswerChange(question.id, value)
                        }
                        disabled={isSubmitted}
                        className="space-y-2"
                      >
                        {question.options?.map(
                          (option: string, optIndex: number) => {
                            const isSelected = userAnswer === option;
                            const isCorrectOption =
                              isSubmitted &&
                              norm(option) === norm(question.correct_answer);

                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                                  isSubmitted
                                    ? isCorrectOption
                                      ? "bg-green-50 border-green-300"
                                      : isSelected && !isCorrectOption
                                      ? "bg-red-50 border-red-300"
                                      : "bg-gray-50 border-gray-200"
                                    : isSelected
                                    ? "bg-blue-50 border-blue-300"
                                    : "bg-white border-gray-200 hover:bg-gray-50"
                                }`}
                              >
                                <RadioGroupItem
                                  value={option}
                                  id={`${question.id}-${optIndex}`}
                                />
                                <Label
                                  htmlFor={`${question.id}-${optIndex}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  {option}
                                </Label>
                                {isSubmitted && isCorrectOption && (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                )}
                                {isSubmitted &&
                                  isSelected &&
                                  !isCorrectOption && (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                  )}
                              </div>
                            );
                          }
                        )}
                      </RadioGroup>
                    )}

                    {question.type === "true_false" && (
                      <RadioGroup
                        value={userAnswer || ""}
                        onValueChange={(value) =>
                          handleAnswerChange(question.id, value)
                        }
                        disabled={isSubmitted}
                        className="space-y-2"
                      >
                        {["True", "False"].map((option) => {
                          const isSelected = userAnswer === option;
                          const isCorrectOption =
                            isSubmitted &&
                            norm(option) === norm(question.correct_answer);

                          return (
                            <div
                              key={option}
                              className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                                isSubmitted
                                  ? isCorrectOption
                                    ? "bg-green-50 border-green-300"
                                    : isSelected && !isCorrectOption
                                    ? "bg-red-50 border-red-300"
                                    : "bg-gray-50 border-gray-200"
                                  : isSelected
                                  ? "bg-blue-50 border-blue-300"
                                  : "bg-white border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <RadioGroupItem
                                value={option}
                                id={`${question.id}-${option}`}
                              />
                              <Label
                                htmlFor={`${question.id}-${option}`}
                                className="flex-1 cursor-pointer"
                              >
                                {option}
                              </Label>
                              {isSubmitted && isCorrectOption && (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              )}
                              {isSubmitted &&
                                isSelected &&
                                !isCorrectOption && (
                                  <XCircle className="h-5 w-5 text-red-600" />
                                )}
                            </div>
                          );
                        })}
                      </RadioGroup>
                    )}

                    {(question.type === "fill_blank" ||
                      question.type === "short_answer") && (
                      <Textarea
                        value={userAnswer || ""}
                        onChange={(e) =>
                          handleAnswerChange(question.id, e.target.value)
                        }
                        placeholder="Enter your answer..."
                        disabled={isSubmitted}
                        className={`${
                          isSubmitted
                            ? isCorrect
                              ? "border-green-300 bg-green-50"
                              : isIncorrect
                              ? "border-red-300 bg-red-50"
                              : ""
                            : ""
                        }`}
                      />
                    )}

                    {isSubmitted && question.explanation && (
                      <div
                        className={`p-3 rounded-lg mt-2 ${
                          isCorrect
                            ? "bg-green-100 border border-green-300"
                            : "bg-blue-100 border border-blue-300"
                        }`}
                      >
                        <p className="text-sm font-medium mb-1">
                          {isCorrect ? (
                            <span className="text-green-800">
                              ✓ Correct! Well done.
                            </span>
                          ) : (
                            <span className="text-red-800">✗ Incorrect</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-700">
                          {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isSubmitted && quizScore !== undefined && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Quiz Score</p>
              <p className="text-sm text-gray-600">
                {Math.round(quizScore)}% correct
              </p>
            </div>
            <Badge
              variant={quizScore >= 80 ? "default" : quizScore >= 60 ? "secondary" : "destructive"}
              className="text-lg px-4 py-2"
            >
              {quizScore}%
            </Badge>
          </div>
        </div>
      )}

      {!isSubmitted && (
        <Button
          onClick={onSubmit}
          disabled={!allQuestionsAnswered}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          Submit Answers
        </Button>
      )}
    </div>
  );
}
