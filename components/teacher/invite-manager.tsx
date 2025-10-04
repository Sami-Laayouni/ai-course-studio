"use client";

import React, { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  ExternalLink,
  Calendar,
  Users,
  Settings,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Link as LinkIcon,
  QrCode,
} from "lucide-react";

interface InviteLink {
  id: string;
  code: string;
  type: "course" | "lesson" | "activity";
  target_id: string;
  target_title: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
  settings: any;
}

interface InviteManagerProps {
  courseId: string;
  onInviteCreated?: (invite: InviteLink) => void;
}

export default function InviteManager({
  courseId,
  onInviteCreated,
}: InviteManagerProps) {
  const [invites, setInvites] = useState<InviteLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingInvite, setEditingInvite] = useState<InviteLink | null>(null);
  const [showQrCode, setShowQrCode] = useState<string | null>(null);

  // Form state
  const [inviteType, setInviteType] = useState<
    "course" | "lesson" | "activity"
  >("course");
  const [targetId, setTargetId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [autoEnroll, setAutoEnroll] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);

  useEffect(() => {
    loadInvites();
  }, [courseId]);

  const loadInvites = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/invites?target_id=${courseId}`);
      const data = await response.json();

      if (data.invites) {
        setInvites(data.invites);
      }
    } catch (error) {
      console.error("Error loading invites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createInvite = async () => {
    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: inviteType,
          target_id: targetId || courseId,
          expires_at: expiresAt || null,
          max_uses: maxUses,
          settings: {
            auto_enroll: autoEnroll,
            require_approval: requireApproval,
          },
        }),
      });

      const data = await response.json();

      if (data.invite) {
        setInvites((prev) => [data.invite, ...prev]);
        setShowCreateDialog(false);
        onInviteCreated?.(data.invite);
        resetForm();
      }
    } catch (error) {
      console.error("Error creating invite:", error);
    }
  };

  const updateInvite = async (
    inviteId: string,
    updates: Partial<InviteLink>
  ) => {
    try {
      const response = await fetch(`/api/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setInvites((prev) =>
          prev.map((invite) =>
            invite.id === inviteId ? { ...invite, ...updates } : invite
          )
        );
      }
    } catch (error) {
      console.error("Error updating invite:", error);
    }
  };

  const deleteInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/invites/${inviteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
      }
    } catch (error) {
      console.error("Error deleting invite:", error);
    }
  };

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
  };

  const generateQrCode = (code: string) => {
    const link = `${window.location.origin}/invite/${code}`;
    setShowQrCode(link);
  };

  const resetForm = () => {
    setInviteType("course");
    setTargetId("");
    setExpiresAt("");
    setMaxUses(null);
    setAutoEnroll(true);
    setRequireApproval(false);
  };

  const getInviteStatus = (invite: InviteLink) => {
    if (!invite.is_active) return { status: "inactive", color: "bg-gray-500" };
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return { status: "expired", color: "bg-red-500" };
    }
    if (invite.max_uses && invite.uses_count >= invite.max_uses) {
      return { status: "max_uses", color: "bg-orange-500" };
    }
    return { status: "active", color: "bg-green-500" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invite Links</h2>
          <p className="text-muted-foreground">
            Create and manage invite links for your course
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invite
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Invite Link</DialogTitle>
              <DialogDescription>
                Generate a shareable link for students to join your course
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-type">Invite Type</Label>
                <Select
                  value={inviteType}
                  onValueChange={(value: any) => setInviteType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">Entire Course</SelectItem>
                    <SelectItem value="lesson">Specific Lesson</SelectItem>
                    <SelectItem value="activity">Specific Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expires-at">Expires At (Optional)</Label>
                <Input
                  id="expires-at"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="max-uses">Max Uses (Optional)</Label>
                <Input
                  id="max-uses"
                  type="number"
                  value={maxUses || ""}
                  onChange={(e) =>
                    setMaxUses(e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="Unlimited"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="auto-enroll"
                    checked={autoEnroll}
                    onChange={(e) => setAutoEnroll(e.target.checked)}
                  />
                  <Label htmlFor="auto-enroll">Auto-enroll students</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="require-approval"
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                  />
                  <Label htmlFor="require-approval">Require approval</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createInvite}>Create Invite</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invites List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading invites...</div>
        ) : invites.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No invite links yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first invite link to start sharing your course
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Invite
              </Button>
            </CardContent>
          </Card>
        ) : (
          invites.map((invite) => {
            const status = getInviteStatus(invite);
            return (
              <Card key={invite.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{invite.type}</Badge>
                        <div
                          className={`w-2 h-2 rounded-full ${status.color}`}
                        />
                        <span className="text-sm text-muted-foreground capitalize">
                          {status.status}
                        </span>
                      </div>

                      <h3 className="font-medium mb-1">
                        {invite.target_title}
                      </h3>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {invite.uses_count} uses
                          {invite.max_uses && ` / ${invite.max_uses}`}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Created {formatDate(invite.created_at)}
                        </div>
                        {invite.expires_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires {formatDate(invite.expires_at)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          value={`${window.location.origin}/invite/${invite.code}`}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyInviteLink(invite.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateQrCode(invite.code)}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingInvite(invite)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateInvite(invite.id, {
                            is_active: !invite.is_active,
                          })
                        }
                      >
                        {invite.is_active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteInvite(invite.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* QR Code Modal */}
      {showQrCode && (
        <Dialog open={!!showQrCode} onOpenChange={() => setShowQrCode(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>QR Code</DialogTitle>
              <DialogDescription>
                Share this QR code for easy access to your invite link
              </DialogDescription>
            </DialogHeader>
            <div className="text-center">
              <div className="w-64 h-64 mx-auto bg-muted rounded-lg flex items-center justify-center">
                <QrCode className="h-32 w-32 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mt-4">{showQrCode}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
