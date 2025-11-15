"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import {
  Play,
  Pause,
  Upload,
  UploadCloud,
  FileText,
  Video,
  Brain,
  Target,
  Users,
  BookOpen,
  CheckCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  Info,
  Lightbulb,
  Layers,
  Eye,
  MessageSquare,
  Gamepad2,
  Activity,
  Clock,
  Star,
  Trophy,
  Zap,
  X,
  ExternalLink,
  Send,
} from "lucide-react";
import ReviewActivity, {
  type ReviewAnalysisResult,
  type ReviewCompletionPayload,
} from "./review-activity";
import MisconceptionsReview from "./misconceptions-review";

interface ActivityNode {
  id: string;
  type: string;
  title: string;
  description: string;
  position: { x: number; y: number };
  config: any;
  connections: string[];
  size: { width: number; height: number };
  color: string;
  shape: string;
}

interface ActivityPlayerProps {
  activity: {
    id: string;
    title: string;
    description: string;
    content: {
      nodes: ActivityNode[];
      connections: Array<{ from: string; to: string; id: string }>;
      context_sources: any[];
    };
    points: number;
    estimated_duration: number;
  };
  onComplete: (score: number, timeSpent: number) => void;
}

export default function EnhancedActivityPlayer({
  activity,
  onComplete,
}: ActivityPlayerProps) {
  const [currentNode, setCurrentNode] = useState<ActivityNode | null>(null);
  const [visitedNodes, setVisitedNodes] = useState<Set<string>>(new Set());
  const [studentInput, setStudentInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [score, setScore] = useState(0);
  const [contextSources, setContextSources] = useState<any[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideshowData, setSlideshowData] = useState<any>(null);
  const [aiChatMessages, setAiChatMessages] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [currentPath, setCurrentPath] = useState<"mastery" | "novel" | null>(
    null
  );
  const [videoWatched, setVideoWatched] = useState(false);
  const [pdfViewed, setPdfViewed] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
  const [videoTime, setVideoTime] = useState<number>(0);
  const [showMisconceptionsReview, setShowMisconceptionsReview] =
    useState(false);
  const [hasCheckedMisconceptions, setHasCheckedMisconceptions] =
    useState(false);
  const [pendingReviewAnalysis, setPendingReviewAnalysis] =
    useState<ReviewAnalysisResult | null>(null);
  const [pointsAnimation, setPointsAnimation] = useState<{
    show: boolean;
    points: number;
  }>({ show: false, points: 0 });
  const [lastScore, setLastScore] = useState(0);

  const startTime = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeTimeRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const supabase = createClient();

  // Load uploaded files from context_sources
  useEffect(() => {
    const loadUploadedFiles = async () => {
      try {
        const { data: files, error } = await supabase
          .from("context_sources")
          .select("*")
          .eq("activity_id", activity.id)
          .eq("type", "document");

        if (!error && files) {
          setUploadedFiles(files);
        }
      } catch (err) {
        console.error("Error loading uploaded files:", err);
      }
    };

    loadUploadedFiles();
  }, [activity.id, supabase]);

  // Track visibility to pause timer when tab is inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.hidden) {
        // Tab is hidden - save accumulated time
        if (lastUpdateTimeRef.current) {
          const elapsed = (now - lastUpdateTimeRef.current) / 1000;
          activeTimeRef.current += elapsed;
        }
      } else {
        // Tab is visible - resume timer
        lastUpdateTimeRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Initialize activity and timer
  useEffect(() => {
    const startNode = activity.content.nodes.find((n) => n.type === "start");
    if (startNode) {
      setCurrentNode(startNode);
      setVisitedNodes(new Set([startNode.id]));
    }
    setContextSources(activity.content.context_sources || []);

    // Reset timer
    startTime.current = Date.now();
    lastUpdateTimeRef.current = Date.now();
    activeTimeRef.current = 0;
    setTimeSpent(0);

    // Start timer - only count active time
    intervalRef.current = setInterval(() => {
      if (!document.hidden) {
        const now = Date.now();
        const elapsed = (now - lastUpdateTimeRef.current) / 1000;
        activeTimeRef.current += elapsed;
        setTimeSpent(Math.floor(activeTimeRef.current));
        lastUpdateTimeRef.current = now;
      } else {
        // Update last update time even when hidden to prevent drift
        lastUpdateTimeRef.current = Date.now();
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activity]);

  // Watch for score changes to trigger animations
  useEffect(() => {
    if (score > lastScore) {
      const pointsEarned = score - lastScore;
      setPointsAnimation({ show: true, points: pointsEarned });
      setTimeout(() => {
        setPointsAnimation({ show: false, points: 0 });
      }, 2000);
    }
    setLastScore(score);
  }, [score, lastScore]);

  // Track video time and show questions at appropriate timestamps
  useEffect(() => {
    if (currentNode?.type === "video") {
      const autoQuestions = currentNode.config?.auto_questions || [];
      const videoUrl =
        currentNode.config?.youtube_url || currentNode.config?.video_url || "";
      const extractVideoId = (url: string) => {
        const match = url.match(
          /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
        );
        return match ? match[1] : null;
      };
      const videoId = extractVideoId(videoUrl);

      if (autoQuestions.length > 0 && videoId) {
        // Reset when switching to a video node
        setCurrentQuestionIndex(-1);
        setVideoTime(0);

        // Use YouTube IFrame API to track actual video time
        // For now, use a timer that can be synced with YouTube player
        const interval = setInterval(() => {
          setVideoTime((prev) => {
            const nextTime = prev + 1;
            // Find the next question that should be shown
            const nextQuestion = autoQuestions.findIndex(
              (q: any, idx: number) => {
                const questionTime = q.timestamp || 0;
                const prevQuestionTime =
                  idx > 0 ? autoQuestions[idx - 1].timestamp || 0 : -1;
                // Show question if we've reached its timestamp and haven't shown it yet
                return (
                  questionTime <= nextTime &&
                  (prevQuestionTime < nextTime || idx === 0) &&
                  idx !== currentQuestionIndex
                );
              }
            );
            if (nextQuestion !== -1) {
              setCurrentQuestionIndex(nextQuestion);
            }
            return nextTime;
          });
        }, 1000);
        return () => clearInterval(interval);
      } else {
        setCurrentQuestionIndex(-1);
        setVideoTime(0);
      }
    } else {
      setCurrentQuestionIndex(-1);
      setVideoTime(0);
    }
  }, [
    currentNode?.id,
    currentNode?.type,
    currentNode?.config?.auto_questions,
    currentNode?.config?.youtube_url,
  ]);

  // Update progress
  useEffect(() => {
    const totalNodes = activity.content.nodes.length;
    const visitedCount = visitedNodes.size;
    setProgress((visitedCount / totalNodes) * 100);
  }, [visitedNodes, activity.content.nodes.length]);

  // Reset misconception check state when leaving the end node
  useEffect(() => {
    if (currentNode?.type !== "end") {
      setHasCheckedMisconceptions(false);
    }
  }, [currentNode?.id, currentNode?.type]);

  const handleNodeSubmit = async () => {
    if (!currentNode) return;

    // Some node types don't require input
    if (
      currentNode.type === "start" ||
      currentNode.type === "video" ||
      currentNode.type === "pdf"
    ) {
      const nextNodeId = getNextNodeId();
      if (nextNodeId) {
        moveToNextNode(nextNodeId);
      }
      return;
    }

    // Other node types require input
    if (
      !studentInput.trim() &&
      currentNode.type !== "video" &&
      currentNode.type !== "pdf"
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let nextNodeId: string | null = null;
      let nodeScore = 0;

      // Handle different node types
      switch (currentNode.type) {
        case "ai_chat":
          await handleAIChat();
          // Award points for AI chat participation
          if (currentNode.config?.points) {
            nodeScore = currentNode.config.points;
          }
          // Don't auto-advance for AI chat - let user continue conversation
          // User can click "Continue" to move to next node
          break;
        case "quiz":
          // Check if all questions are answered
          const questions =
            currentNode.config?.questions
              ?.split("\n")
              .filter((q: string) => q.trim()) || [];
          const answeredCount = Object.keys(quizAnswers).length;
          if (answeredCount < questions.length) {
            setError("Please answer all questions before continuing.");
            setIsLoading(false);
            return;
          }
          nodeScore = await handleQuiz();
          nextNodeId = getNextNodeId();
          break;
        case "condition":
          nextNodeId = await handleCondition();
          break;
        case "pdf":
        case "document_upload":
          await handleDocumentUpload();
          // Award points for viewing/uploading documents
          if (
            currentNode.config?.points &&
            (pdfViewed || uploadedFiles.length > 0)
          ) {
            nodeScore = currentNode.config.points;
          }
          nextNodeId = getNextNodeId();
          break;
        case "slideshow_upload":
          await handleSlideshowUpload();
          nextNodeId = getNextNodeId();
          break;
        case "video":
          await handleVideo();
          // Award points for watching video
          if (currentNode.config?.points && videoWatched) {
            nodeScore = currentNode.config.points;
          }
          nextNodeId = getNextNodeId();
          break;
        case "collaboration":
          await handleCollaboration();
          nextNodeId = getNextNodeId();
          break;
        case "assignment":
          await handleAssignment();
          // Award points for completing assignment
          if (currentNode.config?.points && studentInput.trim()) {
            nodeScore = currentNode.config.points;
          }
          nextNodeId = getNextNodeId();
          break;
        case "reflection":
          await handleReflection();
          // Award points for reflection
          if (currentNode.config?.points && studentInput.trim()) {
            nodeScore = currentNode.config.points;
          }
          nextNodeId = getNextNodeId();
          break;
        case "custom":
          // Custom activity - award points if configured
          if (currentNode.config?.points && studentInput.trim()) {
            nodeScore = currentNode.config.points;
          }
          nextNodeId = getNextNodeId();
          break;
        case "review":
          // Review activity - handled by component, don't auto-advance
          // User clicks "Complete Review" to continue
          break;
        case "end":
          // Don't auto-complete - let the useEffect check for misconceptions
          // The misconceptions review will be shown if needed before completion
          setIsLoading(false);
          return; // Don't complete yet - let the component render the review if needed
        default:
          // Default behavior - move to next node
          nextNodeId = getNextNodeId();
      }

      if (nextNodeId) {
        moveToNextNode(nextNodeId);
      }

      setScore((prev) => prev + nodeScore);
      setStudentInput("");
      setVideoWatched(false);
      setPdfViewed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIChat = async () => {
    if (!currentNode) return;

    const response = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: studentInput,
        context: contextSources,
        nodeConfig: currentNode.config,
        performanceHistory,
        activityId: activity.id,
        enable_branching: currentNode.config?.enable_branching || false,
        mastery_path: currentNode.config?.mastery_path || "Mastery Path",
        novel_path: currentNode.config?.novel_path || "Novel Path",
        performance_threshold: currentNode.config?.performance_threshold || 70,
        learning_style: "visual", // Can be made configurable
        current_phase: "practice",
        enable_visuals: true,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();

    // Add messages to chat
    setAiChatMessages((prev) => [
      ...prev,
      { type: "student", content: studentInput },
      { type: "ai", content: data.response || data.message },
    ]);

    // Track performance for conditional logic
    const performanceScore =
      data.performanceScore || data.confidence_score || 70;
    setPerformanceHistory((prev) => [
      ...prev,
      {
        type: "ai_chat",
        score: performanceScore,
        response: studentInput,
        timestamp: Date.now(),
      },
    ]);

    // Track analytics
    await trackAnalytics(
      "ai_chat",
      {
        score: performanceScore,
        confidence_score: data.confidence_score,
        concepts_mastered: data.concepts_mastered || [],
        concepts_struggling: data.concepts_struggling || [],
      },
      studentInput
    );

    // Determine path if branching is enabled
    if (currentNode.config?.enable_branching) {
      const threshold = currentNode.config?.performance_threshold || 70;
      if (performanceScore >= threshold) {
        setCurrentPath("mastery");
      } else {
        setCurrentPath("novel");
      }
    }

    return data;
  };

  // Track analytics with deduplication
  const trackedNodes = useRef<Set<string>>(new Set());

  const trackAnalytics = async (
    nodeType: string,
    performanceData: any,
    studentResponse?: string
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !currentNode) return;

      // Create unique key for this tracking call
      const trackingKey = `${user.id}-${activity.id}-${currentNode.id}-${nodeType}`;

      // Prevent duplicate calls
      if (trackedNodes.current.has(trackingKey)) {
        console.log("⏭️ Analytics already tracked for this node, skipping");
        return;
      }

      // Mark as tracked immediately to prevent concurrent calls
      trackedNodes.current.add(trackingKey);

      const response = await fetch("/api/analytics/track-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: user.id,
          activity_id: activity.id,
          node_id: currentNode.id,
          node_type: nodeType,
          performance_data: performanceData,
          student_response: studentResponse,
          context_sources: contextSources,
        }),
      });

      // If the API says it's already tracked, that's fine
      if (!response.ok && response.status !== 200) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message?.includes("already tracked")) {
          console.log("✅ Analytics already tracked on server");
        } else {
          console.error("Error tracking analytics:", errorData);
          // Remove from set so it can be retried
          trackedNodes.current.delete(trackingKey);
        }
      }
    } catch (error) {
      console.error("Error tracking analytics:", error);
      // Remove from set on error so it can be retried
      if (currentNode) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const trackingKey = `${user.id}-${activity.id}-${currentNode.id}-${nodeType}`;
          trackedNodes.current.delete(trackingKey);
        }
      }
    }
  };

  const handleQuiz = async (): Promise<number> => {
    if (!currentNode) return 0;

    const questions =
      currentNode.config?.questions
        ?.split("\n")
        .filter((q: string) => q.trim()) || [];
    const totalQuestions = questions.length;

    // For now, we'll use a simple scoring mechanism
    // In a real implementation, this would compare against correct answers
    const answeredQuestions = Object.keys(quizAnswers).length;
    const score =
      totalQuestions > 0
        ? Math.round((answeredQuestions / totalQuestions) * 100)
        : 0;

    setPerformanceHistory((prev) => [
      ...prev,
      {
        type: "quiz",
        score,
        answers: quizAnswers,
        timestamp: Date.now(),
      },
    ]);

    // Track analytics
    await trackAnalytics("quiz", {
      score,
      percentage: score,
      total_questions: totalQuestions,
      answered_questions: answeredQuestions,
      answers: quizAnswers,
    });

    // Check if passing score is met
    const passingScore = currentNode.config?.passing_score || 70;
    if (score >= passingScore) {
      // Student passed
      setScore((prev) => prev + (currentNode.config?.points || 10));
    }

    return score;
  };

  const handleCondition = async (): Promise<string | null> => {
    const response = await fetch("/api/ai/check-phase-transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityId: activity.id,
        nodeId: currentNode?.id,
        studentResponse: studentInput,
        contextSources,
        performanceHistory,
        threshold: currentNode?.config.performance_threshold || 70,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to check condition");
    }

    const data = await response.json();

    // Find the appropriate next node based on the condition result
    const connections = activity.content.connections.filter(
      (conn) => conn.from === currentNode?.id
    );

    // In a real implementation, you'd have labeled connections
    // For now, we'll use the first connection
    return connections[0]?.to || null;
  };

  const handleDocumentUpload = async () => {
    // This would handle file upload to Google Cloud
    // For now, we'll simulate it
    const mockFile = {
      id: `doc_${Date.now()}`,
      name: "uploaded-document.pdf",
      url: "#",
      type: "document",
    };

    setUploadedFiles((prev) => [...prev, mockFile]);
    setContextSources((prev) => [...prev, mockFile]);
  };

  const handleSlideshowUpload = async () => {
    // This would handle slideshow upload and processing
    const mockSlideshow = {
      id: `slides_${Date.now()}`,
      title: "Uploaded Presentation",
      slides: [
        "Slide 1: Introduction",
        "Slide 2: Main Content",
        "Slide 3: Conclusion",
      ],
      currentSlide: 0,
    };

    setSlideshowData(mockSlideshow);
  };

  const handleVideo = async () => {
    // Mark video as watched when user clicks continue
    setVideoWatched(true);
  };

  const handleCollaboration = async () => {
    // Handle collaboration features
    // This would integrate with real-time collaboration
  };

  const handleAssignment = async () => {
    // Handle assignment submission
    // This would save the assignment response
  };

  const handleReflection = async () => {
    // Handle reflection journaling
    // This would save the reflection
  };

  const getNextNodeId = (): string | null => {
    if (!currentNode) return null;

    const connections = activity.content.connections.filter(
      (conn) => conn.from === currentNode.id
    );

    // If AI chat node with branching enabled, choose path based on performance
    if (
      currentNode.type === "ai_chat" &&
      currentNode.config?.enable_branching &&
      currentPath
    ) {
      // Look for connections - use first connection for now
      // In a full implementation, connections would have labels/paths
      if (connections.length > 0) {
        return connections[0].to;
      }
    }

    // Default: return first connection
    return connections[0]?.to || null;
  };

  const moveToNextNode = (nodeId: string) => {
    const nextNode = activity.content.nodes.find((n) => n.id === nodeId);
    if (nextNode) {
      setCurrentNode(nextNode);
      setVisitedNodes((prev) => new Set([...prev, nodeId]));
      // Reset state for new node
      setStudentInput("");
      setAiChatMessages([]);
      setQuizAnswers({});
      setCurrentPath(null);
      setVideoWatched(false);
      setPdfViewed(false);
    }
  };

  const handleActivityComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onComplete(score, timeSpent);
  };

  // Format time helper function - defined early to avoid issues
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const checkForMisconceptions = async () => {
    if (hasCheckedMisconceptions) return; // Already checked

    try {
      setHasCheckedMisconceptions(true); // Mark as checking to prevent duplicate calls
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // No user, complete activity
        if (currentNode?.type === "end") {
          setTimeout(() => handleActivityComplete(), 500);
        }
        return;
      }

      console.log(
        "🔍 Checking for misconceptions for activity:",
        activity.id,
        "student:",
        user.id
      );

      // Check multiple times with delays to catch misconceptions that might still be processing
      let attempts = 0;
      const maxAttempts = 3;
      let foundMisconceptions = false;

      while (attempts < maxAttempts && !foundMisconceptions) {
        if (attempts > 0) {
          // Wait before retrying (analysis might still be processing)
          console.log(
            `⏳ Waiting ${2 * attempts} seconds before retry ${attempts + 1}...`
          );
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempts));
        }

        const { data, error } = await supabase
          .from("student_misconceptions")
          .select("id, concept, misconception_description, severity")
          .eq("student_id", user.id)
          .eq("activity_id", activity.id)
          .is("resolved_at", null);

        console.log(`📊 Misconceptions query attempt ${attempts + 1}:`, {
          data,
          error,
          count: data?.length,
        });

        if (!error && data && data.length > 0) {
          console.log("✅ Found misconceptions, showing review:", data.length);
          setShowMisconceptionsReview(true);
          foundMisconceptions = true;
          return; // Exit function, review will be shown
        }

        attempts++;
      }

      // No misconceptions found after all attempts
      console.log(
        "✅ No misconceptions found after checking, completing activity"
      );
      if (currentNode?.type === "end") {
        setTimeout(() => handleActivityComplete(), 500);
      }
    } catch (error) {
      console.error("❌ Error checking misconceptions:", error);
      // On error, just complete the activity
      if (currentNode?.type === "end") {
        setTimeout(() => handleActivityComplete(), 500);
      }
    }
  };

  const renderNodeContent = () => {
    if (!currentNode) return null;

    switch (currentNode.type) {
      case "ai_chat":
        return (
          <div className="space-y-4">
            <div className="border-l-4 border-gray-300 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                {currentNode.title}
              </h3>
              {currentNode.description && (
                <p className="text-gray-600 mb-2">{currentNode.description}</p>
              )}
              {currentNode.config?.prompt && (
                <p className="text-gray-600 text-sm italic">
                  {currentNode.config.prompt}
                </p>
              )}
              {currentNode.config?.enable_branching && (
                <div className="mt-2 text-xs text-gray-500">
                  <Info className="h-3 w-3 inline mr-1" />
                  Adaptive learning enabled - Your path will adjust based on
                  performance
                </div>
              )}
            </div>

            {/* Chat Messages */}
            {aiChatMessages.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                {aiChatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded ${
                      msg.type === "student"
                        ? "bg-blue-100 ml-8"
                        : "bg-white mr-8"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}

            <Textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="Ask your question or share your thoughts..."
              rows={4}
            />
          </div>
        );

      case "quiz":
        const questions =
          currentNode.config?.questions
            ?.split("\n")
            .filter((q: string) => q.trim()) || [];
        const questionType =
          currentNode.config?.question_type || "short_answer";

        return (
          <div className="space-y-4">
            <div className="border-l-4 border-gray-300 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                {currentNode.title}
              </h3>
              {currentNode.description && (
                <p className="text-gray-600 mb-2">{currentNode.description}</p>
              )}
              <div className="flex gap-4 text-sm text-gray-500 mt-2">
                {currentNode.config?.time_limit && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {currentNode.config.time_limit} min
                  </span>
                )}
                {currentNode.config?.passing_score && (
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {currentNode.config.passing_score}% to pass
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-4">
              {questions.map((question: string, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <p className="font-medium text-gray-900 mb-3">
                    {index + 1}. {question}
                  </p>
                  {questionType === "multiple_choice" &&
                  currentNode.config?.options?.[index] ? (
                    <div className="space-y-2">
                      {currentNode.config.options[index]
                        .split("\n")
                        .map((option: string, optIdx: number) => (
                          <label
                            key={optIdx}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`question_${index}`}
                              value={option}
                              checked={
                                quizAnswers[`question_${index}`] === option
                              }
                              onChange={(e) =>
                                setQuizAnswers({
                                  ...quizAnswers,
                                  [`question_${index}`]: e.target.value,
                                })
                              }
                              className="text-blue-600"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                    </div>
                  ) : questionType === "true_false" ? (
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`question_${index}`}
                          value="true"
                          checked={quizAnswers[`question_${index}`] === "true"}
                          onChange={(e) =>
                            setQuizAnswers({
                              ...quizAnswers,
                              [`question_${index}`]: e.target.value,
                            })
                          }
                          className="text-blue-600"
                        />
                        <span className="text-sm">True</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`question_${index}`}
                          value="false"
                          checked={quizAnswers[`question_${index}`] === "false"}
                          onChange={(e) =>
                            setQuizAnswers({
                              ...quizAnswers,
                              [`question_${index}`]: e.target.value,
                            })
                          }
                          className="text-blue-600"
                        />
                        <span className="text-sm">False</span>
                      </label>
                    </div>
                  ) : (
                    <Textarea
                      value={quizAnswers[`question_${index}`] || ""}
                      onChange={(e) =>
                        setQuizAnswers({
                          ...quizAnswers,
                          [`question_${index}`]: e.target.value,
                        })
                      }
                      placeholder="Enter your answer..."
                      rows={2}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "condition":
        return (
          <div className="space-y-4">
            <div className="border-l-4 border-gray-300 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Assessment Point
              </h3>
              <p className="text-gray-600">
                Based on your performance, we'll determine the best learning
                path for you.
              </p>
            </div>
            <Textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="Share your understanding or ask questions..."
              rows={4}
            />
          </div>
        );

      case "pdf":
      case "document_upload":
        // Handle both PDF viewing and file uploads in the same node
        // Check if this is a file upload node (has upload_enabled config)
        if (currentNode.config?.upload_enabled) {
          return (
            <div className="space-y-4">
              <div className="border-l-4 border-gray-300 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {currentNode.title || "Uploaded Files"}
                </h3>
                {currentNode.description && (
                  <p className="text-gray-600 mb-2">
                    {currentNode.description}
                  </p>
                )}
                {currentNode.config?.instructions && (
                  <p className="text-gray-600 text-sm mb-4">
                    {currentNode.config.instructions}
                  </p>
                )}
              </div>

              {/* Display uploaded files */}
              {uploadedFiles && uploadedFiles.length > 0 ? (
                <div className="space-y-3">
                  {uploadedFiles
                    .filter((file: any) => file.node_id === currentNode.id)
                    .map((file: any) => (
                      <div
                        key={file.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                              {file.title || file.filename || "Untitled File"}
                            </h4>
                            {file.summary && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {file.summary}
                              </p>
                            )}
                            {file.key_points && file.key_points.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {file.key_points
                                  .slice(0, 5)
                                  .map((point: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                                    >
                                      {point}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View
                          </a>
                        </div>
                        {file.mime_type && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Type: {file.mime_type}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <UploadCloud className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No files uploaded yet for this node.</p>
                </div>
              )}
              {currentNode.config?.document_url ||
              currentNode.config?.pdf_url ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Document Available</span>
                    </div>
                    <Button
                      onClick={() => {
                        const url =
                          currentNode.config?.document_url ||
                          currentNode.config?.pdf_url;
                        window.open(url, "_blank");
                        setPdfViewed(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Document
                    </Button>
                  </div>
                  {pdfViewed && (
                    <p className="text-sm text-green-600 mt-2">
                      <CheckCircle className="h-3 w-3 inline mr-1" />
                      Document viewed
                    </p>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Upload your document here
                  </p>
                  <Button onClick={handleDocumentUpload} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Document
                  </Button>
                </div>
              )}
            </div>
          );
        } else {
          // Regular PDF document viewing (existing code)
          return (
            <div className="space-y-4">
              {currentNode.title && (
                <h3 className="text-lg font-semibold">{currentNode.title}</h3>
              )}
              {currentNode.description && (
                <p className="text-gray-600 dark:text-gray-400">
                  {currentNode.description}
                </p>
              )}
              {currentNode.config?.document_url ||
              currentNode.config?.pdf_url ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Document Available</span>
                    </div>
                    <Button
                      onClick={() => {
                        const url =
                          currentNode.config?.document_url ||
                          currentNode.config?.pdf_url;
                        window.open(url, "_blank");
                        setPdfViewed(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Document
                    </Button>
                  </div>
                  {pdfViewed && (
                    <p className="text-sm text-green-600 mt-2">
                      <CheckCircle className="h-3 w-3 inline mr-1" />
                      Document viewed
                    </p>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Upload your document here
                  </p>
                  <Button onClick={handleDocumentUpload} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Document
                  </Button>
                </div>
              )}
            </div>
          );
        }

      case "slideshow_upload":
        return (
          <div className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="font-semibold text-indigo-900 mb-2">
                Slideshow Upload
              </h3>
              <p className="text-indigo-800">
                {currentNode.config.instructions}
              </p>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Layers className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                Upload your presentation here
              </p>
              <Button onClick={handleSlideshowUpload} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Layers className="h-4 w-4 mr-2" />
                )}
                Upload Slideshow
              </Button>
            </div>
          </div>
        );

      case "video":
        const videoUrl =
          currentNode.config?.youtube_url ||
          currentNode.config?.video_url ||
          "";
        const extractVideoId = (url: string) => {
          const match = url.match(
            /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
          );
          return match ? match[1] : null;
        };
        const videoId = extractVideoId(videoUrl);
        const autoQuestions = currentNode.config?.auto_questions || [];

        return (
          <div className="space-y-4">
            <div className="border-l-4 border-gray-300 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                {currentNode.title}
              </h3>
              {currentNode.description && (
                <p className="text-gray-600">{currentNode.description}</p>
              )}
              {currentNode.config?.auto_add_questions &&
                autoQuestions.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    <Info className="h-3 w-3 inline mr-1" />
                    {autoQuestions.length} comprehension questions will appear
                    during the video
                  </div>
                )}
            </div>
            {videoId ? (
              <div className="space-y-4">
                <div className="aspect-video w-full rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={currentNode.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                {currentQuestionIndex >= 0 &&
                  autoQuestions[currentQuestionIndex] && (
                    <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-md">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            Question at{" "}
                            {Math.floor(
                              (autoQuestions[currentQuestionIndex].timestamp ||
                                0) / 60
                            )}
                            :
                            {(autoQuestions[currentQuestionIndex].timestamp ||
                              0) %
                              60 <
                            10
                              ? "0"
                              : ""}
                            {(autoQuestions[currentQuestionIndex].timestamp ||
                              0) % 60}
                          </p>
                          <p className="text-sm text-gray-900 mb-2">
                            {autoQuestions[currentQuestionIndex].question}
                          </p>
                          {autoQuestions[currentQuestionIndex].concept && (
                            <p className="text-xs text-gray-500 italic">
                              Testing:{" "}
                              {autoQuestions[currentQuestionIndex].concept}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentQuestionIndex(-1)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                {autoQuestions.length > 0 && currentQuestionIndex === -1 && (
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Questions will appear automatically at key learning
                      moments
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-8 text-center">
                <Video className="h-16 w-16 mx-auto text-white mb-4" />
                <p className="text-white">Video URL not configured</p>
              </div>
            )}
            {currentNode.config?.require_reflection && (
              <Textarea
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                placeholder="Share your thoughts about the video..."
                rows={3}
              />
            )}
          </div>
        );

      case "collaboration":
        return (
          <div className="space-y-4">
            <div className="border-l-4 border-gray-300 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Collaboration
              </h3>
              <p className="text-gray-600">Work together with your peers</p>
            </div>
            <Textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="Share your ideas and collaborate..."
              rows={4}
            />
          </div>
        );

      case "assignment":
        return (
          <div className="space-y-4">
            <div className="border-l-4 border-gray-300 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">Assignment</h3>
              <p className="text-gray-600">{currentNode.config.instructions}</p>
            </div>
            <Textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="Complete your assignment here..."
              rows={6}
            />
          </div>
        );

      case "reflection":
        return (
          <div className="space-y-4">
            <div className="border-l-4 border-gray-300 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">Reflection</h3>
              <p className="text-gray-600">{currentNode.config.prompts}</p>
            </div>
            <Textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="Reflect on your learning experience..."
              rows={6}
            />
          </div>
        );

      case "end":
        // Don't render end content if we need to show misconceptions review
        // This will be handled by the check before renderNodeContent
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h3 className="text-2xl font-bold text-green-900">
              Activity Complete!
            </h3>
            <p className="text-green-700">
              Great job! You've completed this learning activity.
            </p>
            <div className="flex justify-center gap-4">
              <Badge variant="outline" className="text-lg px-4 py-2">
                <Trophy className="h-4 w-4 mr-2" />
                {score} Points
              </Badge>
              <Badge variant="outline" className="text-lg px-4 py-2">
                <Clock className="h-4 w-4 mr-2" />
                {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
              </Badge>
            </div>
          </div>
        );

      case "start":
        return (
          <div className="text-center space-y-4 py-8">
            <Play className="h-16 w-16 mx-auto text-green-500" />
            <h3 className="text-2xl font-bold">{currentNode.title}</h3>
            {currentNode.description && (
              <p className="text-gray-600 max-w-md mx-auto">
                {currentNode.description}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Click Continue to begin the activity
            </p>
          </div>
        );

      case "custom":
        return (
          <div className="space-y-4">
            <div className="border-l-4 border-gray-300 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                {currentNode.title}
              </h3>
              {currentNode.description && (
                <p className="text-gray-600">{currentNode.description}</p>
              )}
              {currentNode.config?.instructions && (
                <p className="text-gray-600 text-sm mt-2">
                  {currentNode.config.instructions}
                </p>
              )}
            </div>
            {currentNode.config?.agentic_requirements && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 text-sm">
                  <Lightbulb className="h-4 w-4 inline mr-1" />
                  {currentNode.config.agentic_requirements}
                </p>
              </div>
            )}
            <Textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="Share your thoughts or responses..."
              rows={4}
            />
          </div>
        );

      case "review":
        return (
          <ReviewActivity
            nodeConfig={currentNode.config || {}}
            activityId={activity.id}
            nodeId={currentNode.id}
            contextSources={contextSources}
            onComplete={({ responses, analysis }: ReviewCompletionPayload) => {
              // Track performance
              setPerformanceHistory((prev) => [
                ...prev,
                {
                  type: "review",
                  responses,
                  analysis,
                  timestamp: Date.now(),
                },
              ]);

              if (analysis) {
                setPendingReviewAnalysis(analysis);
                setShowMisconceptionsReview(true);
                setHasCheckedMisconceptions(true);
              } else {
                // Ensure we'll still check at the end node for delayed analysis
                setHasCheckedMisconceptions(false);
              }

              if (currentNode.config?.points) {
                setScore((prev) => prev + (currentNode.config.points || 0));
              }

              // Move to next node
              const nextNodeId = getNextNodeId();
              if (nextNodeId) {
                moveToNextNode(nextNodeId);
              }
            }}
          />
        );

      default:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">
                {currentNode.title}
              </h3>
              {currentNode.description && (
                <p className="text-gray-700">{currentNode.description}</p>
              )}
            </div>
            <Textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="Share your thoughts or responses..."
              rows={4}
            />
          </div>
        );
    }
  };

  // Show misconceptions review if needed (check when we reach end node)
  // This MUST be before any conditional returns to follow React hooks rules
  useEffect(() => {
    if (currentNode?.type === "end" && !hasCheckedMisconceptions) {
      console.log("End node reached, checking for misconceptions...");
      // Wait a bit for any review analysis to complete
      const timer = setTimeout(() => {
        checkForMisconceptions();
      }, 2000); // Wait 2 seconds for analysis to complete

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode?.id, currentNode?.type, hasCheckedMisconceptions]);

  if (!currentNode) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show misconceptions review if needed
  if (showMisconceptionsReview) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <MisconceptionsReview
          activityId={activity.id}
          initialMisconceptions={
            pendingReviewAnalysis?.misconceptions || undefined
          }
          analysisSummary={
            pendingReviewAnalysis
              ? {
                  overall_assessment: pendingReviewAnalysis.overall_assessment,
                  recommended_review: pendingReviewAnalysis.recommended_review,
                  strengths:
                    pendingReviewAnalysis.strengths ||
                    pendingReviewAnalysis.concepts_understood,
                }
              : undefined
          }
          onComplete={() => {
            setShowMisconceptionsReview(false);
            setPendingReviewAnalysis(null);
            if (currentNode.type === "end") {
              handleActivityComplete();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Elegant Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2">
                {activity.title}
              </h1>
              {activity.description && (
                <p className="text-gray-600 text-base max-w-2xl">
                  {activity.description}
                </p>
              )}
            </div>

            {/* Progress Bar - Elegant */}
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Progress
                </span>
                <span className="font-medium text-gray-900">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gray-900 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Elegant Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Star className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Points
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {score}
                  </div>
                </div>
                {/* Points Animation - Elegant */}
                {pointsAnimation.show && (
                  <div className="ml-auto bg-green-100 text-green-700 font-semibold text-sm px-3 py-1 rounded-full animate-fade-in">
                    +{pointsAnimation.points}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Time
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 font-mono">
                    {formatTime(timeSpent)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Target className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Steps
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {visitedNodes.size}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Node - Elegant */}
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardHeader className="border-b border-gray-200 bg-gray-50">
            <CardTitle className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentNode.color || "#6B7280" }}
              />
              <span className="text-xl font-semibold text-gray-900">
                {currentNode.title}
              </span>
              {currentNode.config?.points && (
                <Badge variant="outline" className="ml-auto">
                  <Star className="h-3 w-3 mr-1" />
                  {currentNode.config.points} points
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {renderNodeContent()}

            {/* Context Sources */}
            {contextSources.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  Available Resources
                </h4>
                <div className="flex flex-wrap gap-2">
                  {contextSources.map((source, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {source.type === "document" ? (
                        <FileText className="h-3 w-3 mr-1" />
                      ) : (
                        <Video className="h-3 w-3 mr-1" />
                      )}
                      {source.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons - Kahoot Style */}
            {currentNode.type !== "end" && (
              <div className="flex justify-end gap-4 pt-4">
                {currentNode.type === "ai_chat" && aiChatMessages.length > 0 ? (
                  <>
                    <Button
                      onClick={async () => {
                        if (studentInput.trim()) {
                          await handleAIChat();
                          setStudentInput("");
                        }
                      }}
                      disabled={isLoading || !studentInput.trim()}
                      className="bg-gray-900 hover:bg-gray-800 text-white font-medium px-6 py-3 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-5 w-5 mr-2" />
                      Send Message
                    </Button>
                    <Button
                      onClick={handleNodeSubmit}
                      disabled={isLoading}
                      className="bg-gray-900 hover:bg-gray-800 text-white font-medium px-6 py-3 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <ArrowRight className="h-5 w-5 mr-2" />
                      )}
                      Continue →
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleNodeSubmit}
                    disabled={
                      isLoading ||
                      (currentNode.type !== "start" &&
                        currentNode.type !== "video" &&
                        currentNode.type !== "pdf" &&
                        currentNode.type !== "document_upload" &&
                        !studentInput.trim() &&
                        !(
                          currentNode.type === "quiz" &&
                          Object.keys(quizAnswers).length > 0
                        ))
                    }
                    className="bg-gray-900 hover:bg-gray-800 text-white font-medium px-8 py-3 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    {currentNode.type === "start"
                      ? "Begin Activity"
                      : "Continue"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
