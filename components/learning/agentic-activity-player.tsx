"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface AgenticActivityPlayerProps {
  activity: any;
  onComplete?: (score?: number, timeSpent?: number) => void;
}

export default function AgenticActivityPlayer({
  activity,
  onComplete,
}: AgenticActivityPlayerProps) {
  const content = activity?.content || {};
  const mode = content?.mode || "mixed";
  const [startTime] = useState<number>(Date.now());
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps = Array.isArray(content.steps) ? content.steps : [];
  const prompts = Array.isArray(content.prompts) ? content.prompts : [];
  const diagram = content.diagram || null;

  const blanks = useMemo(() => diagram?.blanks || [], [diagram]);

  const handleBlankChange = (nodeId: string, value: string) => {
    setResponses((prev) => ({ ...prev, ["blank_" + nodeId]: value }));
  };

  const handlePromptChange = (index: number, value: string) => {
    setResponses((prev) => ({ ...prev, ["prompt_" + index]: value }));
  };

  const handleComplete = () => {
    let score = 0;
    let possible = 0;
    if (Array.isArray(blanks) && blanks.length > 0) {
      for (const b of blanks) {
        possible += 1;
        const userVal = (responses["blank_" + b.nodeId] || "")
          .trim()
          .toLowerCase();
        const correct = String(b.answer || "")
          .trim()
          .toLowerCase();
        if (userVal && correct && userVal === correct) score += 1;
      }
    }
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    if (onComplete)
      onComplete(
        possible > 0 ? Math.round((score / possible) * 100) : 0,
        timeSpent
      );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold">
            {activity?.title || "Activity"}
          </h2>
          {activity?.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {activity.description}
            </p>
          )}
          {content?.instructions && (
            <div className="mt-4 p-3 rounded-md bg-muted">
              <div className="font-medium mb-1">Instructions</div>
              <p className="text-sm whitespace-pre-wrap">
                {content.instructions}
              </p>
            </div>
          )}
          <div className="mt-2 text-xs text-muted-foreground">Mode: {mode}</div>
        </CardContent>
      </Card>

      {/* Diagram Fill-In */}
      {diagram && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="font-medium">Diagram</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-1">Nodes</div>
                <ul className="list-disc ml-5 text-sm">
                  {(diagram.nodes || []).map((n: any) => (
                    <li key={n.id}>
                      {n.label}
                      {n.isBlank ? " (blank)" : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Blanks</div>
                <div className="space-y-2">
                  {(diagram.blanks || []).map((b: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        node {b.nodeId}
                      </span>
                      <Input
                        value={responses["blank_" + b.nodeId] || ""}
                        onChange={(e) =>
                          handleBlankChange(b.nodeId, e.target.value)
                        }
                        placeholder={b.hint ? `Hint: ${b.hint}` : "Fill in"}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guided Steps */}
      {steps.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Steps</div>
              <div className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted">
              <div className="font-medium">
                {steps[currentStep]?.title || `Step ${currentStep + 1}`}
              </div>
              <p className="text-sm mt-1">{steps[currentStep]?.text}</p>
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
                }
                disabled={currentStep >= steps.length - 1}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompts */}
      {prompts.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="font-medium">Questions</div>
            {prompts.map((p: any, idx: number) => (
              <div key={idx} className="space-y-2">
                <div className="text-sm font-medium">{p.question}</div>
                <Textarea
                  rows={3}
                  value={responses["prompt_" + idx] || ""}
                  onChange={(e) => handlePromptChange(idx, e.target.value)}
                  placeholder="Type your response"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleComplete}>
          <CheckCircle className="h-4 w-4 mr-2" /> Submit
        </Button>
      </div>
    </div>
  );
}
