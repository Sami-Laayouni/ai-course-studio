"use client";

import React, { useState } from "react";
import SimpleActivityPlayer from "@/components/learning/simple-activity-player";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Play, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DemoActivityPage() {
  const [showPlayer, setShowPlayer] = useState(false);

  // Sample activity data
  const sampleActivity = {
    id: "demo-activity-1",
    title: "Introduction to Machine Learning",
    description:
      "Learn the basics of machine learning through interactive content and AI tutoring.",
    content: {
      nodes: [
        {
          id: "start-1",
          type: "start",
          title: "Welcome",
          description: "Let's begin your machine learning journey!",
          position: { x: 200, y: 200 },
          config: {},
        },
        {
          id: "video-1",
          type: "video",
          title: "What is Machine Learning?",
          description: "Watch this video to understand the fundamentals",
          position: { x: 400, y: 200 },
          config: {
            youtube_url: "https://www.youtube.com/watch?v=ukzFI9rgwfU",
            duration: 10,
            autoplay: false,
          },
        },
        {
          id: "pdf-1",
          type: "pdf",
          title: "Reading: ML Concepts",
          description: "Read about key machine learning concepts",
          position: { x: 600, y: 200 },
          config: {
            content: `Machine Learning Fundamentals

Machine learning is a subset of artificial intelligence (AI) that focuses on the development of algorithms and statistical models that enable computer systems to improve their performance on a specific task through experience.

Key Concepts:
1. Supervised Learning: Learning with labeled training data
2. Unsupervised Learning: Finding patterns in data without labels
3. Reinforcement Learning: Learning through interaction with an environment

Applications:
- Image recognition
- Natural language processing
- Recommendation systems
- Autonomous vehicles`,
            estimated_time: 5,
          },
        },
        {
          id: "ai-chat-1",
          type: "ai_chat",
          title: "AI Tutor Session",
          description: "Ask questions about machine learning concepts",
          position: { x: 800, y: 200 },
          config: {
            prompt:
              "You are an expert machine learning tutor. Help the student understand the concepts they just learned about. Be encouraging and provide clear explanations.",
            max_turns: 5,
          },
        },
        {
          id: "quiz-1",
          type: "quiz",
          title: "Knowledge Check",
          description: "Test your understanding with these questions",
          position: { x: 1000, y: 200 },
          config: {
            questions: [
              { text: "What is supervised learning?", type: "text" },
              {
                text: "What are the main types of machine learning?",
                type: "text",
              },
              {
                text: "Give an example of a machine learning application.",
                type: "text",
              },
            ],
            time_limit: 10,
            passing_score: 70,
            points: 15,
          },
        },
        {
          id: "custom-1",
          type: "custom",
          title: "Creative Project",
          description: "Create your own machine learning project",
          position: { x: 1200, y: 200 },
          config: {
            instructions:
              "Design a simple machine learning project that solves a real-world problem. Write a 1-page proposal including:\n\n1. Problem statement\n2. Data sources\n3. Algorithm choice\n4. Expected outcomes\n\nSubmit your proposal for review.",
            estimated_duration: 30,
            points: 25,
            activity_type: "creative",
          },
        },
        {
          id: "end-1",
          type: "end",
          title: "Congratulations!",
          description: "You've completed the machine learning introduction",
          position: { x: 1200, y: 200 },
          config: {},
        },
      ],
      connections: [
        { from: "start-1", to: "video-1", id: "conn-1" },
        { from: "video-1", to: "pdf-1", id: "conn-2" },
        { from: "pdf-1", to: "ai-chat-1", id: "conn-3" },
        { from: "ai-chat-1", to: "quiz-1", id: "conn-4" },
        { from: "quiz-1", to: "custom-1", id: "conn-5" },
        { from: "custom-1", to: "end-1", id: "conn-6" },
      ],
    },
  };

  const handleActivityComplete = (score?: number, timeSpent?: number) => {
    alert(`Activity completed! Time spent: ${timeSpent} minutes`);
    setShowPlayer(false);
  };

  if (showPlayer) {
    return (
      <SimpleActivityPlayer
        activity={sampleActivity}
        onComplete={handleActivityComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Activity Player Demo
          </h1>
          <p className="text-gray-600">
            Test the simplified activity builder and player
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                Try the Activity Player
              </CardTitle>
              <CardDescription>
                Experience how students will interact with the activities you
                create
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                This demo shows a complete learning activity with:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 mb-6">
                <li>• Start/End nodes</li>
                <li>• YouTube video integration</li>
                <li>• PDF reading content</li>
                <li>• AI chat tutoring</li>
                <li>• Interactive quiz with proper questions</li>
                <li>• Custom activity builder</li>
                <li>• Points system for all activities</li>
                <li>• Progress tracking</li>
              </ul>
              <Button
                onClick={() => setShowPlayer(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Demo Activity
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Builder Features</CardTitle>
              <CardDescription>
                What makes this builder simple and effective
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    ✅ Fixed Issues
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Nodes are actually draggable</li>
                    <li>• Clear, thick green arrows show connections</li>
                    <li>• Simple click-to-connect (no confusing buttons)</li>
                    <li>• Clean, modern node design</li>
                    <li>• Proper parameter panels</li>
                    <li>• Save & share functionality</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    🎯 Core Components
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Start & End nodes</li>
                    <li>• Video (YouTube URL support)</li>
                    <li>• PDF/Reading content</li>
                    <li>• AI Chat with context</li>
                    <li>• Interactive Quiz with proper questions</li>
                    <li>• Custom Activity builder</li>
                    <li>• Points system for all activities</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    🚀 Student Experience
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Intuitive navigation</li>
                    <li>• Progress tracking</li>
                    <li>• Real-time interactions</li>
                    <li>• Mobile-friendly design</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
