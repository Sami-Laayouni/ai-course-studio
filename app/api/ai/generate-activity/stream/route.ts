import { NextRequest } from "next/server";
import genAI from "@/lib/genai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      function send(event: string, data: any) {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }

      try {
        const body = await request.json();
        const {
          freeform_prompt = "",
          lesson_context = {},
          learning_objectives = [],
          custom_requirements = "",
          maxIterations = 3,
          temperature = 0.7,
        } = body || {};

        send("start", { message: "Agent started" });

        const initialPrompt = buildAgenticPrompt(
          freeform_prompt,
          lesson_context,
          learning_objectives
        );

        send("prompt", { initialPromptLength: initialPrompt.length });

        const firstText = await generateTextFromGenAI(
          initialPrompt,
          temperature
        );
        let currentJson = safeParseJson(firstText);
        send("draft", { preview: truncate(firstText, 800), code: firstText });

        for (let i = 0; i < Math.max(1, maxIterations); i++) {
          const validation = validateActivityJson(
            currentJson,
            learning_objectives,
            custom_requirements
          );
          send("validate", { ok: validation.ok, issues: validation.issues });
          if (validation.ok) break;

          const critique = await critiqueActivity(
            currentJson,
            validation.issues,
            freeform_prompt,
            lesson_context,
            learning_objectives,
            custom_requirements
          );
          send("critique", { text: truncate(critique, 1000) });

          const refinedText = await refineActivity(currentJson, critique);
          const parsed = safeParseJson(refinedText);
          if (parsed) currentJson = parsed;
          send("refine", {
            preview: truncate(JSON.stringify(currentJson), 800),
            code: JSON.stringify(currentJson),
          });
        }

        const normalized = normalizeForPreview(currentJson, freeform_prompt);
        send("final", { ...normalized, code: JSON.stringify(normalized) });
        controller.close();
      } catch (error: any) {
        send("error", { message: error?.message || "Unknown error" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function generateTextFromGenAI(
  prompt: string,
  temperature: number
): Promise<string> {
  const { ai, getModelName } = await import("@/lib/ai-config");
  const response = await ai.models.generateContent({
    model: getModelName(),
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  // @ts-ignore outputText for SDKs that support it
  if (typeof (response as any).outputText === "function") {
    // @ts-ignore
    return (response as any).outputText();
  }

  const candidate = (response as any)?.response?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const text = parts
    .map((p: any) => p.text)
    .filter(Boolean)
    .join("\n");
  return text || "";
}

function buildAgenticPrompt(
  freeformPrompt: string,
  lessonContext: any,
  learningObjectives: string[]
): string {
  return `You are an expert instructional designer and full-stack learning activity architect.

Teacher Request (verbatim): ${freeformPrompt}

Lesson Context (optional):
- Subject: ${lessonContext?.subject || ""}
- Grade Level: ${lessonContext?.grade_level || ""}
- Lesson Title: ${lessonContext?.title || ""}
- Learning Objectives: ${(learningObjectives || []).join(", ")}

STRICT OUTPUT FORMAT: Return ONLY a complete React (TypeScript preferred) component that renders the learning activity. Requirements:
- Single default export functional component
- Use ONLY React import; do NOT import project components
- Include minimal inline styles or plain HTML/CSS classes; no external CSS
- Must be self-contained and runnable as-is
- Support interactive patterns if requested (diagram nodes/edges, fill-in-the-blank, steps)
- Include basic state, validation, and a simple onComplete callback prop
- Title, description, and clear student-facing instructions must be present and non-empty

Example skeleton:
\`\`\`tsx
import React, { useState } from 'react';

type Props = { onComplete?: (score: number, time: number) => void };

export default function GeneratedActivity({ onComplete }: Props) {
  const [startTime] = useState<number>(Date.now());
  // local state here
  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h2>Title here</h2>
      <p>Description here</p>
      <div>Instructions here</div>
      {/* interactive UI here */}
    </div>
  );
}
\`\`\`
Return ONLY the component source code.`;
}

function safeParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return {
      title: "Custom Activity",
      description: typeof text === "string" ? text : "",
      content: { instructions: typeof text === "string" ? text : "" },
      code: text, // Store the raw code
    };
  }
}

function validateActivityJson(
  json: any,
  objectives: string[] = [],
  constraints: string = ""
): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!json || typeof json !== "object") {
    issues.push("Output is not valid JSON object");
    return { ok: false, issues };
  }
  if (!json.title || typeof json.title !== "string")
    issues.push("Missing title");
  if (!json.description || typeof json.description !== "string")
    issues.push("Missing description");
  if (!json.content || typeof json.content !== "object")
    issues.push("Missing content object");
  if (json.content && !json.content.instructions)
    issues.push("Missing content.instructions");
  if (typeof json.estimated_duration !== "number")
    issues.push("Missing estimated_duration (number)");
  if (typeof json.points !== "number") issues.push("Missing points (number)");
  if (typeof json.difficulty !== "number")
    issues.push("Missing difficulty (1-5)");
  return { ok: issues.length === 0, issues };
}

async function critiqueActivity(
  currentJson: any,
  issues: string[],
  freeformPrompt: string,
  lessonContext: any,
  objectives: string[],
  constraints: string
): Promise<string> {
  const critiquePrompt = `You are a rigorous instructional design reviewer. Given the current JSON activity and the teacher request, identify concrete fixes.\n\nTeacher Request: ${freeformPrompt}\nLesson Context: ${JSON.stringify(
    lessonContext
  )}\nLearning Objectives: ${(objectives || []).join(
    ", "
  )}\nCustom Requirements: ${constraints}\n\nCurrent Activity JSON:\n${JSON.stringify(
    currentJson
  )}\n\nValidation Issues:\n${issues
    .map((i) => `- ${i}`)
    .join(
      "\n"
    )}\n\nOutput a concise list of actionable corrections as bullet points.`;

  const text = await generateTextFromGenAI(critiquePrompt, 0.2);
  return text;
}

async function refineActivity(
  currentJson: any,
  critique: string
): Promise<string> {
  const refinePrompt = `You are improving a JSON activity by applying reviewer feedback.\n\nCurrent JSON:\n${JSON.stringify(
    currentJson
  )}\n\nReviewer Feedback (bullet points):\n${critique}\n\nReturn ONLY corrected JSON, valid and complete.`;

  const text = await generateTextFromGenAI(refinePrompt, 0.4);
  return text;
}

function normalizeForPreview(activity: any, fallbackPrompt: string) {
  if (
    activity &&
    activity.content &&
    (activity.title || activity.description)
  ) {
    return activity;
  }
  if (activity && activity.id && activity.name && !activity.content) {
    return {
      title: activity.name || "Custom Activity",
      description: activity.description || "",
      content: {
        instructions:
          activity.description ||
          (typeof fallbackPrompt === "string"
            ? `Generated from request: ${fallbackPrompt}`
            : "Follow the activity instructions."),
        mode: activity.category || "interactive",
      },
    };
  }
  if (typeof activity === "string") {
    return {
      title: "Custom Activity",
      description: activity.slice(0, 140),
      content: { instructions: activity },
    };
  }
  const textBlob = JSON.stringify(activity || {});
  return {
    title: activity?.title || "Custom Activity",
    description: activity?.description || textBlob.slice(0, 140),
    content: activity?.content || { instructions: textBlob },
  };
}
