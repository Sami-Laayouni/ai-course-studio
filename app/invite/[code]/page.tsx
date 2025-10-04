"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  BookOpen,
  Star,
  Calendar,
  ArrowRight,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

interface InviteDetails {
  id: string;
  code: string;
  type: "course" | "lesson" | "activity";
  target_id: string;
  target: {
    id: string;
    title: string;
    description?: string;
    subject?: string;
    grade_level?: string;
    teacher_name?: string;
    learning_objectives?: string[];
    estimated_duration?: number;
  };
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
  settings: any;
}

export default function InvitePage({ params }: InvitePageProps) {
  const [inviteCode, setInviteCode] = useState<string>("");
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setInviteCode(resolvedParams.code);
      await loadInviteDetails(resolvedParams.code);
    };
    loadParams();
  }, [params]);

  const loadInviteDetails = async (code: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/invites/${code}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setInviteDetails(data.invite);
      }
    } catch (error) {
      console.error("Error loading invite:", error);
      setError("Failed to load invite details");
    } finally {
      setIsLoading(false);
    }
  };

  const joinInvite = async () => {
    if (!inviteDetails) return;

    try {
      setIsJoining(true);
      const response = await fetch(`/api/invites/${inviteCode}`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(true);
        // Redirect after a short delay
        setTimeout(() => {
          if (inviteDetails.type === "course") {
            router.push(`/learn/courses/${inviteDetails.target_id}`);
          } else if (inviteDetails.type === "lesson") {
            router.push(
              `/learn/courses/${inviteDetails.target.course_id}/lessons/${inviteDetails.target_id}`
            );
          } else {
            router.push(`/learn/activities/${inviteDetails.target_id}`);
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Error joining invite:", error);
      setError("Failed to join. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "course":
        return <BookOpen className="h-6 w-6" />;
      case "lesson":
        return <Calendar className="h-6 w-6" />;
      case "activity":
        return <Star className="h-6 w-6" />;
      default:
        return <BookOpen className="h-6 w-6" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "course":
        return "text-blue-600";
      case "lesson":
        return "text-green-600";
      case "activity":
        return "text-purple-600";
      default:
        return "text-blue-600";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isMaxUsesReached = (maxUses: number | null, usesCount: number) => {
    if (!maxUses) return false;
    return usesCount >= maxUses;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invite details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invite</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push("/")}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inviteDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invite Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This invite link is invalid or has been removed.
            </p>
            <Button onClick={() => router.push("/")}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isInviteValid =
    inviteDetails.is_active &&
    !isExpired(inviteDetails.expires_at) &&
    !isMaxUsesReached(inviteDetails.max_uses, inviteDetails.uses_count);

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Successfully Joined!</h2>
            <p className="text-muted-foreground mb-4">
              You have been added to {inviteDetails.target.title}.
              Redirecting...
            </p>
            <div className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">
                Redirecting...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">You're Invited!</h1>
          <p className="text-muted-foreground">
            Join this {inviteDetails.type} and start learning
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Invite Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className={getTypeColor(inviteDetails.type)}>
                  {getTypeIcon(inviteDetails.type)}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {inviteDetails.target.title}
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {inviteDetails.type} Invitation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {inviteDetails.target.description && (
                <p className="text-muted-foreground">
                  {inviteDetails.target.description}
                </p>
              )}

              <div className="space-y-3">
                {inviteDetails.target.subject && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Subject:</strong> {inviteDetails.target.subject}
                    </span>
                  </div>
                )}

                {inviteDetails.target.grade_level && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Grade Level:</strong>{" "}
                      {inviteDetails.target.grade_level}
                    </span>
                  </div>
                )}

                {inviteDetails.target.teacher_name && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Teacher:</strong>{" "}
                      {inviteDetails.target.teacher_name}
                    </span>
                  </div>
                )}

                {inviteDetails.target.estimated_duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Duration:</strong>{" "}
                      {inviteDetails.target.estimated_duration} minutes
                    </span>
                  </div>
                )}
              </div>

              {inviteDetails.target.learning_objectives &&
                inviteDetails.target.learning_objectives.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Learning Objectives:</h4>
                    <ul className="space-y-1">
                      {inviteDetails.target.learning_objectives.map(
                        (objective, index) => (
                          <li
                            key={index}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-primary">•</span>
                            {objective}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Join Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Join Now</CardTitle>
                <CardDescription>
                  Click the button below to join this {inviteDetails.type}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isInviteValid && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {!inviteDetails.is_active &&
                        "This invite is no longer active."}
                      {isExpired(inviteDetails.expires_at) &&
                        "This invite has expired."}
                      {isMaxUsesReached(
                        inviteDetails.max_uses,
                        inviteDetails.uses_count
                      ) &&
                        "This invite has reached its maximum number of uses."}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uses:</span>
                    <span>
                      {inviteDetails.uses_count} /{" "}
                      {inviteDetails.max_uses || "∞"}
                    </span>
                  </div>

                  {inviteDetails.expires_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Expires:</span>
                      <span
                        className={
                          isExpired(inviteDetails.expires_at)
                            ? "text-red-600"
                            : ""
                        }
                      >
                        {formatDate(inviteDetails.expires_at)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDate(inviteDetails.created_at)}</span>
                  </div>
                </div>

                <Button
                  onClick={joinInvite}
                  disabled={!isInviteValid || isJoining}
                  className="w-full"
                  size="lg"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Join{" "}
                      {inviteDetails.type.charAt(0).toUpperCase() +
                        inviteDetails.type.slice(1)}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => router.push("/")}
                    className="text-muted-foreground"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Go to Home Instead
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Invite Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About This Invite</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {inviteDetails.code}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Invite Code
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">
                  This invite was created by a teacher to help you join their{" "}
                  {inviteDetails.type}. Once you join, you'll have access to all
                  the content and activities.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
