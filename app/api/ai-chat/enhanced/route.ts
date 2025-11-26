import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ai, getModelName, getDefaultConfig, requireAIConfiguration } from "@/lib/ai-config";

/**
 * Enhanced AI Chat API with Advanced Teaching Capabilities
 * - Visual diagram generation
 * - Multiple teaching styles
 * - Adaptive routing
 * - Personalized learning paths
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      activity_id,
      session_id,
      message,
      chat_history = [],
      learning_objectives = [],
      concepts_mastered = [],
      concepts_struggling = [],
      context_sources = [],
      learning_style = "visual", // visual, auditory, kinesthetic, reading
      performance_history = [],
      current_phase = "instruction",
    } = body;

    // Fetch activity for context
    let activity: any = null;
    if (activity_id) {
      const { data: a } = await supabase
        .from("activities")
        .select(
          `
          *,
          courses(title, subject, grade_level),
          lessons(title, learning_objectives)
        `
        )
        .eq("id", activity_id)
        .single();
      if (a) activity = a;
    }

    // Build rich context
    const activityTitle = activity?.title || "Activity";
    const activitySubject = activity?.courses?.subject || "subject";
    const activityGrade = activity?.courses?.grade_level || "grade";
    const learningObjectivesList = Array.isArray(learning_objectives)
      ? learning_objectives
      : Array.isArray(activity?.lessons?.learning_objectives)
      ? activity.lessons.learning_objectives
      : [];

    // Build context sources text
    let contextSourcesText = "";
    if (context_sources && context_sources.length > 0) {
      contextSourcesText = "\n\nAvailable Context Sources:\n";
      for (const source of context_sources) {
        if (source.type === "pdf") {
          contextSourcesText += `- PDF: ${source.title || source.filename}\n`;
          if (source.summary) contextSourcesText += `  Summary: ${source.summary.substring(0, 500)}\n`;
          if (source.key_points) contextSourcesText += `  Key Points: ${source.key_points.join(", ")}\n`;
        } else if (source.type === "youtube") {
          contextSourcesText += `- Video: ${source.title || "Video"}\n`;
          if (source.summary) contextSourcesText += `  Summary: ${source.summary.substring(0, 500)}\n`;
        }
      }
    }

    // Analyze performance history for adaptive routing
    const recentPerformance = performance_history.slice(-5);
    const avgPerformance = recentPerformance.length > 0
      ? recentPerformance.reduce((sum: number, p: any) => sum + (p.score || 70), 0) / recentPerformance.length
      : 70;
    const isStruggling = avgPerformance < 60;
    const isExcelling = avgPerformance > 85;

    // Determine teaching approach based on learning style and performance
    const teachingApproach = determineTeachingApproach(learning_style, isStruggling, isExcelling);

    // Enhanced system prompt with teaching capabilities
    const systemPrompt = `You are the world's most advanced AI tutor, capable of creating stunning visual diagrams, adapting to different learning styles, and providing exceptional personalized education.

STUDENT CONTEXT:
- Subject: ${activitySubject}
- Grade Level: ${activityGrade}
- Activity: "${activityTitle}"
- Learning Style: ${learning_style}
- Current Performance: ${avgPerformance.toFixed(0)}% (${isStruggling ? "Struggling" : isExcelling ? "Excelling" : "On Track"})
- Concepts Mastered: ${concepts_mastered.join(", ") || "None yet"}
- Concepts Struggling: ${concepts_struggling.join(", ") || "None identified"}
${contextSourcesText}

LEARNING OBJECTIVES:
${learningObjectivesList.map((obj: string, i: number) => `${i + 1}. ${obj}`).join("\n")}

YOUR CAPABILITIES:
1. **Visual Diagram Generation**: Create SVG/HTML diagrams using code blocks marked with \`\`\`diagram
   - Use SVG for flowcharts, concept maps, process diagrams
   - Use HTML Canvas for interactive visualizations
   - Use Mermaid syntax for complex diagrams
   - Always include clear labels and colors

2. **Teaching Styles** (adapt based on learning_style):
   - **Visual**: Use diagrams, charts, visual metaphors, color coding
   - **Auditory**: Use analogies, stories, verbal explanations, rhythm
   - **Kinesthetic**: Use hands-on examples, real-world applications, step-by-step actions
   - **Reading**: Use structured text, bullet points, written examples

3. **Adaptive Questioning**:
   - For struggling students: Ask simpler, scaffolded questions, provide more examples
   - For excelling students: Ask deeper, challenging questions, introduce advanced concepts
   - Use Socratic method: Guide through questions rather than direct answers

4. **Response Format**:
   - Always be encouraging and supportive
   - Use the student's name if available
   - Break complex concepts into digestible chunks
   - Provide real-world examples and analogies
   - When appropriate, generate visual diagrams using code blocks

5. **Visual Generation Guidelines**:
   - Generate diagrams when explaining:
     * Processes or workflows
     * Relationships between concepts
     * Hierarchical structures
     * Comparisons or contrasts
     * Mathematical concepts
     * Scientific processes
   - Use this format for diagrams:
     \`\`\`diagram
     [SVG, HTML Canvas, or Mermaid code here]
     \`\`\`

CURRENT PHASE: ${current_phase}
TEACHING APPROACH: ${teachingApproach}

Student's message: "${message}"

Respond with exceptional teaching that adapts to the student's needs. If a visual diagram would help, generate one. Be engaging, clear, and supportive.`;

    requireAIConfiguration();

    console.log("🤖 Enhanced AI Chat: Generating response...");
    console.log("📊 Learning Style:", learning_style);
    console.log("📊 Performance:", avgPerformance);
    console.log("📊 Teaching Approach:", teachingApproach);

    const config = {
      responseMimeType: "text/plain",
      maxOutputTokens: 2000,
      systemInstruction: [
        {
          text: systemPrompt,
        },
      ],
    };

    const response = await ai.models.generateContentStream({
      model: getModelName(),
      config,
      contents: [
        {
          role: "user",
          text: message,
        },
      ],
    });

    let text = "";
    for await (const chunk of response) {
      if (chunk.text) {
        text += chunk.text;
      }
    }

    console.log("✅ Enhanced AI Chat: Response generated");

    // Parse response for diagrams and structured content
    const parsedResponse = parseAIResponse(text);

    // Analyze mastery and generate adaptive routing
    const masteryAnalysis = await analyzeMastery(
      message,
      text,
      learningObjectivesList,
      concepts_mastered,
      concepts_struggling
    );

    // Determine next steps based on performance
    const adaptiveRouting = determineAdaptiveRouting(
      masteryAnalysis,
      avgPerformance,
      current_phase,
      learning_style
    );

    // Update session if exists
    if (session_id && user) {
      const updatedHistory = [
        ...chat_history,
        { role: "user", content: message },
        { role: "assistant", content: text, diagrams: parsedResponse.diagrams },
      ];

      await supabase
        .from("ai_chat_sessions")
        .update({
          chat_history: updatedHistory,
          concepts_mastered: masteryAnalysis.concepts_mastered,
          concepts_struggling: masteryAnalysis.concepts_struggling,
          learning_style: learning_style,
          performance_score: avgPerformance,
        })
        .eq("id", session_id);
    }

    // Award points
    if (masteryAnalysis.points_earned > 0 && user && activity) {
      await supabase.from("student_points").upsert(
        {
          student_id: user.id,
          course_id: activity.course_id,
          activity_id: activity_id,
          lesson_id: activity.lesson_id,
          points_earned: masteryAnalysis.points_earned,
        },
        { onConflict: "student_id,activity_id", ignoreDuplicates: false }
      );
    }

    return NextResponse.json({
      response: parsedResponse.text,
      diagrams: parsedResponse.diagrams,
      teaching_style: teachingApproach,
      concepts_mastered: masteryAnalysis.concepts_mastered,
      concepts_struggling: masteryAnalysis.concepts_struggling,
      concepts_addressed: masteryAnalysis.concepts_addressed,
      points_earned: masteryAnalysis.points_earned,
      mastery_explanation: masteryAnalysis.mastery_explanation,
      adaptive_routing: adaptiveRouting,
      performance_score: avgPerformance,
      suggested_actions: adaptiveRouting.suggested_actions,
      next_phase: adaptiveRouting.next_phase,
    });
  } catch (error: any) {
    console.error("Enhanced AI Chat error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Internal server error",
        response: "I apologize, but I'm having trouble processing that. Could you rephrase your question?",
      },
      { status: 500 }
    );
  }
}

/**
 * Determine the best teaching approach based on learning style and performance
 */
