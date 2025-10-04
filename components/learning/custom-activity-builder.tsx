"use client";

import type React from "react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, Wand2, Loader2, Eye, Check } from "lucide-react";

interface CustomActivityBuilderProps {
  onActivityCreated: (activity: any) => void;
  onClose: () => void;
  courseId?: string;
  lessonId?: string;
}

export default function CustomActivityBuilder({
  onActivityCreated,
  onClose,
  courseId,
  lessonId,
}: CustomActivityBuilderProps) {
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<any | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleGenerateActivity = async () => {
    if (!description.trim()) {
      setError("Please describe the activity you want to create");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerated(null);

    try {
      const response = await fetch("/api/ai/generate-activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          freeform_prompt: description,
          lesson_context: {},
          learning_objectives: [],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGenerated(data.content);
      } else {
        setError(data.error || "Failed to generate activity");
      }
    } catch (error) {
      setError("An error occurred while generating the activity");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!generated) return;
    setIsPublishing(true);
    setError(null);
    try {
      // If we have course/lesson identifiers, persist via API; else, pass up via callback
      if (courseId && lessonId) {
        const res = await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: generated.title || "Custom Activity",
            description: generated.description || description,
            content: generated,
            course_id: courseId,
            lesson_id: lessonId,
            points: generated.points ?? 20,
            estimated_duration: generated.estimated_duration ?? 15,
            activity_type: "custom",
            activity_subtype: generated.content?.mode || "custom",
            is_enhanced: true,
          }),
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to publish activity");
        }
        onActivityCreated(payload.activity);
        onClose();
      } else {
        onActivityCreated({
          type: "custom",
          title: generated.title || "Custom Activity",
          description: generated.description || description,
          content: generated,
          estimated_duration: generated.estimated_duration ?? 15,
          points: generated.points ?? 20,
        });
        onClose();
      }
    } catch (e: any) {
      setError(e?.message || "Failed to publish activity");
    } finally {
      setIsPublishing(false);
    }
  };

  const renderPreview = () => {
    if (!generated) return null;
    const content = generated?.content || {};
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{generated.title}</h3>
          <p className="text-sm text-muted-foreground">{generated.description}</p>
        </div>
        {content.instructions && (
          <div>
            <h4 className="font-medium mb-1">Instructions</h4>
            <p className="text-sm whitespace-pre-wrap">{content.instructions}</p>
          </div>
        )}
        {content.mode && (
          <div className="text-sm"><span className="font-medium">Mode:</span> {content.mode}</div>
        )}
        {content.diagram && (
          <div className="p-3 border rounded-md">
            <h4 className="font-medium mb-2">Diagram</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="font-medium mb-1">Nodes</div>
                <ul className="list-disc ml-4">
                  {(content.diagram.nodes || []).map((n: any) => (
                    <li key={n.id}>{n.label}{n.isBlank ? " (blank)" : ""}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-medium mb-1">Blanks</div>
                <ul className="list-disc ml-4">
                  {(content.diagram.blanks || []).map((b: any, idx: number) => (
                    <li key={idx}>node {b.nodeId}: answer "{b.answer}"{b.hint ? ` (hint: ${b.hint})` : ""}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        {Array.isArray(content.steps) && content.steps.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Steps</h4>
            <ol className="list-decimal ml-5 text-sm space-y-1">
              {content.steps.map((s: any, i: number) => (
                <li key={i}><span className="font-medium">{s.title || `Step ${i+1}`}:</span> {s.text}</li>
              ))}
            </ol>
          </div>
        )}
        {Array.isArray(content.prompts) && content.prompts.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Prompts</h4>
            <ul className="list-disc ml-5 text-sm space-y-1">
              {content.prompts.map((p: any, i: number) => (
                <li key={i}>{p.question}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Custom Activity Builder
          </CardTitle>
          <CardDescription>
            Describe what you want your students to do, and AI will create the
            activity for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description">Describe the activity you want</Label>
            <Textarea
              id="description"
              placeholder="e.g., 'Create a diagram of the carbon cycle where students must fill in the missing labels for processes and reservoirs'"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
            />
            <p className="text-sm text-muted-foreground">
              Be specific. Include the topic, modality (diagram, drag-drop, steps), constraints, and any required answers.
            </p>
          </div>

          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleGenerateActivity}
              disabled={isGenerating || !description.trim()}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Preview
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>

          {generated && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" /> Preview
              </div>
              {renderPreview()}
              <div className="flex gap-3">
                <Button onClick={handlePublish} disabled={isPublishing}>
                  {isPublishing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Publish Activity
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleGenerateActivity} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Regenerating...
                    </>
                  ) : (
                    "Regenerate"
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Examples of good descriptions:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • "Create a timeline of major events in World War II with dates
                and brief descriptions"
              </li>
              <li>
                • "Design a simple machine using everyday materials and explain
                how it works"
              </li>
              <li>
                • "Write a short story from the perspective of a character in
                the book we just read"
              </li>
              <li>
                • "Conduct an experiment to test which materials are magnetic
                and record your findings"
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
