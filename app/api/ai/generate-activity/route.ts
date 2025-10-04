import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import genAI from "@/lib/genai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      activity_type,
      activity_subtype,
      lesson_context,
      learning_objectives,
      custom_requirements,
      freeform_prompt,
    } = body;

    // Optional: return a React component instead of JSON
    const formatParam = request.nextUrl.searchParams.get("format");
    const rawParam = request.nextUrl.searchParams.get("raw");
    const return_format = (formatParam || body?.format || "").toLowerCase();

    // Debug: enabled by default (disable with ?debug=0)
    const debugParam = request.nextUrl.searchParams.get("debug");
    const debug = debugParam !== "0";
    if (debug) {
      console.log("[generate-activity] incoming body:", JSON.stringify(body));
    }

    // Verify user authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If React component requested (freeform or typed)
    if (
      return_format === "react" ||
      return_format === "react_component" ||
      return_format === "tsx"
    ) {
      if (debug)
        console.log("[generate-activity] react component mode enabled");

      const prompt = freeform_prompt
        ? buildReactComponentPromptFreeform(
            freeform_prompt,
            lesson_context,
            learning_objectives || [],
            custom_requirements || ""
          )
        : buildReactComponentPromptTyped(
            activity_type,
            activity_subtype,
            lesson_context,
            learning_objectives || [],
            custom_requirements || ""
          );

      if (debug)
        console.log(
          "[generate-activity] react component prompt len:",
          prompt.length
        );

      let codeRaw = "";
      try {
        codeRaw = await generateTextFromGenAI(prompt, 0.5);
      } catch (e) {
        console.error(
          "[generate-activity][ERROR] Error generating code (LLM):",
          e
        );
        throw new Error("ERROR GENERATING CODE: model request failed");
      }

      const sanitized = sanitizeModelCodeOutput(codeRaw);
      const { code, warnings } = validateAndFixTSX(sanitized);

      if (debug && warnings.length > 0) {
        console.warn("[generate-activity] TSX validation warnings:", warnings);
      }

      await supabase.from("ai_content_history").insert({
        teacher_id: user.id,
        prompt,
        generated_content: {
          code,
          meta: { mode: freeform_prompt ? "freeform" : "typed" },
        },
        content_type: "activity_react_component",
        model_used: "gemini-2.0-flash-lite",
      });

      const title =
        lesson_context?.title ||
        `${activity_type || "Custom"} Activity Component`;
      const description =
        "A generated interactive learning activity as a React component.";

      // If caller wants raw TSX, return as text/plain
      const wantsRaw =
        rawParam === "1" ||
        rawParam === "true" ||
        return_format === "react_raw";
      if (wantsRaw) {
        return new NextResponse(code, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      return NextResponse.json(
        {
          code,
          title,
          description,
          format: "react_component",
          debug: debug
            ? {
                promptSnippet: prompt.slice(0, 600),
                preview: code.slice(0, 600),
              }
            : undefined,
        },
        { status: 200 }
      );
    }

    // Agentic path for freeform custom activities (JSON)
    if (freeform_prompt) {
      if (debug) console.log("[generate-activity] freeform mode enabled");
      const agent = await runAgenticActivityCreation({
        freeformPrompt: freeform_prompt,
        lessonContext: lesson_context,
        learningObjectives: learning_objectives || [],
        constraints: custom_requirements || "",
        modelTemperature: 0.7,
        maxIterations: 3,
      });

      if (debug) {
        console.log(
          "[generate-activity] agent initialPrompt len:",
          agent.initialPrompt?.length
        );
        console.log(
          "[generate-activity] agent trace steps:",
          agent.trace?.map((t: any) => t.step)
        );
        console.log(
          "[generate-activity] agent final activity keys:",
          Object.keys(agent.activity || {})
        );
      }

      await supabase.from("ai_content_history").insert({
        teacher_id: user.id,
        prompt: agent.initialPrompt,
        generated_content: agent.activity,
        content_type: "activity_custom_freeform",
        model_used: "gemini-2.0-flash-lite",
      });

      const normalized = normalizeForPreview(agent.activity, freeform_prompt);
      if (debug)
        console.log(
          "[generate-activity] normalized (freeform):",
          JSON.stringify(normalized).slice(0, 1000)
        );
      return NextResponse.json({
        content: normalized.content,
        title: normalized.title,
        description: normalized.description,
        debug: debug
          ? {
              agentTrace: agent.trace,
              initialPrompt: agent.initialPrompt,
              normalized,
            }
          : undefined,
      });
    }

    // Typed activity generation
    const prompt = buildActivityPrompt(
      activity_type,
      activity_subtype,
      lesson_context,
      learning_objectives,
      custom_requirements
    );

    if (debug)
      console.log("[generate-activity] typed mode prompt len:", prompt.length);
    const text = await generateTextFromGenAI(prompt, 0.7);
    if (debug)
      console.log(
        "[generate-activity] raw model text (first 1000):",
        String(text).slice(0, 1000)
      );

    let generatedContent;
    try {
      generatedContent = JSON.parse(text);
    } catch {
      generatedContent = {
        title: `${activity_type} Activity`,
        description: text,
        content: { instructions: text },
      };
    }

    await supabase.from("ai_content_history").insert({
      teacher_id: user.id,
      prompt: prompt,
      generated_content: generatedContent,
      content_type: `activity_${activity_type}`,
      model_used: "gemini-2.0-flash-lite",
    });

    const normalized = normalizeForPreview(generatedContent, prompt);
    if (debug)
      console.log(
        "[generate-activity] normalized (typed):",
        JSON.stringify(normalized).slice(0, 1000)
      );
    return NextResponse.json({
      content: normalized.content,
      title: normalized.title,
      description: normalized.description,
      debug: debug ? { normalized, rawText: text } : undefined,
    });
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error("[generate-activity][ERROR]", message);
    console.error("[generate-activity][ALARM] ERROR GENERATING CODE");
    return NextResponse.json(
      { error: "ERROR GENERATING CODE", details: message },
      { status: 500 }
    );
  }
}

