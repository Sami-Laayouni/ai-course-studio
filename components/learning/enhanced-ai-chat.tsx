"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  Brain,
  Lightbulb,
  Target,
  CheckCircle,
  Clock,
  Star,
  MessageSquare,
  BookOpen,
  Users,
  ArrowLeft,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Unlock,
  Trophy,
  AlertCircle,
  Settings,
  FileText,
  Play,
} from "lucide-react";
import ContextSelector from "./context-selector";

interface EnhancedAIChatProps {
  activityId: string;
  activity: any;
  onComplete: (points: number) => void;
}

interface ChatMessage {
  id: string;
  type: "student" | "ai" | "system" | "quiz";
  content: string;
  timestamp: Date;
  learning_objectives?: string[];
  concepts_identified?: string[];
  confidence_score?: number;
  quiz_data?: {
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
  };
}

interface LearningObjective {
  objective: string;
  mastery_level: number;
  attempts: number;
  last_assessed: Date;
  is_mastered: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: number;
  learning_objective: string;
}

interface ContextSource {
  id: string;
  type: "pdf" | "youtube";
  title: string;
  url?: string;
  filename?: string;
  summary?: string;
  key_points?: string[];
  key_concepts?: string[];
  thumbnail?: string;
}

export default function EnhancedAIChat({
  activityId,
  activity,
  onComplete,
}: EnhancedAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [learningObjectives, setLearningObjectives] = useState<
    LearningObjective[]
  >([]);
  const [conceptsMastered, setConceptsMastered] = useState<string[]>([]);
  const [conceptsStruggling, setConceptsStruggling] = useState<string[]>([]);
  const [sessionProgress, setSessionProgress] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(
    null
  );
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [totalQuizQuestions, setTotalQuizQuestions] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<
    "instruction" | "practice" | "quiz" | "mastery"
  >("instruction");
  const [uniqueInstructions, setUniqueInstructions] = useState<string>("");
  const [canProceed, setCanProceed] = useState(false);
  const [selectedContextSources, setSelectedContextSources] = useState<ContextSource[]>([]);
  const [showContextSelector, setShowContextSelector] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeSession();
  }, [activityId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeSession = async () => {
    // Generate unique instructions for this activity
    const instructions = await generateUniqueInstructions();
    setUniqueInstructions(instructions);

    // Initialize learning objectives
    const objectives = (activity?.lessons?.learning_objectives || []).map(
      (obj: string) => ({
        objective: obj,
        mastery_level: 0,
        attempts: 0,
        last_assessed: new Date(),
        is_mastered: false,
      })
    );
    setLearningObjectives(objectives);
    setTotalQuizQuestions(objectives.length * 2); // 2 questions per objective

    // Send initial instruction message
    const instructionMessage: ChatMessage = {
      id: "instruction",
      type: "ai",
      content: instructions,
      timestamp: new Date(),
      learning_objectives: objectives.map((o) => o.objective),
      confidence_score: 1.0,
    };
    setMessages([instructionMessage]);
  };

  const generateUniqueInstructions = async () => {
    try {
      const response = await fetch("/api/ai/generate-instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activityId,
          learning_objectives: activity?.lessons?.learning_objectives || [],
          subject: activity?.courses?.subject,
          grade_level: activity?.courses?.grade_level,
        }),
      });

      const data = await response.json();
      return (
        data.instructions ||
        `Welcome to your personalized learning session for "${activity?.title}"! I'm here to guide you through the concepts step by step. Let's start by exploring what you already know about this topic.`
      );
    } catch (error) {
      console.error("Error generating instructions:", error);
      return `Welcome to your personalized learning session for "${activity?.title}"! I'm here to guide you through the concepts step by step. Let's start by exploring what you already know about this topic.`;
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "student",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputMessage,
          activity_id: activityId,
          session_id: sessionId,
          learning_objectives: learningObjectives.map((o) => o.objective),
          concepts_mastered,
          concepts_struggling,
          chat_history: messages.slice(-10),
          current_phase: currentPhase,
          context_sources: selectedContextSources,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const aiMessage: ChatMessage = {
        id: Date.now().toString() + "_ai",
        type: "ai",
        content: data.response,
        timestamp: new Date(),
        learning_objectives: data.learning_objectives,
        concepts_identified: data.concepts_identified,
        confidence_score: data.confidence_score,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Update concepts mastery
      if (data.concepts_mastered) {
        setConceptsMastered((prev) => [
          ...new Set([...prev, ...data.concepts_mastered]),
        ]);
      }
      if (data.concepts_struggling) {
        setConceptsStruggling((prev) => [
          ...new Set([...prev, ...data.concepts_struggling]),
        ]);
      }

      // Check if ready for quiz phase
      if (data.ready_for_quiz && currentPhase === "practice") {
        setCurrentPhase("quiz");
        await generateQuizQuestion();
      }

      // Update session progress
      setSessionProgress((prev) => Math.min(100, prev + 5));
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + "_error",
        type: "system",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const generateQuizQuestion = async () => {
    try {
      const response = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activityId,
          learning_objectives: learningObjectives.map((o) => o.objective),
          concepts_mastered,
          concepts_struggling,
          difficulty: Math.min(5, Math.max(1, Math.floor(quizScore / 2) + 1)),
        }),
      });

      const data = await response.json();

      if (data.question) {
        setCurrentQuiz(data.question);
        setQuizAnswer(null);
      }
    } catch (error) {
      console.error("Error generating quiz question:", error);
    }
  };

  const submitQuizAnswer = (answerIndex: number) => {
    if (!currentQuiz) return;

    setQuizAnswer(answerIndex);
    const isCorrect = answerIndex === currentQuiz.correct_answer;

    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
    }

    // Add quiz result message
    const quizMessage: ChatMessage = {
      id: Date.now().toString() + "_quiz",
      type: "quiz",
      content: `You selected: ${currentQuiz.options[answerIndex]}`,
      timestamp: new Date(),
      quiz_data: {
        ...currentQuiz,
        correct_answer: currentQuiz.correct_answer,
      },
    };

    setMessages((prev) => [...prev, quizMessage]);

    // Check if all objectives are mastered
    const masteredCount = learningObjectives.filter(
      (o) => o.is_mastered
    ).length;
    const totalObjectives = learningObjectives.length;

    if (isCorrect && masteredCount < totalObjectives) {
      // Mark next objective as mastered
      const nextObjective = learningObjectives.find((o) => !o.is_mastered);
      if (nextObjective) {
        setLearningObjectives((prev) =>
          prev.map((o) =>
            o.objective === nextObjective.objective
              ? { ...o, is_mastered: true, mastery_level: 100 }
              : o
          )
        );
      }
    }

    // Check if all objectives are mastered
    setTimeout(() => {
      const allMastered = learningObjectives.every((o) => o.is_mastered);
      if (allMastered) {
        setCurrentPhase("mastery");
        setCanProceed(true);
        onComplete(quizScore * 10 + conceptsMastered.length * 5);
      } else {
        // Generate next question
        generateQuizQuestion();
      }
    }, 2000);
  };

  const proceedToNextPhase = () => {
    if (currentPhase === "instruction") {
      setCurrentPhase("practice");
    } else if (currentPhase === "practice") {
      setCurrentPhase("quiz");
      generateQuizQuestion();
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case "instruction":
        return <BookOpen className="h-4 w-4" />;
      case "practice":
        return <MessageSquare className="h-4 w-4" />;
      case "quiz":
        return <CheckCircle className="h-4 w-4" />;
      case "mastery":
        return <Trophy className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "instruction":
        return "bg-blue-500";
      case "practice":
        return "bg-green-500";
      case "quiz":
        return "bg-orange-500";
      case "mastery":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Enhanced AI Learning Chat</h1>
              <p className="text-muted-foreground">{activity?.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              AI Tutor
            </Badge>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${getPhaseColor(
                  currentPhase
                )}`}
              />
              <span className="text-sm font-medium capitalize">
                {currentPhase}
              </span>
            </div>
          </div>
        </div>

        {/* Phase Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Learning Progress</span>
            <span className="text-sm text-muted-foreground">
              {learningObjectives.filter((o) => o.is_mastered).length} /{" "}
              {learningObjectives.length} objectives mastered
            </span>
          </div>
          <Progress
            value={
              (learningObjectives.filter((o) => o.is_mastered).length /
                learningObjectives.length) *
              100
            }
            className="h-2"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            {/* Context Sources Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">Context Sources</h3>
                {selectedContextSources.length > 0 && (
                  <Badge variant="secondary">
                    {selectedContextSources.length} selected
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContextSelector(!showContextSelector)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showContextSelector ? "Hide" : "Configure"} Context
              </Button>
            </div>

            {/* Context Sources Display */}
            {selectedContextSources.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedContextSources.map((source) => (
                  <Badge
                    key={source.id}
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    {source.type === "pdf" ? (
                      <FileText className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    {source.title}
                  </Badge>
                ))}
              </div>
            )}

            {/* Context Selector Modal */}
            {showContextSelector && (
              <div className="mb-6">
                <ContextSelector
                  onContextSelected={setSelectedContextSources}
                  selectedSources={selectedContextSources}
                  courseId={activity?.course_id}
                />
              </div>
            )}
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getPhaseIcon(currentPhase)}
                      {currentPhase === "instruction" &&
                        "Learning Instructions"}
                      {currentPhase === "practice" && "Practice & Discussion"}
                      {currentPhase === "quiz" && "Knowledge Check"}
                      {currentPhase === "mastery" && "Mastery Achieved!"}
                    </CardTitle>
                    <CardDescription>
                      {currentPhase === "instruction" &&
                        "Follow the instructions to begin your learning journey"}
                      {currentPhase === "practice" &&
                        "Ask questions and practice with the AI tutor"}
                      {currentPhase === "quiz" &&
                        "Test your understanding with interactive quizzes"}
                      {currentPhase === "mastery" &&
                        "Congratulations! You have mastered all objectives"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      Progress: {sessionProgress}%
                    </div>
                    <Progress value={sessionProgress} className="w-20" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.type === "student"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.type === "student"
                            ? "bg-primary text-primary-foreground"
                            : message.type === "ai"
                            ? "bg-muted"
                            : message.type === "quiz"
                            ? "bg-orange-100 border border-orange-200"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {message.type === "ai" && (
                            <Brain className="h-4 w-4 mt-1 text-blue-500" />
                          )}
                          {message.type === "quiz" && (
                            <CheckCircle className="h-4 w-4 mt-1 text-orange-500" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm">{message.content}</p>

                            {message.type === "quiz" && message.quiz_data && (
                              <div className="mt-3 space-y-2">
                                <p className="font-medium text-sm">
                                  {message.quiz_data.question}
                                </p>
                                <div className="space-y-1">
                                  {message.quiz_data.options.map(
                                    (option, index) => (
                                      <div
                                        key={index}
                                        className={`p-2 rounded text-xs ${
                                          index ===
                                          message.quiz_data!.correct_answer
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + index)}.{" "}
                                        {option}
                                      </div>
                                    )
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {message.quiz_data.explanation}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                              <Clock className="h-3 w-3" />
                              <span>
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                              {message.confidence_score && (
                                <span className="text-green-600">
                                  Confidence:{" "}
                                  {Math.round(message.confidence_score * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Current Quiz Question */}
                  {currentQuiz && currentPhase === "quiz" && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] bg-orange-100 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-1 text-orange-500" />
                          <div className="flex-1">
                            <p className="font-medium text-sm mb-3">
                              {currentQuiz.question}
                            </p>
                            <div className="space-y-2">
                              {currentQuiz.options.map((option, index) => (
                                <button
                                  key={index}
                                  onClick={() => submitQuizAnswer(index)}
                                  disabled={quizAnswer !== null}
                                  className={`w-full p-3 rounded text-left text-sm transition-colors ${
                                    quizAnswer === index
                                      ? index === currentQuiz.correct_answer
                                        ? "bg-green-100 text-green-800 border border-green-300"
                                        : "bg-red-100 text-red-800 border border-red-300"
                                      : quizAnswer !== null &&
                                        index === currentQuiz.correct_answer
                                      ? "bg-green-100 text-green-800 border border-green-300"
                                      : "bg-white hover:bg-gray-50 border border-gray-200"
                                  }`}
                                >
                                  {String.fromCharCode(65 + index)}. {option}
                                </button>
                              ))}
                            </div>
                            {quizAnswer !== null && (
                              <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                                <p className="font-medium">Explanation:</p>
                                <p>{currentQuiz.explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-500 animate-pulse" />
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                {currentPhase !== "mastery" && (
                  <div className="flex gap-2">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={
                        currentPhase === "instruction"
                          ? "Ask questions about the instructions..."
                          : currentPhase === "practice"
                          ? "Ask questions or share what you're thinking..."
                          : "Type your answer or ask for clarification..."
                      }
                      className="flex-1 min-h-[60px]"
                      disabled={isLoading || currentPhase === "quiz"}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={
                        isLoading ||
                        !inputMessage.trim() ||
                        currentPhase === "quiz"
                      }
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Phase Control */}
                {currentPhase === "instruction" && (
                  <div className="mt-4 flex justify-end">
                    <Button onClick={proceedToNextPhase}>
                      I understand the instructions. Let's start!
                    </Button>
                  </div>
                )}

                {currentPhase === "mastery" && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-green-600" />
                      <h3 className="font-medium text-green-800">
                        Congratulations!
                      </h3>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      You have successfully mastered all learning objectives for
                      this activity!
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          onComplete(
                            quizScore * 10 + conceptsMastered.length * 5
                          )
                        }
                      >
                        Complete Activity
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Learning Progress Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Learning Objectives */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Learning Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {learningObjectives.map((objective, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {objective.objective}
                        </span>
                        <div className="flex items-center gap-1">
                          {objective.is_mastered ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Lock className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <Progress
                        value={objective.mastery_level}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quiz Progress */}
            {currentPhase === "quiz" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-orange-500" />
                    Quiz Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Score: {quizScore}</span>
                      <span>Questions: {totalQuizQuestions}</span>
                    </div>
                    <Progress
                      value={(quizScore / totalQuizQuestions) * 100}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Concepts Mastered */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Concepts Mastered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {conceptsMastered.map((concept, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {concept}
                    </Badge>
                  ))}
                  {conceptsMastered.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Keep learning!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() =>
                    setInputMessage(
                      "Can you explain this concept in simpler terms?"
                    )
                  }
                  disabled={currentPhase === "quiz"}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Simplify Explanation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() =>
                    setInputMessage("Can you give me some practice problems?")
                  }
                  disabled={currentPhase === "quiz"}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Practice Problems
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() =>
                    setInputMessage(
                      "I think I understand this now. Can you test my knowledge?"
                    )
                  }
                  disabled={currentPhase === "quiz"}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Test My Knowledge
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
