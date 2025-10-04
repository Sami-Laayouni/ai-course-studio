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
import {
  Play,
  CheckCircle,
  Brain,
  FileText,
  Video,
  Target,
  Zap,
  UploadCloud,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import DocumentUploadSimple from "./document-upload-simple";

interface SimpleActivityPlayerProps {
  activity: any;
  onComplete?: () => void;
}

export default function SimpleActivityPlayer({
  activity,
  onComplete,
}: SimpleActivityPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [userProgress, setUserProgress] = useState<Record<string, any>>({});
  const [aiPerformance, setAiPerformance] = useState<
    "mastery" | "novel" | null
  >(null);

  const steps = activity.content?.nodes || [];
  const connections = activity.content?.connections || [];

  const getStepIcon = (step: any) => {
    switch (step.type) {
      case "start":
        return <Play className="h-5 w-5 text-green-500" />;
      case "end":
        return <CheckCircle className="h-5 w-5 text-gray-500" />;
      case "ai_chat":
        return <Brain className="h-5 w-5 text-purple-500" />;
      case "pdf":
        return <UploadCloud className="h-5 w-5 text-orange-500" />;
      case "video":
        return <Video className="h-5 w-5 text-red-500" />;
      case "quiz":
        return <Target className="h-5 w-5 text-blue-500" />;
      case "custom":
        return <Zap className="h-5 w-5 text-indigo-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleStepComplete = (stepIndex: number, data?: any) => {
    setCompletedSteps((prev) => new Set([...prev, stepIndex]));
    if (data) {
      setUserProgress((prev) => ({ ...prev, [stepIndex]: data }));
    }

    // Check for AI branching
    const step = steps[stepIndex];
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
        className={`mb-4 ${isActive ? "ring-2 ring-blue-500" : ""}`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStepIcon(step)}
            {step.title}
          </CardTitle>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {step.type === "pdf" && (
            <DocumentUploadSimple
              onUploadComplete={(url, fileName, fileType) => {
                handleStepComplete(index, { url, fileName, fileType });
              }}
              acceptedTypes={
                step.config?.accepted_types || [
                  ".pdf",
                  ".pptx",
                  ".ppt",
                  ".docx",
                  ".doc",
                  ".jpg",
                  ".jpeg",
                  ".png",
                ]
              }
              maxSize={step.config?.max_size_mb || 10}
            />
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
              <div className="p-4 bg-red-50 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Video Content</h4>
                <p className="text-sm text-red-700">
                  Watch the video content and then continue.
                </p>
              </div>
              <Button
                onClick={() => handleStepComplete(index)}
                className="w-full"
              >
                Mark Video as Watched
              </Button>
            </div>
          )}

          {step.type === "quiz" && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Quiz</h4>
                <p className="text-sm text-blue-700">
                  Complete the quiz questions.
                </p>
              </div>
              <Button
                onClick={() => handleStepComplete(index)}
                className="w-full"
              >
                Complete Quiz
              </Button>
            </div>
          )}

          {step.type === "custom" && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h4 className="font-medium text-indigo-900 mb-2">
                  Custom Activity
                </h4>
                <p className="text-sm text-indigo-700">
                  Complete this custom learning activity.
                </p>
              </div>
              <Button
                onClick={() => handleStepComplete(index)}
                className="w-full"
              >
                Complete Activity
              </Button>
            </div>
          )}

          {step.type === "end" && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-semibold text-green-700">
                Activity Complete!
              </h3>
              <p className="text-gray-600">
                You've successfully completed this learning activity.
              </p>
              <Button onClick={onComplete} className="w-full">
                Finish
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const progress = (completedSteps.size / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{activity.title}</h1>
        <p className="text-gray-600 mb-4">{activity.description}</p>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => renderStep(step, index))}
      </div>

      {aiPerformance && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
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
