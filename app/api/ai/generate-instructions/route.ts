import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import genAI from "@/lib/genai";

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
    const { activity_id, learning_objectives, subject, grade_level } = body;

    // Get activity details for context
    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .select(
        `
        *,
        courses(title, subject, grade_level),
        lessons(title, learning_objectives, description)
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

    // Build context for AI
    const context = `You are an expert educational AI creating personalized learning instructions for a student.

Activity: "${activity.title}"
Subject: ${subject || activity.courses.subject}
Grade Level: ${grade_level || activity.courses.grade_level}
Lesson: "${activity.lessons.title}"
Lesson Description: "${
      activity.lessons.description || "No description provided"
    }"

Learning Objectives:
${learning_objectives
  .map((obj: string, i: number) => `${i + 1}. ${obj}`)
  .join("\n")}

Create unique, engaging, and personalized instructions that:
1. Welcome the student warmly and explain what they'll learn
2. Set clear expectations for the learning journey
3. Explain the different phases: instruction, practice, and quiz
4. Motivate the student and build confidence
5. Use age-appropriate language and examples
6. Make the learning process feel like an adventure, not a chore
7. Include specific guidance on how to interact with the AI tutor
8. Explain the point system and how to earn rewards

The instructions should be 2-3 paragraphs long and feel personal and encouraging.`;

    // Generate AI response using Gemini AI
    requireAIConfiguration();

    const config = {
      ...getDefaultConfig(),
      maxOutputTokens: 400,
    };

    const response = await ai.models.generateContentStream({
      model: getModelName(),
      config,
      contents: [
        {
          role: "user",
          text: context,
        },
      ],
    });

    let text = "";
    for await (const chunk of response) {
      if (chunk.text) {
        text += chunk.text;
      }
    }

    return NextResponse.json({ instructions: text });
  } catch (error) {
    console.error("AI Instructions API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
