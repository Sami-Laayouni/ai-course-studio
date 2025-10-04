"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  MessageSquare,
  BookOpen,
  CheckCircle,
  Clock,
  Star,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Download,
} from "lucide-react";

interface VideoActivityProps {
  activity: {
    id: string;
    title: string;
    description: string;
    content: {
      video_url: string;
      video_metadata?: {
        duration: string;
        quality: string;
        captions: boolean;
      };
      interactive_elements?: {
        pause_points: Array<{
          timestamp: string;
          question: string;
          activity: string;
        }>;
        note_taking: string[];
        discussion_questions: string[];
      };
      assessment?: {
        comprehension_quiz: any;
        reflection_prompts: string[];
      };
    };
    points: number;
    estimated_duration: number;
  };
  onComplete: (points: number) => void;
}

interface Note {
  id: string;
  timestamp: string;
  content: string;
  type: "general" | "question" | "insight";
}

export default function VideoActivity({
  activity,
  onComplete,
}: VideoActivityProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<"general" | "question" | "insight">(
    "general"
  );
  const [showPausePoint, setShowPausePoint] = useState<any>(null);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYouTubeId(activity.content.video_url);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1`
    : activity.content.video_url;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration);

      // Check for pause points
      const pausePoints =
        activity.content.interactive_elements?.pause_points || [];
      const currentPausePoint = pausePoints.find((point) => {
        const pointTime = parseTimeToSeconds(point.timestamp);
        return Math.abs(video.currentTime - pointTime) < 2;
      });

      if (
        currentPausePoint &&
        !completedSections.includes(currentPausePoint.timestamp)
      ) {
        setShowPausePoint(currentPausePoint);
        video.pause();
        setIsPlaying(false);
      }

      // Update progress
      const progressPercent = (video.currentTime / video.duration) * 100;
      setProgress(progressPercent);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (progress >= 90) {
        completeActivity();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, [activity.content.interactive_elements, completedSections, progress]);

  const parseTimeToSeconds = (timeString: string) => {
    const parts = timeString.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const seekTime = (parseFloat(e.target.value) / 100) * duration;
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const addNote = () => {
    if (!newNote.trim()) return;

    const note: Note = {
      id: Date.now().toString(),
      timestamp: formatTime(currentTime),
      content: newNote,
      type: noteType,
    };

    setNotes((prev) => [...prev, note]);
    setNewNote("");
  };

  const handlePausePointResponse = (response: string) => {
    if (showPausePoint) {
      setCompletedSections((prev) => [...prev, showPausePoint.timestamp]);
      setShowPausePoint(null);

      // Resume video
      const video = videoRef.current;
      if (video) {
        video.play();
        setIsPlaying(true);
      }
    }
  };

  const completeActivity = () => {
    setIsCompleted(true);
    onComplete(activity.points);
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case "question":
        return "❓";
      case "insight":
        return "💡";
      default:
        return "📝";
    }
  };

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            {activity.title}
          </CardTitle>
          <CardDescription>{activity.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={containerRef}
            className="relative bg-black rounded-lg overflow-hidden"
          >
            {videoId ? (
              <iframe
                ref={videoRef as any}
                src={embedUrl}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                ref={videoRef}
                src={activity.content.video_url}
                className="w-full aspect-video"
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            )}

            {/* Custom Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(currentTime / duration) * 100 || 0}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlayPause}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>

                  <span className="text-white text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Interactive Elements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    My Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Add Note */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={noteType}
                          onChange={(e) => setNoteType(e.target.value as any)}
                          className="px-3 py-2 border rounded-md"
                        >
                          <option value="general">General Note</option>
                          <option value="question">Question</option>
                          <option value="insight">Insight</option>
                        </select>
                        <Input
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Add a note at current timestamp..."
                          onKeyPress={(e) => e.key === "Enter" && addNote()}
                        />
                        <Button onClick={addNote} size="sm">
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className="flex gap-3 p-3 border rounded-lg"
                        >
                          <div className="text-2xl">
                            {getNoteIcon(note.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {note.timestamp}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {note.type}
                              </Badge>
                            </div>
                            <p className="text-sm">{note.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="discussion" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Discussion Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activity.content.interactive_elements?.discussion_questions?.map(
                      (question, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">{question}</h4>
                          <Textarea
                            placeholder="Share your thoughts..."
                            className="min-h-[80px]"
                          />
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quiz" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Comprehension Quiz
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>
                      Quiz questions will appear here after watching the video
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Video Info */}
          <Card>
            <CardHeader>
              <CardTitle>Video Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Duration:{" "}
                  {activity.content.video_metadata?.duration || "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Points: {activity.points}</span>
              </div>
              {activity.content.video_metadata?.captions && (
                <Badge variant="outline" className="text-xs">
                  Captions Available
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Pause Points */}
          {activity.content.interactive_elements?.pause_points && (
            <Card>
              <CardHeader>
                <CardTitle>Interactive Checkpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activity.content.interactive_elements.pause_points.map(
                    (point, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm ${
                          completedSections.includes(point.timestamp)
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <div className="font-medium">{point.timestamp}</div>
                        <div className="text-xs">{point.question}</div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Status */}
          <Card>
            <CardContent className="pt-6">
              {isCompleted ? (
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-600">
                    Activity Completed!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You earned {activity.points} points
                  </p>
                </div>
              ) : (
                <Button
                  onClick={completeActivity}
                  className="w-full"
                  disabled={progress < 90}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Activity
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pause Point Modal */}
      {showPausePoint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Checkpoint: {showPausePoint.timestamp}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{showPausePoint.question}</p>
              <Textarea
                placeholder="Your response..."
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handlePausePointResponse("")}
                  className="flex-1"
                >
                  Continue
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPausePoint(null)}
                >
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
