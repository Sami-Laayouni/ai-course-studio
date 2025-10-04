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
    if (!currentNode || !studentInput.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      let nextNodeId: string | null = null;
      let nodeScore = 0;

      // Handle different node types
      switch (currentNode.type) {
        case "ai_chat":
          await handleAIChat();
          break;
        case "quiz":
          nodeScore = await handleQuiz();
          break;
        case "condition":
          nextNodeId = await handleCondition();
          break;
        case "document_upload":
          await handleDocumentUpload();
          break;
        case "slideshow_upload":
          await handleSlideshowUpload();
          break;
        case "video":
          await handleVideo();
          break;
        case "collaboration":
          await handleCollaboration();
          break;
        case "assignment":
          await handleAssignment();
          break;
        case "reflection":
          await handleReflection();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIChat = async () => {
    const response = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: studentInput,
        context: contextSources,
        nodeConfig: currentNode?.config,
        performanceHistory,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();

    // Track performance for conditional logic
    setPerformanceHistory((prev) => [
      ...prev,
      {
        type: "ai_chat",
        score: data.performanceScore || 70,
        response: studentInput,
        timestamp: Date.now(),
      },
    ]);

    return data;
  };

  const handleQuiz = async (): Promise<number> => {
    // Simple quiz scoring - in real implementation, this would be more sophisticated
    const questions = currentNode?.config.questions?.split("\n") || [];
    const correctAnswers = Math.floor(Math.random() * questions.length) + 1; // Mock scoring
    const totalQuestions = questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    setPerformanceHistory((prev) => [
      ...prev,
      {
        type: "quiz",
        score,
        response: studentInput,
        timestamp: Date.now(),
      },
    ]);

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
    // Handle video playback and interaction
    // This would integrate with video player
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
    const connections = activity.content.connections.filter(
      (conn) => conn.from === currentNode?.id
    );
    return connections[0]?.to || null;
  };

  const moveToNextNode = (nodeId: string) => {
    const nextNode = activity.content.nodes.find((n) => n.id === nodeId);
    if (nextNode) {
      setCurrentNode(nextNode);
      setVisitedNodes((prev) => new Set([...prev, nodeId]));
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
              <h3 className="font-semibold text-blue-900 mb-2">AI Tutor</h3>
              <p className="text-blue-800">{currentNode.config.prompt}</p>
            </div>
            <Textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="Ask your question or share your thoughts..."
              rows={4}
            />
          </div>
        );

      case "quiz":
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Quiz</h3>
              <p className="text-green-800">Answer the following questions:</p>
            </div>
            <div className="space-y-2">
              {currentNode.config.questions
                ?.split("\n")
                .map((question: string, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded">
                    <p className="font-medium">
                      {index + 1}. {question}
                    </p>
                  </div>
                ))}
            </div>
            <Textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="Enter your answers..."
              rows={4}
            />
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

      case "document_upload":
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">
                Document Upload
              </h3>
              <p className="text-purple-800">
                {currentNode.config.instructions}
              </p>
            </div>
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
        return (
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">Video Content</h3>
              <p className="text-red-800">
                Watch the video and share your thoughts
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-8 text-center">
              <Video className="h-16 w-16 mx-auto text-white mb-4" />
              <p className="text-white">Video Player</p>
            </div>
            <Textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="Share your thoughts about the video..."
              rows={3}
            />
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

      default:
        return (
          <div className="space-y-4">
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
              <Button
                onClick={handleNodeSubmit}
                disabled={isLoading || !studentInput.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
