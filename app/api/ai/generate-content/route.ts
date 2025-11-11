import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import genAI from "@/lib/genai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      courseId,
      contentType,
      topic,
      customPrompt,
      difficulty,
      duration,
      courseContext,
    } = body;

    // Verify user authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .eq("teacher_id", user.id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Build the AI prompt based on content type
    const prompt = buildPrompt(
      contentType,
      topic,
      courseContext,
      difficulty,
      duration,
      customPrompt
    );

    // Generate content using Google AI
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const config = {
      responseMimeType: "text/plain",
      maxOutputTokens: 2000,
    };

    const response = await genAI.models.generateContentStream({
      model: "gemini-2.0-flash-lite",
      config,
      contents: [
        {
          role: "user",
          text: prompt,
        },
      ],
    });

    let text = "";
    for await (const chunk of response) {
      if (chunk.text) {
        text += chunk.text;
      }
    }

    // Parse the generated content
    let parsedContent;
    try {
      parsedContent = JSON.parse(text);
    } catch {
      // If JSON parsing fails, treat as plain text
      parsedContent = { content: text };
    }

    // Structure the response
    const generatedContent = {
      type: contentType,
      title: parsedContent.title || `${contentType} on ${topic}`,
      content: parsedContent,
      difficulty: difficulty,
      estimatedDuration: duration,
    };

    // Save to AI content history
    await supabase.from("ai_content_history").insert({
      teacher_id: user.id,
      prompt: prompt,
      generated_content: generatedContent,
      content_type: contentType,
      model_used: "gemini-2.0-flash-lite",
    });

    return NextResponse.json({ content: generatedContent });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}

function buildPrompt(
  contentType: string,
  topic: string,
  courseContext: any,
  difficulty: number,
  duration: number,
  customPrompt?: string
): string {
  const baseContext = `
Subject: ${courseContext.subject}
Grade Level: ${courseContext.gradeLevel}
Learning Objectives: ${
    courseContext.learningObjectives?.join(", ") || "Not specified"
  }
Topic: ${topic}
Difficulty Level: ${difficulty}/5
Estimated Duration: ${duration} minutes
${customPrompt ? `Additional Instructions: ${customPrompt}` : ""}
`;

  switch (contentType) {
    case "quiz":
      return `${baseContext}

Create a quiz with 5-10 questions about ${topic}. Return the response as valid JSON with this structure:
{
  "title": "Quiz title",
  "instructions": "Instructions for students",
  "questions": [
    {
      "question": "Question text",
      "type": "multiple_choice|true_false|short_answer",
      "options": ["Option A", "Option B", "Option C", "Option D"], // for multiple choice only
      "correct_answer": "Correct answer",
      "explanation": "Why this is correct"
    }
  ]
}

Make sure questions are appropriate for the grade level and align with the learning objectives.`;

    case "assignment":
      return `${baseContext}

Create a project-based assignment about ${topic}. Return the response as valid JSON with this structure:
{
  "title": "Assignment title",
  "overview": "Brief description of the assignment",
  "objectives": ["Learning objective 1", "Learning objective 2"],
  "instructions": "Detailed step-by-step instructions",
  "materials": ["Required material 1", "Required material 2"],
  "assessment_criteria": ["Criteria 1", "Criteria 2"],
  "timeline": "Suggested timeline for completion"
}

Make it engaging and hands-on, appropriate for the specified grade level.`;

    case "reading":
      return `${baseContext}

Create educational reading material about ${topic}. Return the response as valid JSON with this structure:
{
  "title": "Reading title",
  "introduction": "Engaging introduction paragraph",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Section content"
    }
  ],
  "vocabulary": [
    {
      "term": "Key term",
      "definition": "Definition"
    }
  ],
  "comprehension_questions": ["Question 1", "Question 2"]
}

Write at an appropriate reading level for the grade level specified.`;

    case "interactive":
      return `${baseContext}

Create an interactive learning activity about ${topic}. Return the response as valid JSON with this structure:
{
  "title": "Activity title",
  "description": "What students will do",
  "setup": "How to set up the activity",
  "steps": ["Step 1", "Step 2", "Step 3"],
  "materials": ["Material 1", "Material 2"],
  "variations": ["Variation for different learning styles"],
  "reflection_questions": ["Question 1", "Question 2"]
}

Make it hands-on and engaging for the specified grade level.`;

    case "lesson_plan":
      return `${baseContext}

Create a complete lesson plan about ${topic}. Return the response as valid JSON with this structure:
{
  "title": "Lesson title",
  "objectives": ["Objective 1", "Objective 2"],
  "materials": ["Material 1", "Material 2"],
  "introduction": {
    "duration": "5 minutes",
    "activity": "Opening activity description"
  },
  "main_activities": [
    {
      "name": "Activity name",
      "duration": "15 minutes",
      "description": "Activity description",
      "instructions": "Step by step instructions"
    }
  ],
  "closure": {
    "duration": "5 minutes",
    "activity": "Closing activity description"
  },
  "assessment": "How to assess student learning",
  "homework": "Optional homework assignment"
}

Structure it for the specified duration and grade level.`;

    default:
      return `${baseContext}

Create educational content about ${topic} for ${contentType}. Return the response as valid JSON with appropriate structure for the content type. Make it engaging and appropriate for the specified grade level and duration.`;
  }
}
