"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Send, Brain, Info, Zap } from "lucide-react";
import { VisualDiagramRenderer } from "@/components/learning/visual-diagram-renderer";

interface ChatMessage {
  id: string;
  type: "student" | "ai" | "system";
  content: string;
  diagrams?: Array<{ type: string; code: string; language?: string }>;
  teaching_style?: string;
  adaptive_routing?: any;
}

export default function TestPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [learningStyle, setLearningStyle] = useState<
    "visual" | "auditory" | "kinesthetic" | "reading"
  >("visual");
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
  const [conceptsMastered, setConceptsMastered] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<"mastery" | "novel" | null>(
    null
  );
  const [avgPerformance, setAvgPerformance] = useState(70);

  const learningObjectives = [
    "Understand the process of photosynthesis",
    "Identify the reactants and products of photosynthesis",
    "Explain the role of chlorophyll in photosynthesis",
    "Describe how plants convert light energy into chemical energy",
    "Understand the relationship between photosynthesis and cellular respiration",
  ];

  useEffect(() => {
    // Calculate average performance
    if (performanceHistory.length > 0) {
      const avg =
        performanceHistory.reduce((sum, p) => sum + (p.score || 70), 0) /
        performanceHistory.length;
      setAvgPerformance(Math.round(avg));
    }
  }, [performanceHistory]);

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: ChatMessage = {
      id: "welcome",
      type: "ai",
      content: `Welcome! I'm here to teach you about **Photosynthesis** - one of the most important processes in nature.

I'll adapt my teaching style to your learning preference and assess your understanding to determine the best learning path for you.

What do you already know about photosynthesis? Or if you're new to the topic, just say "I don't know much" and I'll guide you through it step by step.`,
    };
    setMessages([welcomeMessage]);
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "student",
      content: inputMessage,
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          activity_id: "test-photosynthesis",
          learning_objectives: learningObjectives,
          concepts_mastered: conceptsMastered,
          concepts_struggling: [],
          chat_history: messages.slice(-10),
          current_phase: "instruction",
          learning_style: learningStyle,
          performance_history: performanceHistory,
          enable_visuals: true,
          context_sources: [
            {
              type: "pdf",
              title: "Photosynthesis Basics",
              summary:
                "Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose molecules.",
            },
          ],
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
        diagrams: data.diagrams || [],
        teaching_style: data.teaching_style,
        adaptive_routing: data.adaptive_routing,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Update performance history
      if (data.performanceScore) {
        setPerformanceHistory((prev) => [
          ...prev,
          {
            type: "ai_chat",
            score: data.performanceScore,
            timestamp: Date.now(),
          },
        ]);
      }

      // Update concepts mastery
      if (data.concepts_mastered) {
        setConceptsMastered((prev) => [
          ...new Set([...prev, ...data.concepts_mastered]),
        ]);
      }

      // Determine path based on adaptive routing
      if (data.adaptive_routing) {
        const routing = data.adaptive_routing;
        if (routing.should_advance && avgPerformance >= 70) {
          setCurrentPath("mastery");
        } else if (routing.should_review || avgPerformance < 60) {
          setCurrentPath("novel");
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + "_error",
        type: "system",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">🌱 Photosynthesis Learning</h1>
            <div className="flex items-center gap-2">
              <select
                value={learningStyle}
                onChange={(e) => setLearningStyle(e.target.value as any)}
                className="px-3 py-1.5 text-sm border rounded-md bg-background"
              >
                <option value="visual">Visual</option>
                <option value="auditory">Auditory</option>
                <option value="kinesthetic">Kinesthetic</option>
                <option value="reading">Reading</option>
              </select>
              {currentPath && (
                <Badge
                  variant={currentPath === "mastery" ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  <Zap className="h-3 w-3" />
                  {currentPath === "mastery" ? "Mastery Path" : "Novel Path"}
                </Badge>
              )}
            </div>
          </div>
          <Progress
            value={(conceptsMastered.length / learningObjectives.length) * 100}
            className="h-2"
          />
          <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
            <span>
              {conceptsMastered.length} / {learningObjectives.length} concepts mastered
            </span>
            <span>Performance: {avgPerformance}%</span>
          </div>
        </div>

        {/* AI Chat Interface - Matching Activity Player Style */}
        <div className="space-y-4">
          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              AI Tutor - Photosynthesis
            </h3>
            <p className="text-blue-800 dark:text-blue-200 mb-2 text-sm">
              Ask questions about photosynthesis and I'll adapt to your learning style
            </p>
            <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
              <Info className="h-3 w-3 inline mr-1" />
              Adaptive learning enabled - Your path will adjust based on performance
            </div>
          </div>

          {/* Chat Messages */}
          {messages.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded ${
                    msg.type === "student"
                      ? "bg-blue-100 dark:bg-blue-900 ml-8"
                      : msg.type === "ai"
                      ? "bg-white dark:bg-gray-800 mr-8"
                      : "bg-yellow-100 dark:bg-yellow-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                  {/* Render diagrams if present */}
                  {msg.diagrams && msg.diagrams.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {msg.diagrams.map((diagram, idx) => (
                        <VisualDiagramRenderer key={idx} diagram={diagram} />
                      ))}
                    </div>
                  )}

                  {/* Show adaptive routing suggestions */}
                  {msg.adaptive_routing &&
                    msg.adaptive_routing.suggested_actions &&
                    msg.adaptive_routing.suggested_actions.length > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Suggested Next Steps:
                        </p>
                        <ul className="text-xs text-blue-800 dark:text-blue-200 list-disc list-inside">
                          {msg.adaptive_routing.suggested_actions.map(
                            (action: string, idx: number) => (
                              <li key={idx}>{action}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="flex gap-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask your question or share your thoughts..."
              rows={4}
              disabled={isLoading}
              className="resize-none"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="self-end"
              size="lg"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
