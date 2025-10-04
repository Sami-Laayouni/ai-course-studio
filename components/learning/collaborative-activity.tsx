"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  MessageSquare,
  ThumbsUp,
  Edit,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Settings,
  Star,
  Heart,
} from "lucide-react";

interface CollaborativeActivityProps {
  activityId: string;
  studentId: string;
  onComplete: (points: number) => void;
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  joined_at: string;
  last_active: string;
  contributions: number;
}

interface Message {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  timestamp: string;
  type: "message" | "contribution" | "system";
  likes: number;
  is_edited: boolean;
}

interface Contribution {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  type: "idea" | "solution" | "question" | "feedback";
  timestamp: string;
  votes: number;
  status: "pending" | "approved" | "rejected";
}

export default function CollaborativeActivity({
  activityId,
  studentId,
  onComplete,
}: CollaborativeActivityProps) {
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newContribution, setNewContribution] = useState("");
  const [contributionType, setContributionType] = useState<
    "idea" | "solution" | "question" | "feedback"
  >("idea");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadSession();
    setupRealtimeSubscription();
  }, [activityId]);

  const loadSession = async () => {
    try {
      // Get or create collaborative session
      const { data: existingSession, error: sessionError } = await supabase
        .from("collaborative_sessions")
        .select(
          `
          *,
          activities(title, content, collaboration_settings)
        `
        )
        .eq("activity_id", activityId)
        .eq("status", "active")
        .single();

      if (sessionError && sessionError.code !== "PGRST116") {
        throw sessionError;
      }

      if (existingSession) {
        setSession(existingSession);
        loadParticipants(existingSession.id);
        loadMessages(existingSession.id);
        loadContributions(existingSession.id);
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from("collaborative_sessions")
          .insert({
            activity_id: activityId,
            session_name: `Collaborative Session ${new Date().toLocaleDateString()}`,
            status: "active",
            created_by: studentId,
            session_data: {
              activity_type: "collaborative",
              instructions:
                "Work together to complete this collaborative activity",
            },
          })
          .select(
            `
            *,
            activities(title, content, collaboration_settings)
          `
          )
          .single();

        if (createError) throw createError;
        setSession(newSession);
      }
    } catch (error) {
      console.error("Error loading session:", error);
      setError("Failed to load collaborative session");
    }
  };

  const loadParticipants = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("collaborative_participants")
        .select(
          `
          *,
          profiles(full_name, avatar_url)
        `
        )
        .eq("session_id", sessionId);

      if (error) throw error;

      const participantsData: Participant[] = (data || []).map((p) => ({
        id: p.student_id,
        name: p.profiles?.full_name || "Unknown",
        avatar: p.profiles?.avatar_url,
        joined_at: p.joined_at,
        last_active: p.last_active_at,
        contributions: Object.keys(p.contributions || {}).length,
      }));

      setParticipants(participantsData);
    } catch (error) {
      console.error("Error loading participants:", error);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("ai_chat_conversations")
        .select(
          `
          *,
          profiles(full_name)
        `
        )
        .eq("session_id", sessionId)
        .eq("message_type", "student")
        .order("timestamp");

      if (error) throw error;

      const messagesData: Message[] = (data || []).map((m) => ({
        id: m.id,
        user_id: m.student_id,
        user_name: m.profiles?.full_name || "Unknown",
        content: m.message_content,
        timestamp: m.timestamp,
        type: "message",
        likes: 0,
        is_edited: false,
      }));

      setMessages(messagesData);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const loadContributions = async (sessionId: string) => {
    try {
      // For now, we'll simulate contributions from session data
      // In a real implementation, you'd have a contributions table
      const contributionsData: Contribution[] = [
        {
          id: "1",
          user_id: studentId,
          user_name: "You",
          content: "I think we should start by analyzing the problem statement",
          type: "idea",
          timestamp: new Date().toISOString(),
          votes: 3,
          status: "approved",
        },
      ];
      setContributions(contributionsData);
    } catch (error) {
      console.error("Error loading contributions:", error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`collaborative-${activityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collaborative_participants",
          filter: `session_id=eq.${session?.id}`,
        },
        () => {
          if (session) loadParticipants(session.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_chat_conversations",
          filter: `session_id=eq.${session?.id}`,
        },
        () => {
          if (session) loadMessages(session.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const joinSession = async () => {
    if (!session) return;

    try {
      await supabase.from("collaborative_participants").upsert({
        session_id: session.id,
        student_id: studentId,
        contributions: {},
      });

      loadParticipants(session.id);
    } catch (error) {
      console.error("Error joining session:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !session) return;

    try {
      await supabase.from("ai_chat_conversations").insert({
        student_id: studentId,
        activity_id: activityId,
        session_id: session.id,
        message_type: "student",
        message_content: newMessage,
        learning_objectives_addressed: [],
        concepts_identified: [],
        confidence_score: 0.0,
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const addContribution = async () => {
    if (!newContribution.trim() || !session) return;

    try {
      // In a real implementation, you'd insert into a contributions table
      const newContrib: Contribution = {
        id: Date.now().toString(),
        user_id: studentId,
        user_name: "You",
        content: newContribution,
        type: contributionType,
        timestamp: new Date().toISOString(),
        votes: 0,
        status: "pending",
      };

      setContributions((prev) => [...prev, newContrib]);
      setNewContribution("");
    } catch (error) {
      console.error("Error adding contribution:", error);
    }
  };

  const voteContribution = (contributionId: string) => {
    setContributions((prev) =>
      prev.map((c) =>
        c.id === contributionId ? { ...c, votes: c.votes + 1 } : c
      )
    );
  };

  const completeActivity = () => {
    const points = participants.length * 10 + contributions.length * 5;
    onComplete(points);
  };

  if (!session) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Loading collaborative session...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {session.session_name}
              </CardTitle>
              <CardDescription>
                {session.activities?.title} - Collaborative Activity
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {participants.length} participants
              </Badge>
              <Button onClick={joinSession} size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Join
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Activity Area */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="discussion" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
              <TabsTrigger value="contributions">Contributions</TabsTrigger>
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
            </TabsList>

            <TabsContent value="discussion" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Group Discussion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Messages */}
                    <div className="h-64 overflow-y-auto space-y-3">
                      {messages.map((message) => (
                        <div key={message.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.user_name} />
                            <AvatarFallback>
                              {message.user_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {message.user_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(
                                  message.timestamp
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{message.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                {message.likes}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Message Input */}
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Share your thoughts with the group..."
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      />
                      <Button onClick={sendMessage} size="sm">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contributions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Group Contributions</CardTitle>
                  <CardDescription>
                    Share ideas, solutions, and feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Add Contribution */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={contributionType}
                          onChange={(e) =>
                            setContributionType(e.target.value as any)
                          }
                          className="px-3 py-2 border rounded-md"
                        >
                          <option value="idea">Idea</option>
                          <option value="solution">Solution</option>
                          <option value="question">Question</option>
                          <option value="feedback">Feedback</option>
                        </select>
                        <Input
                          value={newContribution}
                          onChange={(e) => setNewContribution(e.target.value)}
                          placeholder="Share your contribution..."
                        />
                        <Button onClick={addContribution} size="sm">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Contributions List */}
                    <div className="space-y-3">
                      {contributions.map((contribution) => (
                        <div
                          key={contribution.id}
                          className="border rounded-lg p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {contribution.type}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {contribution.user_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(
                                    contribution.timestamp
                                  ).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm">{contribution.content}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  voteContribution(contribution.id)
                                }
                                className="h-6 w-6 p-0"
                              >
                                <Heart className="h-3 w-3" />
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                {contribution.votes}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workspace" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Collaborative Workspace</CardTitle>
                  <CardDescription>
                    Work together on shared documents and resources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 border rounded-lg flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Shared workspace coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback>{participant.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{participant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {participant.contributions} contributions
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Work together to complete this collaborative activity. Share
                ideas, ask questions, and build on each other's contributions.
                The goal is to learn from each other and create something better
                together.
              </p>
            </CardContent>
          </Card>

          {/* Complete Activity */}
          <Card>
            <CardContent className="pt-6">
              <Button onClick={completeActivity} className="w-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Activity
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
