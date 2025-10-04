"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
} from "lucide-react";
import Link from "next/link";

interface AIChatPageProps {
  params: Promise<{ id: string }>;
}

interface ChatMessage {
  id: string;
  type: "student" | "ai" | "system";
  content: string;
  timestamp: Date;
  learning_objectives?: string[];
  concepts_identified?: string[];
  confidence_score?: number;
}

interface LearningObjective {
  objective: string;
  mastery_level: number;
  attempts: number;
  last_assessed: Date;
}

interface QuizQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options?: string[];
  correct_answer: string;
  explanation: string;
  difficulty: number;
}

interface ChatPhase {
  phase: "introduction" | "learning" | "quiz" | "mastery_check" | "completion";
  title: string;
  description: string;
  instructions: string;
  quiz_questions?: QuizQuestion[];
  mastery_threshold: number;
}

export default function AIChatPage({ params }: AIChatPageProps) {
  const [activityId, setActivityId] = useState<string>("");
  const [activity, setActivity] = useState<any>(null);
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
  const [currentPhase, setCurrentPhase] = useState<ChatPhase | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [phaseInstructions, setPhaseInstructions] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setActivityId(resolvedParams.id);
      loadActivity(resolvedParams.id);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadActivity = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .select(
          `
          *,
          lessons (
            title,
            learning_objectives,
            course_id,
            courses (
              title,
              subject,
              grade_level
            )
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setActivity(data);

      // Load or create AI chat session
      await loadOrCreateSession(data);
    } catch (error) {
      console.error("Error loading activity:", error);
    }
  };

  const loadOrCreateSession = async (activity: any) => {
    try {
      // Check for existing active session
      const { data: existingSession, error: sessionError } = await supabase
        .from("ai_chat_sessions")
        .select("*")
        .eq("activity_id", activity.id)
        .eq("student_id", (await supabase.auth.getUser()).data.user?.id)
        .eq("session_status", "active")
        .single();

      if (sessionError && sessionError.code !== "PGRST116") {
        throw sessionError;
      }

      if (existingSession) {
        setSessionId(existingSession.id);
        setConceptsMastered(existingSession.conceptsMastered || []);
        setConceptsStruggling(existingSession.conceptsStruggling || []);

        // Load chat history
        const { data: chatHistory, error: historyError } = await supabase
          .from("ai_chat_conversations")
          .select("*")
          .eq("session_id", existingSession.id)
          .order("timestamp");

        if (!historyError && chatHistory) {
          const formattedMessages: ChatMessage[] = chatHistory.map((msg) => ({
            id: msg.id,
            type: msg.message_type as "student" | "ai" | "system",
            content: msg.message_content,
            timestamp: new Date(msg.timestamp),
            learning_objectives: msg.learning_objectives,
            concepts_identified: msg.concepts_identified,
            confidence_score: msg.confidence_score,
          }));
          setMessages(formattedMessages);
        }
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from("ai_chat_sessions")
          .insert({
            activity_id: activity.id,
            student_id: (await supabase.auth.getUser()).data.user?.id,
            learning_objectives: activity.lessons.learning_objectives || [],
            session_status: "active",
          })
          .select()
          .single();

        if (createError) throw createError;
        setSessionId(newSession.id);

        // Send welcome message
        const welcomeMessage: ChatMessage = {
          id: "welcome",
          type: "ai",
          content: `Hello! I'm your AI tutor for "${activity.title}". I'm here to help you understand the concepts and answer any questions you have. What would you like to explore first?`,
          timestamp: new Date(),
          learning_objectives: activity.lessons.learning_objectives || [],
          confidence_score: 1.0,
        };
        setMessages([welcomeMessage]);
      }

      // Load learning objectives progress
      await loadLearningObjectives(activity);

      // Initialize chat phases
      await initializeChatPhases(activity);
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };

  const loadLearningObjectives = async (activity: any) => {
    try {
      const { data, error } = await supabase
        .from("learning_objective_mastery")
        .select("*")
        .eq("student_id", (await supabase.auth.getUser()).data.user?.id)
        .eq("lesson_id", activity.lesson_id);

      if (!error && data) {
        const objectives: LearningObjective[] = data.map((obj) => ({
          objective: obj.learning_objective,
          mastery_level: obj.mastery_score,
          attempts: obj.attempts,
          last_assessed: new Date(obj.last_assessed_at),
        }));
        setLearningObjectives(objectives);
      }
    } catch (error) {
      console.error("Error loading learning objectives:", error);
    }
  };

  const initializeChatPhases = async (activity: any) => {
    try {
      // Generate unique instructions and phases for this activity
      const response = await fetch("/api/ai/generate-chat-phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activity.id,
          title: activity.title,
          description: activity.description,
          learning_objectives: activity.lessons?.learning_objectives || [],
          course_context: activity.lessons?.courses,
        }),
      });

      const data = await response.json();
      if (data.phases) {
        setCurrentPhase(data.phases[0]);
        setPhaseInstructions(data.phases[0].instructions);

        // Update welcome message with phase instructions
        const updatedWelcomeMessage: ChatMessage = {
          id: "welcome",
          type: "ai",
          content: `${data.phases[0].instructions}\n\nI'm here to help you understand the concepts and answer any questions you have. What would you like to explore first?`,
          timestamp: new Date(),
          learning_objectives: activity.lessons?.learning_objectives || [],
          confidence_score: 1.0,
        };
        setMessages([updatedWelcomeMessage]);
      }
    } catch (error) {
      console.error("Error initializing chat phases:", error);
    }
  };

  const checkPhaseTransition = async (message: string) => {
    try {
      const response = await fetch("/api/ai/check-phase-transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          current_phase: currentPhase?.phase,
          learning_objectives: activity?.lessons?.learning_objectives || [],
          conceptsMastered,
          conceptsStruggling,
          session_progress: sessionProgress,
        }),
      });

      const data = await response.json();
      if (data.should_transition && data.next_phase) {
        setCurrentPhase(data.next_phase);
        setPhaseInstructions(data.next_phase.instructions);

        // Add phase transition message
        const phaseMessage: ChatMessage = {
          id: `phase_${Date.now()}`,
          type: "system",
          content: `🎯 **${data.next_phase.title}**\n\n${data.next_phase.instructions}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, phaseMessage]);

        // If transitioning to quiz phase, generate quiz questions
        if (data.next_phase.phase === "quiz") {
          await generateQuizQuestions(data.next_phase);
        }
      }
    } catch (error) {
      console.error("Error checking phase transition:", error);
    }
  };

  const generateQuizQuestions = async (phase: ChatPhase) => {
    try {
      const response = await fetch("/api/ai/generate-quiz-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learning_objectives: activity?.lessons?.learning_objectives || [],
          conceptsMastered,
          conceptsStruggling,
          phase_instructions: phase.instructions,
          difficulty_level: activity?.difficulty_level || 3,
        }),
      });

      const data = await response.json();
      if (data.questions) {
        setQuizQuestions(data.questions);
        setShowQuiz(true);
        setCurrentQuizIndex(0);
        setQuizAnswers({});
      }
    } catch (error) {
      console.error("Error generating quiz questions:", error);
    }
  };

  const submitQuizAnswer = (questionId: string, answer: string) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const nextQuizQuestion = () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    } else {
      // Quiz completed, calculate score
      calculateQuizScore();
    }
  };

  const previousQuizQuestion = () => {
    if (currentQuizIndex > 0) {
      setCurrentQuizIndex(currentQuizIndex - 1);
    }
  };

  const calculateQuizScore = () => {
    let correct = 0;
    quizQuestions.forEach((question) => {
      const answer = quizAnswers[question.id];
      if (
        answer &&
        answer.toLowerCase().trim() ===
          question.correct_answer.toLowerCase().trim()
      ) {
        correct++;
      }
    });

    const score = Math.round((correct / quizQuestions.length) * 100);
    setQuizScore(score);

    // Check if student meets mastery threshold
    const masteryThreshold = currentPhase?.mastery_threshold || 80;
    if (score >= masteryThreshold) {
      // Student has mastered the concepts, move to next phase
      const masteryMessage: ChatMessage = {
        id: `mastery_${Date.now()}`,
        type: "system",
        content: `🎉 Excellent! You scored ${score}% on the quiz. You've demonstrated mastery of these concepts and can now move on to the next section.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, masteryMessage]);

      // Award points for quiz completion
      awardPoints(activity?.points || 10, "Quiz completion");

      // Move to next phase
      setTimeout(() => {
        setShowQuiz(false);
        setCurrentPhase({
          phase: "completion",
          title: "Activity Complete",
          description:
            "You have successfully completed this learning activity!",
          instructions:
            "Great job! You've mastered the concepts. You can now move on to the next activity or continue exploring.",
          mastery_threshold: 100,
        });
        setPhaseInstructions(
          "Great job! You've mastered the concepts. You can now move on to the next activity or continue exploring."
        );
      }, 2000);
    } else {
      // Student needs more practice
      const practiceMessage: ChatMessage = {
        id: `practice_${Date.now()}`,
        type: "system",
        content: `You scored ${score}% on the quiz. Let's review the concepts together and practice some more. I'll help you understand the areas where you need more support.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, practiceMessage]);

      // Reset quiz for retry
      setTimeout(() => {
        setShowQuiz(false);
        setCurrentQuizIndex(0);
        setQuizAnswers({});
        setQuizScore(null);
      }, 3000);
    }
  };

  const awardPoints = async (points: number, reason: string) => {
    try {
      await fetch("/api/student-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: (await supabase.auth.getUser()).data.user?.id,
          course_id: activity?.lessons?.course_id,
          activity_id: activityId,
          lesson_id: activity?.lesson_id,
          points_earned: points,
          reason,
        }),
      });
    } catch (error) {
      console.error("Error awarding points:", error);
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
    const messageToSend = inputMessage;
    setInputMessage("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Check for phase transition first
      await checkPhaseTransition(messageToSend);

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          activity_id: activityId,
          session_id: sessionId,
          learning_objectives: activity?.lessons.learning_objectives || [],
          conceptsMastered,
          conceptsStruggling,
          chat_history: messages.slice(-10), // Last 10 messages for context
          current_phase: currentPhase?.phase,
          phase_instructions: phaseInstructions,
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
      if (data.conceptsMastered) {
        setConceptsMastered((prev) => [
          ...new Set([...prev, ...data.conceptsMastered]),
        ]);
      }
      if (data.conceptsStruggling) {
        setConceptsStruggling((prev) => [
          ...new Set([...prev, ...data.conceptsStruggling]),
        ]);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendFeedback = async (isPositive: boolean) => {
    setFeedback(isPositive ? "positive" : "negative");

    try {
      await fetch("/api/ai-chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message_id: messages[messages.length - 1]?.id,
          feedback: isPositive ? "positive" : "negative",
        }),
      });
    } catch (error) {
      console.error("Error sending feedback:", error);
    }
  };

  const completeSession = async () => {
    try {
      await supabase
        .from("ai_chat_sessions")
        .update({
          session_status: "completed",
          completed_at: new Date().toISOString(),
          conceptsMastered,
          conceptsStruggling,
        })
        .eq("id", sessionId);

      router.push(`/learn/activities/${activityId}`);
    } catch (error) {
      console.error("Error completing session:", error);
    }
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) return "text-gray-500";
    if (score >= 0.8) return "text-green-500";
    if (score >= 0.6) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/learn/activities/${activityId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Activity
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">AI Learning Chat</h1>
              <p className="text-muted-foreground">{activity?.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              AI Tutor
            </Badge>
            <Button variant="outline" onClick={completeSession}>
              Complete Session
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Learning Conversation
                    </CardTitle>
                    <CardDescription>
                      Ask questions, explore concepts, and get personalized help
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
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {message.type === "ai" && (
                            <Brain className="h-4 w-4 mt-1 text-blue-500" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm">{message.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                              <Clock className="h-3 w-3" />
                              <span>
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                              {message.confidence_score && (
                                <span
                                  className={getConfidenceColor(
                                    message.confidence_score
                                  )}
                                >
                                  Confidence:{" "}
                                  {Math.round(message.confidence_score * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {message.type === "ai" && (
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => sendFeedback(true)}
                              className="h-6 w-6 p-0"
                            >
                              <ThumbsUp
                                className={`h-3 w-3 ${
                                  feedback === "positive"
                                    ? "text-green-500"
                                    : ""
                                }`}
                              />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => sendFeedback(false)}
                              className="h-6 w-6 p-0"
                            >
                              <ThumbsDown
                                className={`h-3 w-3 ${
                                  feedback === "negative" ? "text-red-500" : ""
                                }`}
                              />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

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

                {/* Quiz Interface */}
                {showQuiz && quizQuestions.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        Quiz: {currentPhase?.title}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        Question {currentQuizIndex + 1} of{" "}
                        {quizQuestions.length}
                      </div>
                    </div>

                    {quizQuestions[currentQuizIndex] && (
                      <div className="space-y-4">
                        <div className="p-4 bg-white rounded-lg border">
                          <h4 className="font-medium mb-3">
                            {quizQuestions[currentQuizIndex].question}
                          </h4>

                          {quizQuestions[currentQuizIndex].type ===
                            "multiple_choice" && (
                            <div className="space-y-2">
                              {quizQuestions[currentQuizIndex].options?.map(
                                (option, index) => (
                                  <label
                                    key={index}
                                    className="flex items-center space-x-2 cursor-pointer"
                                  >
                                    <input
                                      type="radio"
                                      name={`question_${quizQuestions[currentQuizIndex].id}`}
                                      value={option}
                                      checked={
                                        quizAnswers[
                                          quizQuestions[currentQuizIndex].id
                                        ] === option
                                      }
                                      onChange={(e) =>
                                        submitQuizAnswer(
                                          quizQuestions[currentQuizIndex].id,
                                          e.target.value
                                        )
                                      }
                                      className="text-blue-600"
                                    />
                                    <span className="text-sm">{option}</span>
                                  </label>
                                )
                              )}
                            </div>
                          )}

                          {quizQuestions[currentQuizIndex].type ===
                            "true_false" && (
                            <div className="space-y-2">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`question_${quizQuestions[currentQuizIndex].id}`}
                                  value="true"
                                  checked={
                                    quizAnswers[
                                      quizQuestions[currentQuizIndex].id
                                    ] === "true"
                                  }
                                  onChange={(e) =>
                                    submitQuizAnswer(
                                      quizQuestions[currentQuizIndex].id,
                                      e.target.value
                                    )
                                  }
                                  className="text-blue-600"
                                />
                                <span className="text-sm">True</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`question_${quizQuestions[currentQuizIndex].id}`}
                                  value="false"
                                  checked={
                                    quizAnswers[
                                      quizQuestions[currentQuizIndex].id
                                    ] === "false"
                                  }
                                  onChange={(e) =>
                                    submitQuizAnswer(
                                      quizQuestions[currentQuizIndex].id,
                                      e.target.value
                                    )
                                  }
                                  className="text-blue-600"
                                />
                                <span className="text-sm">False</span>
                              </label>
                            </div>
                          )}

                          {quizQuestions[currentQuizIndex].type ===
                            "short_answer" && (
                            <textarea
                              value={
                                quizAnswers[
                                  quizQuestions[currentQuizIndex].id
                                ] || ""
                              }
                              onChange={(e) =>
                                submitQuizAnswer(
                                  quizQuestions[currentQuizIndex].id,
                                  e.target.value
                                )
                              }
                              placeholder="Type your answer here..."
                              className="w-full p-2 border rounded-md text-sm"
                              rows={3}
                            />
                          )}
                        </div>

                        <div className="flex justify-between">
                          <Button
                            variant="outline"
                            onClick={previousQuizQuestion}
                            disabled={currentQuizIndex === 0}
                          >
                            Previous
                          </Button>
                          <Button
                            onClick={nextQuizQuestion}
                            disabled={
                              !quizAnswers[quizQuestions[currentQuizIndex].id]
                            }
                          >
                            {currentQuizIndex === quizQuestions.length - 1
                              ? "Submit Quiz"
                              : "Next Question"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quiz Results */}
                {quizScore !== null && (
                  <div className="mb-4 p-4 bg-green-50 rounded-lg border">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">
                        Quiz Results
                      </h3>
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {quizScore}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {quizScore >= (currentPhase?.mastery_threshold || 80)
                          ? "Great job! You've mastered these concepts."
                          : "Let's review these concepts together."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="flex gap-2">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question or share what you're thinking..."
                    className="flex-1 min-h-[60px]"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Learning Progress Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Current Phase */}
            {currentPhase && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Current Phase
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-medium text-sm">
                      {currentPhase.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currentPhase.description}
                    </div>
                    <div className="text-xs bg-blue-50 p-2 rounded">
                      {phaseInstructions}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                        <span className="text-xs text-muted-foreground">
                          {Math.round(objective.mastery_level)}%
                        </span>
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

            {/* Concepts Struggling */}
            {conceptsStruggling.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    Areas to Focus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {conceptsStruggling.map((concept, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {concept}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
