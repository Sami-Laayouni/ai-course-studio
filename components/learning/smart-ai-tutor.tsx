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
  Zap,
  TrendingUp,
  Award,
  BarChart3,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";

interface SmartAITutorProps {
  activityId: string;
  activity: any;
  onComplete: (points: number) => void;
}

interface ChatMessage {
  id: string;
  type: "student" | "ai" | "system" | "quiz" | "mastery";
  content: string;
  timestamp: Date;
  learning_objectives?: string[];
  concepts_identified?: string[];
  confidence_score?: number;
  mastery_level?: number;
  quiz_data?: {
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
    difficulty: number;
  };
  phase?: "instruction" | "practice" | "quiz" | "mastery";
}

interface LearningObjective {
  objective: string;
  mastery_level: number;
  attempts: number;
  last_assessed: Date;
  is_mastered: boolean;
  confidence_score: number;
  struggling_areas: string[];
}

interface MasteryPath {
  phase: string;
  title: string;
  description: string;
  completed: boolean;
  progress: number;
  requirements: string[];
}

export default function SmartAITutor({
  activityId,
  activity,
  onComplete,
}: SmartAITutorProps) {
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
  const [currentPhase, setCurrentPhase] = useState<
    "instruction" | "practice" | "quiz" | "mastery"
  >("instruction");
  const [masteryPath, setMasteryPath] = useState<MasteryPath[]>([]);
  const [overallMastery, setOverallMastery] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [totalQuizQuestions, setTotalQuizQuestions] = useState(0);
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState("intermediate");
  const [personalizedInstructions, setPersonalizedInstructions] = useState("");
  const [strugglingConcepts, setStrugglingConcepts] = useState<string[]>([]);
  const [masteryInsights, setMasteryInsights] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activity) {
      initializeSession();
    }
  }, [activity]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeSession = async () => {
    const newSessionId = `session_${Date.now()}`;
    setSessionId(newSessionId);

    // Initialize learning objectives
    const objectives = (activity?.lessons?.learning_objectives || []).map(
      (obj: string) => ({
        objective: obj,
        mastery_level: 0,
        attempts: 0,
        last_assessed: new Date(),
        is_mastered: false,
        confidence_score: 0,
        struggling_areas: [],
      })
    );
    setLearningObjectives(objectives);

    // Initialize mastery path
    const path: MasteryPath[] = [
      {
        phase: "instruction",
        title: "Learn the Concepts",
        description:
          "Understand the fundamental concepts through interactive learning",
        completed: false,
        progress: 0,
        requirements: [
          "Engage with AI tutor",
          "Ask clarifying questions",
          "Demonstrate understanding",
        ],
      },
      {
        phase: "practice",
        title: "Practice & Apply",
        description: "Apply what you've learned through guided practice",
        completed: false,
        progress: 0,
        requirements: [
          "Complete practice exercises",
          "Solve problems",
          "Get feedback",
        ],
      },
      {
        phase: "quiz",
        title: "Test Your Knowledge",
        description: "Take adaptive quizzes to assess your understanding",
        completed: false,
        progress: 0,
        requirements: [
          "Answer quiz questions",
          "Achieve passing score",
          "Review mistakes",
        ],
      },
      {
        phase: "mastery",
        title: "Achieve Mastery",
        description: "Demonstrate complete understanding and mastery",
        completed: false,
        progress: 0,
        requirements: [
          "Master all concepts",
          "Complete advanced challenges",
          "Teach others",
        ],
      },
    ];
    setMasteryPath(path);

    // Generate personalized instructions
    await generatePersonalizedInstructions();

    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "ai",
      content:
        personalizedInstructions ||
        `Welcome! I'm your AI tutor for "${activity?.title}". I'll help you master the concepts through personalized learning. Let's start by understanding what you already know about this topic.`,
      timestamp: new Date(),
      phase: "instruction",
    };
    setMessages([welcomeMessage]);
  };

  const generatePersonalizedInstructions = async () => {
    try {
      const response = await fetch("/api/ai/generate-instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activityId,
          learning_objectives: learningObjectives.map((obj) => obj.objective),
          student_level: adaptiveDifficulty,
        }),
      });

      const data = await response.json();
      if (data.instructions) {
        setPersonalizedInstructions(data.instructions);
      }
    } catch (error) {
      console.error("Error generating instructions:", error);
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
      // Check for phase transition
      await checkPhaseTransition(inputMessage);

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputMessage,
          activity_id: activityId,
          session_id: sessionId,
          learning_objectives: learningObjectives.map((obj) => obj.objective),
          concepts_mastered,
          concepts_struggling,
          chat_history: messages.slice(-10),
          current_phase: currentPhase,
          adaptive_difficulty: adaptiveDifficulty,
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
        mastery_level: data.mastery_level,
        phase: currentPhase,
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

      // Update learning objectives
      if (data.objective_progress) {
        updateLearningObjectives(data.objective_progress);
      }

      // Check if ready for next phase
      if (data.ready_for_next_phase) {
        await transitionToNextPhase();
      }

      // Update session progress
      setSessionProgress((prev) => Math.min(100, prev + 2));

      // Generate quiz if in quiz phase
      if (currentPhase === "quiz" && data.ready_for_quiz) {
        await generateQuizQuestion();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + "_error",
        type: "system",
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const checkPhaseTransition = async (message: string) => {
    try {
      const response = await fetch("/api/ai/check-phase-transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          current_phase: currentPhase,
          learning_objectives: learningObjectives.map((obj) => obj.objective),
          concepts_mastered,
          concepts_struggling,
          session_progress: sessionProgress,
        }),
      });

      const data = await response.json();
      if (data.should_transition && data.next_phase) {
        setCurrentPhase(data.next_phase);
        updateMasteryPath(data.next_phase);
      }
    } catch (error) {
      console.error("Error checking phase transition:", error);
    }
  };

  const transitionToNextPhase = async () => {
    const phases = ["instruction", "practice", "quiz", "mastery"];
    const currentIndex = phases.indexOf(currentPhase);

    if (currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1] as typeof currentPhase;
      setCurrentPhase(nextPhase);
      updateMasteryPath(nextPhase);

      const phaseMessage: ChatMessage = {
        id: Date.now().toString() + "_phase",
        type: "system",
        content: `🎉 Great progress! You're now ready for the ${nextPhase} phase. Let's continue your learning journey!`,
        timestamp: new Date(),
        phase: nextPhase,
      };
      setMessages((prev) => [...prev, phaseMessage]);
    } else {
      // All phases completed
      setIsSessionComplete(true);
      await completeSession();
    }
  };

  const updateMasteryPath = (phase: string) => {
    setMasteryPath((prev) =>
      prev.map((path) =>
        path.phase === phase
          ? { ...path, completed: true, progress: 100 }
          : path
      )
    );
  };

  const updateLearningObjectives = (progress: any) => {
    setLearningObjectives((prev) =>
      prev.map((obj) => {
        const updated = progress[obj.objective];
        if (updated) {
          return {
            ...obj,
            mastery_level: updated.mastery_level || obj.mastery_level,
            confidence_score: updated.confidence_score || obj.confidence_score,
            is_mastered: updated.mastery_level >= 80,
            struggling_areas: updated.struggling_areas || obj.struggling_areas,
          };
        }
        return obj;
      })
    );

    // Calculate overall mastery
    const totalMastery = learningObjectives.reduce(
      (sum, obj) => sum + obj.mastery_level,
      0
    );
    const averageMastery = totalMastery / learningObjectives.length;
    setOverallMastery(averageMastery);
  };

  const generateQuizQuestion = async () => {
    try {
      const response = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learning_objectives: learningObjectives.map((obj) => obj.objective),
          concepts_mastered,
          concepts_struggling,
          difficulty_level: adaptiveDifficulty,
          phase: currentPhase,
        }),
      });

      const data = await response.json();
      if (data.question) {
        setCurrentQuiz(data.question);
        setTotalQuizQuestions((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
    }
  };

  const handleQuizAnswer = (answerIndex: number) => {
    setQuizAnswer(answerIndex);

    if (currentQuiz) {
      const isCorrect = answerIndex === currentQuiz.correct_answer;
      if (isCorrect) {
        setQuizScore((prev) => prev + 1);
      }

      const quizMessage: ChatMessage = {
        id: Date.now().toString() + "_quiz",
        type: "quiz",
        content: `You selected: ${currentQuiz.options[answerIndex]}`,
        timestamp: new Date(),
        quiz_data: currentQuiz,
      };
      setMessages((prev) => [...prev, quizMessage]);

      // Show explanation
      setTimeout(() => {
        const explanationMessage: ChatMessage = {
          id: Date.now().toString() + "_explanation",
          type: "ai",
          content: `**${isCorrect ? "Correct!" : "Not quite right."}**\n\n${
            currentQuiz.explanation
          }`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, explanationMessage]);
        setCurrentQuiz(null);
        setQuizAnswer(null);
      }, 1000);
    }
  };

  const completeSession = async () => {
    const totalPoints = Math.round(overallMastery * 2); // 2 points per mastery percentage
    onComplete(totalPoints);

    const completionMessage: ChatMessage = {
      id: Date.now().toString() + "_complete",
      type: "mastery",
      content: `🎉 **Congratulations!** You've completed the learning session with ${overallMastery.toFixed(
        1
      )}% mastery! You earned ${totalPoints} points.`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, completionMessage]);
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case "instruction":
        return <BookOpen className="h-4 w-4" />;
      case "practice":
        return <Target className="h-4 w-4" />;
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
        return "bg-blue-100 text-blue-800";
      case "practice":
        return "bg-green-100 text-green-800";
      case "quiz":
        return "bg-purple-100 text-purple-800";
      case "mastery":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{activity?.title}</h2>
              <p className="text-sm text-gray-600">Smart AI Tutor</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge className={getPhaseColor(currentPhase)}>
              {getPhaseIcon(currentPhase)}
              <span className="ml-1 capitalize">{currentPhase}</span>
            </Badge>
            <div className="text-right">
              <div className="text-sm font-medium">
                {overallMastery.toFixed(1)}% Mastery
              </div>
              <Progress value={overallMastery} className="w-24 h-2" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === "student" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === "student"
                      ? "bg-blue-500 text-white"
                      : message.type === "system"
                      ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                      : message.type === "quiz"
                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                      : message.type === "mastery"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.type !== "student" && (
                      <div className="flex-shrink-0 mt-1">
                        {message.type === "ai" ? (
                          <Brain className="h-4 w-4 text-purple-600" />
                        ) : message.type === "system" ? (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        ) : message.type === "quiz" ? (
                          <CheckCircle className="h-4 w-4 text-purple-600" />
                        ) : message.type === "mastery" ? (
                          <Trophy className="h-4 w-4 text-green-600" />
                        ) : null}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                      {message.confidence_score && (
                        <div className="text-xs mt-1 opacity-75">
                          Confidence:{" "}
                          {Math.round(message.confidence_score * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <div className="flex space-x-1">
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
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quiz Question */}
          {currentQuiz && (
            <div className="bg-white border-t p-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Quiz Question
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">{currentQuiz.question}</p>
                  <div className="space-y-2">
                    {currentQuiz.options.map(
                      (option: string, index: number) => (
                        <Button
                          key={index}
                          variant={quizAnswer === index ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => handleQuizAnswer(index)}
                          disabled={quizAnswer !== null}
                        >
                          {String.fromCharCode(65 + index)}. {option}
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Input Area */}
          <div className="bg-white border-t p-4">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask me anything about the topic..."
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l overflow-y-auto">
          <Tabs defaultValue="progress" className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="progress" className="p-4 space-y-4">
              {/* Mastery Path */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Learning Path</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {masteryPath.map((path, index) => (
                    <div key={path.phase} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            path.completed
                              ? "bg-green-500 text-white"
                              : path.phase === currentPhase
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{path.title}</p>
                          <p className="text-xs text-gray-600">
                            {path.description}
                          </p>
                        </div>
                      </div>
                      <Progress value={path.progress} className="h-1" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Learning Objectives */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Learning Objectives</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {learningObjectives.map((obj, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{obj.objective}</span>
                        <Badge
                          variant={obj.is_mastered ? "default" : "secondary"}
                        >
                          {obj.mastery_level}%
                        </Badge>
                      </div>
                      <Progress value={obj.mastery_level} className="h-1" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quiz Stats */}
              {totalQuizQuestions > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Quiz Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Score:</span>
                        <span>
                          {quizScore}/{totalQuizQuestions}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Accuracy:</span>
                        <span>
                          {Math.round((quizScore / totalQuizQuestions) * 100)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="insights" className="p-4 space-y-4">
              {/* Mastery Insights */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Mastery Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {overallMastery.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600">Overall Mastery</p>
                  </div>

                  {conceptsMastered.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Concepts Mastered:
                      </p>
                      <div className="space-y-1">
                        {conceptsMastered.map((concept, index) => (
                          <Badge key={index} variant="default" className="mr-1">
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {conceptsStruggling.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Areas to Focus:
                      </p>
                      <div className="space-y-1">
                        {conceptsStruggling.map((concept, index) => (
                          <Badge
                            key={index}
                            variant="destructive"
                            className="mr-1"
                          >
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Session Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Session Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Messages:</span>
                    <span>{messages.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span>{sessionProgress}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Phase:</span>
                    <span className="capitalize">{currentPhase}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
