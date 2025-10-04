import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      activity_id,
      session_id,
      message,
      chat_history,
      learning_objectives,
      concepts_mastered,
      concepts_struggling,
      context_sources,
    } = body;

    // Get activity details for context
    const { data: activity, error: activityError } = await supabase
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

    if (activityError || !activity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    // Build context for AI with additional sources
    let contextSources = "";
    if (context_sources && context_sources.length > 0) {
      contextSources = "\n\nAdditional Context Sources:\n";
      for (const source of context_sources) {
        if (source.type === "pdf") {
          contextSources += `- PDF Document: ${source.title || source.filename}\n`;
          if (source.summary) {
            contextSources += `  Summary: ${source.summary}\n`;
          }
          if (source.key_points) {
            contextSources += `  Key Points: ${source.key_points.join(", ")}\n`;
          }
        } else if (source.type === "youtube") {
          contextSources += `- YouTube Video: ${source.title || "Video"}\n`;
          if (source.url) {
            contextSources += `  URL: ${source.url}\n`;
          }
          if (source.summary) {
            contextSources += `  Summary: ${source.summary}\n`;
          }
          if (source.key_concepts) {
            contextSources += `  Key Concepts: ${source.key_concepts.join(", ")}\n`;
          }
        }
      }
    }

    const context = `You are an AI tutor helping a student with "${
      activity.title
    }" in ${activity.courses.subject} for ${activity.courses.grade_level}.

Learning Objectives:
${learning_objectives
  .map((obj: string, i: number) => `${i + 1}. ${obj}`)
  .join("\n")}

Concepts Already Mastered: ${concepts_mastered.join(", ") || "None yet"}
Concepts Student is Struggling With: ${
      concepts_struggling.join(", ") || "None identified"
    }${contextSources}

Your role:
- Be encouraging and supportive
- Explain concepts clearly at the appropriate grade level
- Ask probing questions to check understanding
- Provide examples and analogies
- Use the additional context sources to provide more relevant and specific examples
- Reference specific content from PDFs or videos when relevant
- Identify when the student has mastered a concept
- Identify when the student is struggling and needs more help
- Award points when concepts are mastered (10-50 points per concept)

Student's latest message: "${message}"

Respond helpfully and educationally. If the student demonstrates mastery of a new concept, acknowledge it clearly. Use the provided context sources to give more specific and relevant examples.`;

    // Generate AI response
    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: context,
      maxTokens: 500,
    });

    // Analyze the conversation to update concept mastery
    const analysisPrompt = `Based on this conversation, analyze the student's understanding:

Learning Objectives: ${learning_objectives.join(", ")}
Previously Mastered: ${concepts_mastered.join(", ")}
Previously Struggling: ${concepts_struggling.join(", ")}

Student's message: "${message}"
AI response: "${text}"

Return a JSON object with:
{
  "concepts_mastered": ["list of all concepts the student has now mastered"],
  "concepts_struggling": ["list of concepts the student is struggling with"],
  "concepts_addressed": ["concepts discussed in this exchange"],
  "points_earned": 0-50 (points to award if new concepts were mastered),
  "mastery_explanation": "brief explanation of what was learned"
}

Only include concepts from the learning objectives list.`;

    let analysisResult = {
      concepts_mastered: concepts_mastered,
      concepts_struggling: concepts_struggling,
      concepts_addressed: [],
      points_earned: 0,
      mastery_explanation: "",
    };

    try {
      const { text: analysisText } = await generateText({
        model: google("gemini-1.5-flash"),
        prompt: analysisPrompt,
        maxTokens: 300,
      });

      const parsed = JSON.parse(analysisText);
      analysisResult = { ...analysisResult, ...parsed };
    } catch (error) {
      console.error("Analysis parsing error:", error);
      // Continue with default values
    }

    // Update chat session
    const updatedHistory = [
      ...chat_history,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        timestamp: new Date().toISOString(),
        concepts_addressed: analysisResult.concepts_addressed,
      },
    ];

    await supabase
      .from("ai_chat_sessions")
      .update({
        chat_history: updatedHistory,
        concepts_mastered: analysisResult.concepts_mastered,
        concepts_struggling: analysisResult.concepts_struggling,
        total_messages: updatedHistory.length,
      })
      .eq("id", session_id);

    // Award points if concepts were mastered
    if (analysisResult.points_earned > 0) {
      await supabase.from("student_points").upsert(
        {
          student_id: user.id,
          course_id: activity.course_id,
          activity_id: activity_id,
          lesson_id: activity.lesson_id,
          points_earned: analysisResult.points_earned,
        },
        {
          onConflict: "student_id,activity_id",
          ignoreDuplicates: false,
        }
      );

      // Update learning objective progress
      for (const concept of analysisResult.concepts_mastered) {
        if (!concepts_mastered.includes(concept)) {
          await supabase.from("learning_objective_progress").upsert(
            {
              student_id: user.id,
              course_id: activity.course_id,
              lesson_id: activity.lesson_id,
              learning_objective: concept,
              mastery_level: 100,
              attempts: 1,
            },
            {
              onConflict: "student_id,course_id,lesson_id,learning_objective",
            }
          );
        }
      }
    }

    return NextResponse.json({
      response: text,
      ...analysisResult,
    });
  } catch (error) {
    console.error("AI Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