function determineTeachingApproach(
  learningStyle: string,
  isStruggling: boolean,
  isExcelling: boolean
): string {
  if (isStruggling) {
    switch (learningStyle) {
      case "visual":
        return "Use simple visual diagrams, step-by-step visual guides, and color-coded explanations";
      case "auditory":
        return "Use clear verbal explanations, analogies, and break concepts into smaller spoken chunks";
      case "kinesthetic":
        return "Use hands-on examples, real-world applications, and actionable steps";
      default:
        return "Use structured, simplified explanations with clear examples";
    }
  } else if (isExcelling) {
    switch (learningStyle) {
      case "visual":
        return "Use advanced visualizations, complex diagrams, and visual problem-solving";
      case "auditory":
        return "Use deep discussions, complex analogies, and thought-provoking questions";
      case "kinesthetic":
        return "Use challenging real-world applications and advanced problem-solving";
      default:
        return "Use advanced concepts, deeper analysis, and challenging questions";
    }
  } else {
    switch (learningStyle) {
      case "visual":
        return "Use visual diagrams, charts, and visual metaphors to explain concepts";
      case "auditory":
        return "Use stories, analogies, and verbal explanations";
      case "kinesthetic":
        return "Use practical examples and real-world applications";
      default:
        return "Use structured explanations with examples";
    }
  }
}

/**
 * Parse AI response to extract diagrams and clean text
 */
