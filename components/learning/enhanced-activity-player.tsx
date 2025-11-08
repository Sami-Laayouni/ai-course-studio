"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  Upload,
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
} from "lucide-react";

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
  const [currentPath, setCurrentPath] = useState<"mastery" | "novel" | null>(null);
  const [videoWatched, setVideoWatched] = useState(false);
  const [pdfViewed, setPdfViewed] = useState(false);

  const startTime = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize activity
  useEffect(() => {
    const startNode = activity.content.nodes.find((n) => n.type === "start");
    if (startNode) {
      setCurrentNode(startNode);
      setVisitedNodes(new Set([startNode.id]));
    }
    setContextSources(activity.content.context_sources || []);

    // Start timer
    startTime.current = Date.now();
    intervalRef.current = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activity]);

  // Update progress
  useEffect(() => {
    const totalNodes = activity.content.nodes.length;
    const visitedCount = visitedNodes.size;
    setProgress((visitedCount / totalNodes) * 100);
  }, [visitedNodes, activity.content.nodes.length]);

  const handleNodeSubmit = async () => {
    if (!currentNode) return;

    // Some node types don't require input
    if (currentNode.type === "start" || currentNode.type === "video" || currentNode.type === "pdf") {
      const nextNodeId = getNextNodeId();
      if (nextNodeId) {
        moveToNextNode(nextNodeId);
      }
      return;
    }

    // Other node types require input
    if (!studentInput.trim() && currentNode.type !== "video" && currentNode.type !== "pdf") {
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
          // Don't auto-advance for AI chat - let user continue conversation
          // User can click "Continue" to move to next node
          break;
        case "quiz":
          // Check if all questions are answered
          const questions = currentNode.config?.questions?.split("\n").filter((q: string) => q.trim()) || [];
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
          nextNodeId = getNextNodeId();
          break;
        case "slideshow_upload":
          await handleSlideshowUpload();
          nextNodeId = getNextNodeId();
          break;
        case "video":
          await handleVideo();
          nextNodeId = getNextNodeId();
          break;
        case "collaboration":
          await handleCollaboration();
          nextNodeId = getNextNodeId();
          break;
        case "assignment":
          await handleAssignment();
          nextNodeId = getNextNodeId();
          break;
        case "reflection":
          await handleReflection();
          nextNodeId = getNextNodeId();
          break;
        case "custom":
          // Custom activity - just move to next
          nextNodeId = getNextNodeId();
          break;
        case "end":
          handleActivityComplete();
          return;
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
    const performanceScore = data.performanceScore || data.confidence_score || 70;
    setPerformanceHistory((prev) => [
      ...prev,
      {
        type: "ai_chat",
        score: performanceScore,
        response: studentInput,
        timestamp: Date.now(),
      },
    ]);

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

  const handleQuiz = async (): Promise<number> => {
    if (!currentNode) return 0;

    const questions = currentNode.config?.questions?.split("\n").filter((q: string) => q.trim()) || [];
    const totalQuestions = questions.length;
    
    // For now, we'll use a simple scoring mechanism
    // In a real implementation, this would compare against correct answers
    const answeredQuestions = Object.keys(quizAnswers).length;
    const score = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    setPerformanceHistory((prev) => [
      ...prev,
      {
        type: "quiz",
        score,
        answers: quizAnswers,
        timestamp: Date.now(),
      },
    ]);

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
    if (currentNode.type === "ai_chat" && currentNode.config?.enable_branching && currentPath) {
      // Look for connections labeled with path names
      const pathConnection = connections.find((conn) => 
        conn.label === currentPath || 
        conn.path === currentPath ||
        (currentPath === "mastery" && conn.label?.toLowerCase().includes("mastery")) ||
        (currentPath === "novel" && conn.label?.toLowerCase().includes("novel"))
      );
      
      if (pathConnection) {
        return pathConnection.to;
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

  const renderNodeContent = () => {
    if (!currentNode) return null;

    switch (currentNode.type) {
      case "ai_chat":
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">{currentNode.title}</h3>
              {currentNode.description && (
                <p className="text-blue-800 mb-2">{currentNode.description}</p>
              )}
              {currentNode.config?.prompt && (
                <p className="text-blue-800 text-sm italic">{currentNode.config.prompt}</p>
              )}
              {currentNode.config?.enable_branching && (
                <div className="mt-2 text-xs text-blue-700">
                  <Info className="h-3 w-3 inline mr-1" />
                  Adaptive learning enabled - Your path will adjust based on performance
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
        const questions = currentNode.config?.questions?.split("\n").filter((q: string) => q.trim()) || [];
        const questionType = currentNode.config?.question_type || "short_answer";
        
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">{currentNode.title}</h3>
              {currentNode.description && (
                <p className="text-green-800 mb-2">{currentNode.description}</p>
              )}
              {currentNode.config?.time_limit && (
                <p className="text-green-700 text-sm">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Time limit: {currentNode.config.time_limit} minutes
                </p>
              )}
              {currentNode.config?.passing_score && (
                <p className="text-green-700 text-sm">
                  <Target className="h-3 w-3 inline mr-1" />
                  Passing score: {currentNode.config.passing_score}%
                </p>
              )}
            </div>
            <div className="space-y-4">
              {questions.map((question: string, index: number) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                  <p className="font-medium mb-3">
                    {index + 1}. {question}
                  </p>
                  {questionType === "multiple_choice" && currentNode.config?.options?.[index] ? (
                    <div className="space-y-2">
                      {currentNode.config.options[index].split("\n").map((option: string, optIdx: number) => (
                        <label key={optIdx} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${index}`}
                            value={option}
                            checked={quizAnswers[`question_${index}`] === option}
                            onChange={(e) => setQuizAnswers({...quizAnswers, [`question_${index}`]: e.target.value})}
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
                          onChange={(e) => setQuizAnswers({...quizAnswers, [`question_${index}`]: e.target.value})}
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
                          onChange={(e) => setQuizAnswers({...quizAnswers, [`question_${index}`]: e.target.value})}
                          className="text-blue-600"
                        />
                        <span className="text-sm">False</span>
                      </label>
                    </div>
                  ) : (
                    <Textarea
                      value={quizAnswers[`question_${index}`] || ""}
                      onChange={(e) => setQuizAnswers({...quizAnswers, [`question_${index}`]: e.target.value})}
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
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">
                Assessment Point
              </h3>
              <p className="text-yellow-800">
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
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">{currentNode.title}</h3>
              {currentNode.description && (
                <p className="text-purple-800 mb-2">{currentNode.description}</p>
              )}
              {currentNode.config?.instructions && (
                <p className="text-purple-800 text-sm">{currentNode.config.instructions}</p>
              )}
            </div>
            {currentNode.config?.document_url || currentNode.config?.pdf_url ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Document Available</span>
                  </div>
                  <Button
                    onClick={() => {
                      const url = currentNode.config?.document_url || currentNode.config?.pdf_url;
                      window.open(url, '_blank');
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
                <p className="text-gray-600 mb-4">Upload your document here</p>
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
        const videoUrl = currentNode.config?.youtube_url || currentNode.config?.video_url || "";
        const extractVideoId = (url: string) => {
          const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
          return match ? match[1] : null;
        };
        const videoId = extractVideoId(videoUrl);
        
        return (
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">{currentNode.title}</h3>
              {currentNode.description && (
                <p className="text-red-800">{currentNode.description}</p>
              )}
            </div>
            {videoId ? (
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
            <div className="bg-pink-50 p-4 rounded-lg">
              <h3 className="font-semibold text-pink-900 mb-2">
                Collaboration
              </h3>
              <p className="text-pink-800">Work together with your peers</p>
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
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">Assignment</h3>
              <p className="text-orange-800">
                {currentNode.config.instructions}
              </p>
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
            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2">Reflection</h3>
              <p className="text-amber-800">{currentNode.config.prompts}</p>
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
              <p className="text-gray-600 max-w-md mx-auto">{currentNode.description}</p>
            )}
            <p className="text-sm text-muted-foreground">Click Continue to begin the activity</p>
          </div>
        );

      case "custom":
        return (
          <div className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="font-semibold text-indigo-900 mb-2">{currentNode.title}</h3>
              {currentNode.description && (
                <p className="text-indigo-800">{currentNode.description}</p>
              )}
              {currentNode.config?.instructions && (
                <p className="text-indigo-800 text-sm mt-2">{currentNode.config.instructions}</p>
              )}
            </div>
            {currentNode.config?.agentic_requirements && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
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

      default:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{currentNode.title}</h3>
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

  if (!currentNode) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">{activity.title}</h1>
        <p className="text-gray-600">{activity.description}</p>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6">
          <Badge variant="outline">
            <Star className="h-4 w-4 mr-1" />
            {score} Points
          </Badge>
          <Badge variant="outline">
            <Clock className="h-4 w-4 mr-1" />
            {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
          </Badge>
          <Badge variant="outline">
            <Target className="h-4 w-4 mr-1" />
            {visitedNodes.size} / {activity.content.nodes.length} Steps
          </Badge>
        </div>
      </div>

      {/* Current Node */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentNode.color }}
            />
            {currentNode.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Action Buttons */}
          {currentNode.type !== "end" && (
            <div className="flex justify-end gap-2">
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
                    variant="outline"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                  <Button
                    onClick={handleNodeSubmit}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Continue to Next Step
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
                     !(currentNode.type === "quiz" && Object.keys(quizAnswers).length > 0))
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  {currentNode.type === "start" ? "Begin Activity" : "Continue"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