// ===== React Component generation helpers =====
function buildReactComponentPromptFreeform(
  freeformPrompt: string,
  lessonContext: any,
  learningObjectives: string[],
  customRequirements: string
): string {
  return `You are a senior React/TypeScript educational UI engineer and instructional designer.

Goal: Generate a single, production-ready React component (TSX) that renders an interactive learning activity.

Teacher Request: ${freeformPrompt}
Lesson Context:
- Subject: ${lessonContext?.subject || ""}
- Grade Level: ${lessonContext?.grade_level || ""}
- Lesson Title: ${lessonContext?.title || ""}
- Learning Objectives: ${(learningObjectives || []).join(", ")}
- Custom Requirements: ${customRequirements || "None"}

Strict requirements:
- Output ONLY a single complete TSX component in one fenced code block with language tsx.
- The default export must be a functional component named ActivityComponent.
- No external network calls. Use in-memory mock data where needed.
- Use React hooks as appropriate. No dependencies beyond React and shadcn/ui primitives (Button, Card) if used, but assume they exist via relative imports placeholders and keep them optional.
- Accept props: { onComplete?: (result: any) => void } and call it when activity finishes.
- Be accessible (labels, roles, keyboard navigation) and responsive.
- Do not include markdown or extra commentary outside the code block.

Example prop typing to copy:
type ActivityProps = { onComplete?: (result: any) => void };

Now produce the TSX for ActivityComponent implementing an engaging interactive activity aligned to the request.`;
}

function buildReactComponentPromptTyped(
  activityType: string,
  activitySubtype: string,
  lessonContext: any,
  learningObjectives: string[],
  customRequirements: string
): string {
  return `You are a senior React/TypeScript educational UI engineer and instructional designer.

Create a single React TSX component for an interactive activity.

Activity Type: ${activityType}
Subtype: ${activitySubtype}
Lesson Context:
- Subject: ${lessonContext?.subject}
- Grade Level: ${lessonContext?.grade_level}
- Lesson Title: ${lessonContext?.title}
- Learning Objectives: ${(learningObjectives || []).join(", ")}
- Custom Requirements: ${customRequirements || "None"}

Strict requirements:
- Output ONLY a single complete TSX component in one fenced code block with language tsx.
- The default export must be a functional component named ActivityComponent.
- Provide clear instructions in the UI.
- Include basic state, validation, and a completion event via onComplete prop.
- No network calls.

Produce the TSX now.`;
}

function sanitizeModelCodeOutput(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const fenceRegex = /```[a-zA-Z]*\n([\s\S]*?)```/m;
  const match = raw.match(fenceRegex);
  const inner = match ? match[1] : raw;
  return inner.replace(/^\uFEFF/, "").trim();
}

