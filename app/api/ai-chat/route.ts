import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import genAI from "@/lib/genai";

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
      learning_style = "visual",
      performance_history = [],
      current_phase = "instruction",
    } = body;

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

    const activityTitle = activity?.title || "Activity";
    const activitySubject = activity?.courses?.subject || "subject";
    const activityGrade = activity?.courses?.grade_level || "grade";
    const learningObjectivesList = Array.isArray(learning_objectives)
      ? learning_objectives
      : Array.isArray(activity?.lessons?.learning_objectives)
      ? activity.lessons.learning_objectives
      : [];

    const masteredList = Array.isArray(concepts_mastered) ? concepts_mastered : [];
    const strugglingList = Array.isArray(concepts_struggling) ? concepts_struggling : [];

    const recentPerformance = Array.isArray(performance_history) ? performance_history.slice(-5) : [];
    const avgPerformance = recentPerformance.length > 0
      ? recentPerformance.reduce((sum: number, p: any) => sum + (p.score || 70), 0) / recentPerformance.length
      : 70;

    let contextSourcesText = "";
    if (context_sources && context_sources.length > 0) {
      for (const source of context_sources) {
        if (source.type === "pdf" && source.summary) {
          contextSourcesText += `\nPDF: ${source.summary.substring(0, 500)}\n`;
        } else if (source.type === "youtube" && source.summary) {
          contextSourcesText += `\nVideo: ${source.summary.substring(0, 500)}\n`;
        }
      }
    }

    const systemPrompt = `You are a focused AI tutor teaching photosynthesis. Your goal: assess the student's knowledge and teach them effectively.

Key Concepts: Photosynthesis, chlorophyll, light reactions, Calvin cycle, glucose production, oxygen release.

Student Status:
- Mastered: ${masteredList.join(", ") || "None"}
- Struggling: ${strugglingList.join(", ") || "None"}
- Performance: ${avgPerformance.toFixed(0)}%
${contextSourcesText}

Teaching Approach:
1. Ask targeted questions to assess understanding
2. Explain concepts simply and clearly
3. Use examples and analogies
4. Check comprehension before moving on
5. Be concise - avoid unnecessary words
6. Use diagrams when helpful (\`\`\`diagram blocks)

Keep responses short, clear, and focused on learning.`;

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured", response: "I'm having trouble connecting. Please check the configuration." },
        { status: 500 }
      );
    }

    console.log("✅ AI Chat: Google AI API key found");
    console.log("✅ AI Chat: Using model: gemini-2.0-flash-lite");

    const config = {
      responseMimeType: "text/plain",
      maxOutputTokens: 500,
      systemInstruction: [
        {
          text: systemPrompt,
        },
      ],
    };

    const safeHistory = Array.isArray(chat_history) ? chat_history : [];
    const contents = [
      ...safeHistory.map((msg: any) => ({
        role: msg.role || (msg.type === "student" ? "user" : "assistant"),
        text: msg.content || msg.text || msg.message || "",
      })),
      {
        role: "user",
        text: message,
      },
    ];

    console.log("🤖 AI Chat: Calling Google AI...");
    const response = await genAI.models.generateContentStream({
      model: "gemini-2.0-flash-lite",
      config,
      contents,
    });
    console.log("✅ AI Chat: Response stream received");

    let fullText = "";
    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
      }
    }
    console.log("✅ AI Chat: Full response collected");

    const diagrams: Array<{ type: string; code: string; language?: string }> = [];
    let cleanedText = fullText;

    const diagramRegex = /```diagram\s*\n?([\s\S]*?)```/g;
    let match;
    while ((match = diagramRegex.exec(fullText)) !== null) {
      const code = match[1].trim();
      let type = "svg";
      if (code.includes("mermaid") || code.startsWith("graph") || code.startsWith("flowchart")) {
        type = "mermaid";
      } else if (code.includes("<canvas") || code.includes("getContext")) {
        type = "canvas";
      }
      diagrams.push({ type, code, language: type });
      cleanedText = cleanedText.replace(match[0], `[Diagram ${diagrams.length}]`);
    }

    const analysisPrompt = `Assess the student's understanding of photosynthesis from this conversation:

Student: "${message}"
AI: "${cleanedText}"

Return JSON:
{
  "concepts_mastered": ["photosynthesis concepts the student now understands"],
  "concepts_struggling": ["photosynthesis concepts the student is struggling with"],
  "concepts_addressed": ["photosynthesis concepts discussed"],
  "points_earned": 0-50,
  "mastery_explanation": "brief assessment of their photosynthesis knowledge"
}`;

    let analysisResult = {
      concepts_mastered: masteredList,
      concepts_struggling: strugglingList,
      concepts_addressed: [],
      points_earned: 0,
      mastery_explanation: "",
    };

    try {
      const analysisConfig = {
        responseMimeType: "text/plain",
        maxOutputTokens: 500,
      };

      const analysisResponse = await genAI.models.generateContentStream({
        model: "gemini-2.0-flash-lite",
        config: analysisConfig,
        contents: [
          {
            role: "user",
            text: analysisPrompt,
          },
        ],
      });

      let analysisText = "";
      for await (const chunk of analysisResponse) {
        if (chunk.text) {
          analysisText += chunk.text;
        }
      }

      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = { ...analysisResult, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (error) {
      // Continue with defaults
    }

    if (session_id && user) {
      const updatedHistory = [
        ...safeHistory,
        { role: "user", content: message },
        { role: "assistant", content: fullText },
      ];

      await supabase
        .from("ai_chat_sessions")
        .update({
          chat_history: updatedHistory,
          concepts_mastered: analysisResult.concepts_mastered,
          concepts_struggling: analysisResult.concepts_struggling,
        })
        .eq("id", session_id);
    }

    if (analysisResult.points_earned > 0 && user && activity) {
      await supabase.from("student_points").upsert(
        {
          student_id: user.id,
          course_id: activity.course_id,
          activity_id: activity_id,
          lesson_id: activity.lesson_id,
          points_earned: analysisResult.points_earned,
        },
        { onConflict: "student_id,activity_id", ignoreDuplicates: false }
      );
    }

    const newMastery = (analysisResult.concepts_mastered || []).filter(
      (c: string) => !masteredList.includes(c)
    );

    const adaptiveRouting = {
      next_phase: avgPerformance >= 85 && newMastery.length > 0 ? "mastery" : avgPerformance < 60 ? "practice" : "quiz",
      suggested_actions: avgPerformance >= 85 ? ["Advanced concepts"] : avgPerformance < 60 ? ["Review basics"] : ["Assess understanding"],
      should_advance: newMastery.length > 0 && avgPerformance >= 70,
      should_review: avgPerformance < 60,
    };

    return NextResponse.json({
      response: cleanedText,
      diagrams,
      concepts_mastered: analysisResult.concepts_mastered,
      concepts_struggling: analysisResult.concepts_struggling,
      concepts_addressed: analysisResult.concepts_addressed,
      points_earned: analysisResult.points_earned,
      mastery_explanation: analysisResult.mastery_explanation,
      adaptive_routing: adaptiveRouting,
      performanceScore: avgPerformance,
    });
  } catch (error: any) {
    console.error("❌ AI Chat API error:", error);
    console.error("❌ Error name:", error?.name);
    console.error("❌ Error message:", error?.message);
    console.error("❌ Error code:", error?.code);
    console.error("❌ Error status:", error?.status);
    console.error("❌ Error stack:", error?.stack);
    if (error?.responseBody) {
      console.error("❌ Error response body:", error.responseBody);
    }
    if (error?.data) {
      console.error("❌ Error data:", error.data);
    }
    if (error?.cause) {
      console.error("❌ Error cause:", error.cause);
    }
    
    return NextResponse.json(
      { 
        error: error?.message || "Internal server error", 
        response: "I apologize, but I encountered an error. Please try again.",
        details: process.env.NODE_ENV === "development" ? {
          message: error?.message,
          code: error?.code,
          status: error?.status,
          name: error?.name,
        } : undefined,
      },
      { status: 500 }
    );
  }
}
