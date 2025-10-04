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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Pen,
  Eraser,
  Square,
  Circle,
  Type,
  Image,
  Download,
  Upload,
  MessageSquare,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  Share,
  Lock,
  Unlock,
  CheckCircle,
  Clock,
  Star,
} from "lucide-react";

interface CollaborativeWhiteboardProps {
  activityId: string;
  activity: any;
  onComplete: (points: number) => void;
}

interface Participant {
  id: string;
  name: string;
  color: string;
  isOnline: boolean;
  lastActive: Date;
}

interface DrawingElement {
  id: string;
  type: "pen" | "rectangle" | "circle" | "text" | "image";
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  strokeWidth: number;
  content?: string;
  createdBy: string;
  createdAt: Date;
}

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: "text" | "system";
}

export default function CollaborativeWhiteboard({
  activityId,
  activity,
  onComplete,
}: CollaborativeWhiteboardProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentTool, setCurrentTool] = useState<
    "pen" | "rectangle" | "circle" | "text" | "eraser"
  >("pen");
  const [currentColor, setCurrentColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [collaborationScore, setCollaborationScore] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  const colors = [
    "#000000",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#FFA500",
    "#800080",
    "#008000",
  ];

  useEffect(() => {
    initializeWhiteboard();
    startSessionTimer();
  }, [activityId]);

  useEffect(() => {
    // Simulate real-time collaboration updates
    const interval = setInterval(() => {
      updateCollaborationScore();
    }, 5000);

    return () => clearInterval(interval);
  }, [drawingElements, chatMessages]);

  const initializeWhiteboard = async () => {
    // Initialize with sample participants
    setParticipants([
      {
        id: "1",
        name: "You",
        color: "#FF0000",
        isOnline: true,
        lastActive: new Date(),
      },
      {
        id: "2",
        name: "Sarah",
        color: "#00FF00",
        isOnline: true,
        lastActive: new Date(),
      },
      {
        id: "3",
        name: "Mike",
        color: "#0000FF",
        isOnline: false,
        lastActive: new Date(Date.now() - 300000),
      },
    ]);

    // Add welcome message
    setChatMessages([
      {
        id: "1",
        sender: "System",
        content:
          "Welcome to the collaborative whiteboard! Start drawing and chatting with your team.",
        timestamp: new Date(),
        type: "system",
      },
    ]);
  };

  const startSessionTimer = () => {
    const interval = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  };

  const updateCollaborationScore = () => {
    const drawingCount = drawingElements.length;
    const chatCount = chatMessages.filter((m) => m.type === "text").length;
    const activeParticipants = participants.filter((p) => p.isOnline).length;

    const score = drawingCount * 2 + chatCount * 1 + activeParticipants * 5;
    setCollaborationScore(score);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isLocked) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setLastPoint({ x, y });

    if (currentTool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        addDrawingElement({
          type: "text",
          x,
          y,
          color: currentColor,
          strokeWidth,
          content: text,
          createdBy: "You",
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPoint || isLocked) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === "pen") {
      drawLine(lastPoint.x, lastPoint.y, x, y);
    }

    setLastPoint({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    setLastPoint(null);

    if (currentTool === "rectangle" || currentTool === "circle") {
      // Add shape element
      addDrawingElement({
        type: currentTool,
        x: lastPoint?.x || 0,
        y: lastPoint?.y || 0,
        width: Math.abs((lastPoint?.x || 0) - (lastPoint?.x || 0)),
        height: Math.abs((lastPoint?.y || 0) - (lastPoint?.y || 0)),
        color: currentColor,
        strokeWidth,
        createdBy: "You",
      });
    }
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  };

  const addDrawingElement = (
    element: Omit<DrawingElement, "id" | "createdAt">
  ) => {
    const newElement: DrawingElement = {
      ...element,
      id: Date.now().toString(),
      createdAt: new Date(),
    };

    setDrawingElements((prev) => [...prev, newElement]);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawingElements([]);
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "You",
      content: chatMessage,
      timestamp: new Date(),
      type: "text",
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setChatMessage("");
  };

  const completeActivity = () => {
    const points =
      collaborationScore + drawingElements.length * 2 + chatMessages.length * 1;
    onComplete(points);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Collaborative Whiteboard</h1>
            <p className="text-muted-foreground">{activity?.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {participants.filter((p) => p.isOnline).length} Online
            </Badge>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{formatTime(sessionTime)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Whiteboard */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Whiteboard</CardTitle>
                    <CardDescription>
                      Collaborate in real-time with your team
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLocked(!isLocked)}
                    >
                      {isLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearCanvas}>
                      Clear
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Toolbar */}
                <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded-lg">
                  <div className="flex items-center gap-1">
                    <Button
                      variant={currentTool === "pen" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentTool("pen")}
                    >
                      <Pen className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={
                        currentTool === "rectangle" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => setCurrentTool("rectangle")}
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={currentTool === "circle" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentTool("circle")}
                    >
                      <Circle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={currentTool === "text" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentTool("text")}
                    >
                      <Type className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={currentTool === "eraser" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentTool("eraser")}
                    >
                      <Eraser className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="w-px h-6 bg-border mx-2" />

                  <div className="flex items-center gap-2">
                    <span className="text-sm">Color:</span>
                    <div className="flex gap-1">
                      {colors.map((color) => (
                        <button
                          key={color}
                          className={`w-6 h-6 rounded border-2 ${
                            currentColor === color
                              ? "border-foreground"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setCurrentColor(color)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="w-px h-6 bg-border mx-2" />

                  <div className="flex items-center gap-2">
                    <span className="text-sm">Size:</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 border border-border rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={400}
                    className="w-full h-full cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: participant.color }}
                      />
                      <span className="text-sm flex-1">{participant.name}</span>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          participant.isOnline ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chat */}
            <Card className="h-64">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`text-sm ${
                        message.type === "system"
                          ? "text-muted-foreground italic"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{message.sender}:</span>
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p>{message.content}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        sendChatMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={sendChatMessage}>
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Collaboration Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Collaboration Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {collaborationScore}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Points earned through collaboration
                  </p>
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
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? (
                    <MicOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Mic className="h-4 w-4 mr-2" />
                  )}
                  {isMuted ? "Unmute" : "Mute"} Mic
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                >
                  {isVideoOn ? (
                    <VideoOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Video className="h-4 w-4 mr-2" />
                  )}
                  {isVideoOn ? "Turn Off" : "Turn On"} Video
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Share className="h-4 w-4 mr-2" />
                  Share Board
                </Button>
                <Button size="sm" className="w-full" onClick={completeActivity}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Activity
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