function validateAndFixTSX(inputCode: string): {
  code: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  let code = inputCode || "";

  if (!code) {
    warnings.push("Empty code from model");
  }

  // Ensure React import is present
  if (!/from\s+['"]react['"]/i.test(code)) {
    code = `import * as React from "react";\n` + code;
    warnings.push("Inserted React import");
  }

  // Ensure there is an ActivityComponent default export
  const hasDefaultExport =
    /export\s+default\s+function\s+ActivityComponent|export\s+default\s+ActivityComponent/.test(
      code
    );
  const hasComponentDecl =
    /function\s+ActivityComponent\s*\(|const\s+ActivityComponent\s*=\s*\(/.test(
      code
    );
  if (!hasComponentDecl) {
    code += `\n\nexport default function ActivityComponent({ onComplete }: { onComplete?: (result: any) => void }) {\n  return <div>Generated Activity</div>;\n}\n`;
    warnings.push("Inserted ActivityComponent skeleton");
  } else if (!hasDefaultExport) {
    code += `\n\nexport default ActivityComponent;\n`;
    warnings.push("Added default export for ActivityComponent");
  }

  return { code, warnings };
}

// ===== Agentic helpers =====
async function generateTextFromGenAI(
  prompt: string,
  temperature: number
): Promise<string> {
  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash-lite",
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  // Response shape: response.outputText() is available in SDK v1; otherwise extract from candidates
  // Try outputText if present
  // @ts-ignore
  if (typeof response.outputText === "function") {
    // @ts-ignore
    return response.outputText();
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

Design the BEST-POSSIBLE interactive activity that precisely satisfies the teacher's request, without forcing it into pre-defined types like quiz/video/etc. Support novel formats such as labeled diagrams with blanks to fill, drag-and-drop labeling, interactive steps, simulations, or mixed modes. If a diagram is requested (e.g., carbon cycle), produce a schema for nodes, edges, and blank fields.

STRICT OUTPUT FORMAT: Return ONLY JSON matching this schema:
{
  "title": string,
  "description": string,
  "content": {
    "instructions": string,
    "mode": string,
    "diagram"?: {
      "nodes": [{ "id": string, "label": string, "isBlank": boolean }],
      "edges": [{ "from": string, "to": string, "label"?: string }],
      "blanks": [{ "nodeId": string, "answer": string, "hint"?: string }]
    },
    "steps"?: [{ "title": string, "text": string }],
    "prompts"?: [{ "question": string, "answer"?: string, "type"?: string }],
    "assets"?: { "images"?: string[], "links"?: string[] },
    "assessment"?: {
      "rubric"?: [{ "criterion": string, "levels": [{ "name": string, "description": string }] }],
      "auto_checks"?: [{ "type": string, "config": any }]
    }
  },
  "estimated_duration": number,
  "points": number,
  "difficulty": 1 | 2 | 3 | 4 | 5,
  "is_adaptive": boolean,
  "is_collaborative": boolean
}

Ensure JSON is valid and comprehensive. Include model answers for blanks when applicable.`;
}

async function runAgenticActivityCreation(params: {
  freeformPrompt: string;
  lessonContext: any;
  learningObjectives: string[];
  constraints: string;
  modelTemperature: number;
  maxIterations: number;
}): Promise<{
  activity: any;
  trace: Array<any>;
  initialPrompt: string;
}> {
  const {
    freeformPrompt,
    lessonContext,
    learningObjectives,
    constraints,
    modelTemperature,
    maxIterations,
  } = params;

  const trace: Array<any> = [];
  const initialPrompt = buildAgenticPrompt(
    freeformPrompt,
    lessonContext,
    learningObjectives
  );

  const firstText = await generateTextFromGenAI(
    initialPrompt,
    modelTemperature
  );
  let currentJson = safeParseJson(firstText);
  trace.push({ step: "draft", output: currentJson });

  for (let i = 0; i < Math.max(1, maxIterations); i++) {
    const validation = validateActivityJson(
      currentJson,
      learningObjectives,
      constraints
    );
    if (validation.ok) {
      trace.push({ step: "validate", issues: [] });
      break;
    }

    trace.push({ step: "validate", issues: validation.issues });
    const critique = await critiqueActivity(
      currentJson,
      validation.issues,
      freeformPrompt,
      lessonContext,
      learningObjectives,
      constraints
    );
    trace.push({ step: "critique", critique });
    const refinedText = await refineActivity(currentJson, critique);
    const parsed = safeParseJson(refinedText);
    if (parsed) currentJson = parsed;
    trace.push({ step: "refine", output: currentJson });
  }

  return { activity: currentJson, trace, initialPrompt };
}

function safeParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return {
      title: "Custom Activity",
      description: typeof text === "string" ? text : "",
      content: { instructions: typeof text === "string" ? text : "" },
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

  if (objectives.length > 0) {
    const textBlob = JSON.stringify(json).toLowerCase();
    for (const obj of objectives) {
      if (!textBlob.includes(String(obj).toLowerCase())) {
        issues.push(`Objective not clearly addressed: ${obj}`);
      }
    }
  }

  if (constraints) {
    const textBlob = JSON.stringify(json).toLowerCase();
    const firstThree = constraints
      .toLowerCase()
      .split(" ")
      .slice(0, 3)
      .join(" ");
    if (firstThree && !textBlob.includes(firstThree)) {
      issues.push(
        "Constraints may not be reflected; ensure custom requirements are satisfied"
      );
    }
  }

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
  // If already in expected shape
  if (
    activity &&
    activity.content &&
    (activity.title || activity.description)
  ) {
    return activity;
  }

  // If the model returned a node-like object from a builder (id/name/category)
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

  // If it's plain text or minimal object
  if (typeof activity === "string") {
    return {
      title: "Custom Activity",
      description: activity.slice(0, 140),
      content: { instructions: activity },
    };
  }

  // Fallback normalization
  const textBlob = JSON.stringify(activity || {});
  return {
    title: activity?.title || "Custom Activity",
    description: activity?.description || textBlob.slice(0, 140),
    content: activity?.content || { instructions: textBlob },
  };
}
function buildActivityPrompt(
  activityType: string,
  activitySubtype: string,
  lessonContext: any,
  learningObjectives: string[],
  customRequirements: string
): string {
  const baseContext = `
Lesson Context:
- Subject: ${lessonContext.subject}
- Grade Level: ${lessonContext.grade_level}
- Lesson Title: ${lessonContext.title}
- Learning Objectives: ${learningObjectives.join(", ")}
- Lesson Goal: ${lessonContext.lesson_goal}

Activity Requirements:
- Type: ${activityType}
- Subtype: ${activitySubtype}
- Custom Requirements: ${customRequirements || "None specified"}
`;

  switch (activityType) {
    case "ai_chat":
      return `${baseContext}

Create an AI chat activity that provides personalized tutoring and concept exploration. Return as JSON:

{
  "title": "Engaging chat title",
  "description": "What students will learn through this chat",
  "content": {
    "instructions": "Clear instructions for students",
    "ai_prompt": "System prompt for the AI tutor",
    "learning_objectives": ["specific objectives this chat addresses"],
    "conversation_starters": ["Question 1", "Question 2", "Question 3"],
    "adaptive_features": {
      "difficulty_adjustment": "How AI adjusts to student level",
      "hint_system": "When and how hints are provided",
      "progress_tracking": "How mastery is assessed"
    },
    "collaboration_settings": {
      "peer_discussion": "Enable peer discussion",
      "group_challenges": "Group problem-solving tasks"
    }
  },
  "difficulty": 3,
  "duration": 20,
  "points": 25,
  "is_adaptive": true,
  "is_collaborative": false
}`;

    case "quiz":
      return `${baseContext}

Create an interactive quiz activity. Return as JSON:

{
  "title": "Quiz title",
  "description": "What this quiz assesses",
  "content": {
    "instructions": "Clear quiz instructions",
    "questions": [
      {
        "question": "Question text",
        "type": "multiple_choice|true_false|short_answer|matching",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Correct answer",
        "explanation": "Why this is correct",
        "difficulty": 1-5,
        "learning_objective": "Which objective this tests"
      }
    ],
    "adaptive_features": {
      "difficulty_progression": "How difficulty increases",
      "hint_system": "When hints are provided",
      "retry_mechanism": "How students can retry"
    },
    "collaboration_settings": {
      "peer_review": "Enable peer review of answers",
      "group_quizzes": "Allow group quiz taking"
    }
  },
  "difficulty": 3,
  "duration": 15,
  "points": 20,
  "is_adaptive": true,
  "is_collaborative": false
}

Create 5-8 questions appropriate for the grade level and learning objectives.`;

    case "collaborative":
      return `${baseContext}

Create a collaborative learning activity. Return as JSON:

{
  "title": "Collaborative activity title",
  "description": "What students will accomplish together",
  "content": {
    "instructions": "Clear instructions for the group",
    "collaboration_type": "${activitySubtype}",
    "group_size": "Recommended group size",
    "roles": ["Role 1", "Role 2", "Role 3"],
    "tasks": [
      {
        "task": "Task description",
        "duration": "Estimated time",
        "deliverable": "What to produce"
      }
    ],
    "collaboration_tools": {
      "shared_documents": "Enable shared document editing",
      "real_time_chat": "Enable real-time communication",
      "peer_review": "Enable peer feedback",
      "voting_system": "Enable group decision making"
    },
    "assessment_criteria": {
      "individual_contribution": "How individual work is assessed",
      "group_dynamics": "How collaboration is evaluated",
      "final_product": "How the final deliverable is graded"
    }
  },
  "difficulty": 4,
  "duration": 30,
  "points": 40,
  "is_adaptive": false,
  "is_collaborative": true,
  "collaboration_settings": {
    "max_participants": 4,
    "requires_approval": false,
    "peer_review": true,
    "moderation_required": true
  }
}

Make it engaging and promote meaningful collaboration.`;

    case "video":
      return `${baseContext}

Create a video-based learning activity. Return as JSON:

{
  "title": "Video activity title",
  "description": "What students will learn from this video",
  "content": {
    "instructions": "How to engage with the video",
    "video_type": "${activitySubtype}",
    "video_url": "YouTube URL or upload path",
    "video_metadata": {
      "duration": "Video length",
      "quality": "HD/SD",
      "captions": "Available captions"
    },
    "interactive_elements": {
      "pause_points": [
        {
          "timestamp": "00:30",
          "question": "Reflection question",
          "activity": "What to do at this point"
        }
      ],
      "note_taking": "Guided note-taking prompts",
      "discussion_questions": ["Question 1", "Question 2"]
    },
    "assessment": {
      "comprehension_quiz": "Quiz after video",
      "reflection_prompts": "Written reflection questions"
    }
  },
  "difficulty": 2,
  "duration": 25,
  "points": 15,
  "is_adaptive": false,
  "is_collaborative": false
}

Include specific timestamps and interactive elements.`;

    case "reading":
      return `${baseContext}

Create a reading-based learning activity. Return as JSON:

{
  "title": "Reading activity title",
  "description": "What students will learn from reading",
  "content": {
    "instructions": "How to approach the reading",
    "reading_type": "${activitySubtype}",
    "text_content": "Main reading content or reference",
    "reading_guide": {
      "pre_reading": "Questions to consider before reading",
      "during_reading": "Active reading strategies",
      "post_reading": "Reflection and analysis questions"
    },
    "interactive_features": {
      "highlighting": "Enable text highlighting",
      "annotations": "Enable note-taking",
      "vocabulary_support": "Define key terms",
      "comprehension_checks": "Periodic understanding checks"
    },
    "collaboration": {
      "discussion_questions": "Questions for group discussion",
      "peer_annotations": "Share annotations with peers",
      "group_summary": "Collaborative summary creation"
    }
  },
  "difficulty": 2,
  "duration": 20,
  "points": 15,
  "is_adaptive": false,
  "is_collaborative": true
}

Make the reading engaging and interactive.`;

    case "custom":
      return `${baseContext}

Create a custom, creative learning activity. Return as JSON:

{
  "title": "Creative activity title",
  "description": "What makes this activity unique and engaging",
  "content": {
    "instructions": "Step-by-step instructions",
    "activity_type": "${activitySubtype}",
    "materials_needed": ["Material 1", "Material 2"],
    "setup": "How to prepare for the activity",
    "steps": [
      {
        "step": 1,
        "description": "What to do",
        "duration": "How long",
        "tips": "Helpful tips"
      }
    ],
    "creative_elements": {
      "student_choice": "Where students can be creative",
      "personalization": "How to make it personal",
      "innovation": "Encourage new ideas"
    },
    "collaboration": {
      "sharing": "How students share their work",
      "feedback": "Peer feedback mechanisms",
      "showcase": "How to showcase final products"
    },
    "assessment": {
      "creativity": "How creativity is assessed",
      "effort": "How effort is recognized",
      "learning": "How learning is demonstrated"
    }
  },
  "difficulty": 4,
  "duration": 45,
  "points": 50,
  "is_adaptive": true,
  "is_collaborative": true
}

Make it creative, engaging, and aligned with the learning objectives.`;

    default:
      return `${baseContext}

Create a ${activityType} activity. Return as JSON with appropriate structure for the activity type. Make it engaging, educational, and suitable for the specified grade level and learning objectives.`;
  }
}