function parseAIResponse(response: string): {
  text: string;
  diagrams: Array<{ type: string; code: string; language?: string }>;
} {
  const diagrams: Array<{ type: string; code: string; language?: string }> = [];
  let cleanedText = response;

  // Extract diagram code blocks
  const diagramRegex = /```diagram\s*\n?([\s\S]*?)```/g;
  let match;
  while ((match = diagramRegex.exec(response)) !== null) {
    const code = match[1].trim();
    // Determine diagram type
    let type = "svg";
    let language = "svg";
    
    if (code.includes("mermaid") || code.startsWith("graph") || code.startsWith("flowchart")) {
      type = "mermaid";
      language = "mermaid";
    } else if (code.includes("<canvas") || code.includes("getContext")) {
      type = "canvas";
      language = "html";
    } else if (code.includes("<svg") || code.includes("svg")) {
      type = "svg";
      language = "svg";
    }

    diagrams.push({ type, code, language });
    // Remove diagram block from text
    cleanedText = cleanedText.replace(match[0], `[Diagram ${diagrams.length} displayed below]`);
  }

  // Also check for regular code blocks that might be diagrams
  const codeBlockRegex = /```(\w+)?\s*\n?([\s\S]*?)```/g;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    const language = match[1] || "text";
    const code = match[2].trim();
    
    // Check if it looks like a diagram
    if (
      language === "mermaid" ||
      language === "svg" ||
      (language === "html" && (code.includes("<svg") || code.includes("<canvas"))) ||
      code.includes("graph") ||
      code.includes("flowchart")
    ) {
      diagrams.push({ type: language === "mermaid" ? "mermaid" : "svg", code, language });
      cleanedText = cleanedText.replace(match[0], `[Diagram ${diagrams.length} displayed below]`);
    }
  }

  return { text: cleanedText, diagrams };
}

/**
 * Analyze student mastery
 */
async function analyzeMastery(
  studentMessage: string,
  aiResponse: string,
  learningObjectives: string[],
  conceptsMastered: string[],
  conceptsStruggling: string[],
  apiKey?: string
): Promise<any> {
  const analysisPrompt = `Analyze the student's understanding based on this conversation:

Learning Objectives: ${learningObjectives.join(", ")}
Previously Mastered: ${conceptsMastered.join(", ") || "None"}
Previously Struggling: ${conceptsStruggling.join(", ") || "None"}

Student's message: "${studentMessage}"
AI response: "${aiResponse}"

Return ONLY a valid JSON object:
{
  "concepts_mastered": ["list of concepts now mastered"],
  "concepts_struggling": ["list of concepts still struggling"],
  "concepts_addressed": ["concepts discussed"],
  "points_earned": 0-50,
  "mastery_explanation": "brief explanation",
  "confidence_level": 0-100
}

Only include concepts from the learning objectives.`;

  try {
    if (!process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error("API key not configured");
    }

    const config = {
      responseMimeType: "text/plain",
      maxOutputTokens: 500,
    };

    const response = await ai.models.generateContentStream({
      model: getModelName(),
      config,
      contents: [
        {
          role: "user",
          text: analysisPrompt,
        },
      ],
    });

    let analysisText = "";
    for await (const chunk of response) {
      if (chunk.text) {
        analysisText += chunk.text;
      }
    }

    // Try to extract JSON from response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Mastery analysis error:", error);
  }

  return {
    concepts_mastered: conceptsMastered,
    concepts_struggling: conceptsStruggling,
    concepts_addressed: [],
    points_earned: 0,
    mastery_explanation: "",
    confidence_level: 50,
  };
}

/**
 * Determine adaptive routing based on performance
 */
function determineAdaptiveRouting(
  masteryAnalysis: any,
  avgPerformance: number,
  currentPhase: string,
  learningStyle: string
): any {
  const newMastery = masteryAnalysis.concepts_mastered.filter(
    (c: string) => !masteryAnalysis.previously_mastered?.includes(c)
  );

  let nextPhase = currentPhase;
  const suggestedActions: string[] = [];

  if (avgPerformance >= 85 && newMastery.length > 0) {
    // Student is excelling - move to advanced content
    nextPhase = "mastery";
    suggestedActions.push("Introduce advanced concepts");
    suggestedActions.push("Provide challenging problems");
  } else if (avgPerformance < 60) {
    // Student is struggling - provide more support
    nextPhase = "practice";
    suggestedActions.push("Review foundational concepts");
    suggestedActions.push("Provide more examples");
    if (learningStyle === "visual") {
      suggestedActions.push("Create visual aids");
    }
  } else if (newMastery.length > 0) {
    // Student is making progress
    nextPhase = "quiz";
    suggestedActions.push("Assess understanding with quiz");
  }

  return {
    next_phase: nextPhase,
    suggested_actions: suggestedActions,
    should_advance: newMastery.length > 0 && avgPerformance >= 70,
    should_review: avgPerformance < 60,
    difficulty_adjustment: avgPerformance < 60 ? -1 : avgPerformance > 85 ? 1 : 0,
  };
}

