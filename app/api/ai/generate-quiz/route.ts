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
    const {
      activity_id,
      learning_objectives,
      concepts_mastered,
      concepts_struggling,
      difficulty,
    } = body;

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
    const context = `You are an expert educational AI creating quiz questions for a student.

Activity: "${activity.title}"
Subject: ${activity.courses.subject}
Grade Level: ${activity.courses.grade_level}
Difficulty Level: ${difficulty}/5

Learning Objectives:
${learning_objectives
  .map((obj: string, i: number) => `${i + 1}. ${obj}`)
  .join("\n")}

Concepts Already Mastered: ${concepts_mastered.join(", ") || "None yet"}
Concepts Student is Struggling With: ${
      concepts_struggling.join(", ") || "None identified"
    }

Create a single quiz question that:
1. Tests understanding of one of the learning objectives
2. Is appropriate for the grade level and difficulty
3. Has 4 multiple choice options (A, B, C, D)
4. Has one clearly correct answer
5. Includes 2-3 plausible distractors
6. Provides a clear explanation for the correct answer
7. Focuses on concepts the student hasn't fully mastered yet
8. Uses clear, age-appropriate language

Return a JSON object with this exact structure:
{
  "id": "unique_id",
  "question": "The quiz question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": 0,
  "explanation": "Clear explanation of why the correct answer is right",
  "difficulty": ${difficulty},
  "learning_objective": "The specific learning objective this question tests"
}

Make sure the question is engaging and tests real understanding, not just memorization.`;

    // Generate AI response
    requireAIConfiguration();

    const config = {
      ...getDefaultConfig(),
      maxOutputTokens: 500,
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

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({ question: parsed });
    } catch (parseError) {
      console.error("Quiz parsing error:", parseError);
      // Fallback quiz question
      return NextResponse.json({
        question: {
          id: "fallback_" + Date.now(),
          question:
            "Which of the following best describes the main concept we've been learning?",
          options: [
            "A concept that is easy to understand",
            "A concept that requires practice to master",
            "A concept that is only theoretical",
            "A concept that has no real-world applications",
          ],
          correct_answer: 1,
          explanation:
            "The main concept requires practice and understanding to master, which is why we're working through it step by step.",
          difficulty: difficulty,
          learning_objective:
            learning_objectives[0] || "Understanding the main concept",
        },
      });
    }
  } catch (error) {
    console.error("AI Quiz API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
