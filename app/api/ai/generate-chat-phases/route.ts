import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ai, getModelName, getDefaultConfig, requireAIConfiguration } from "@/lib/ai-config";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      activity_id,
      title,
      description,
      learning_objectives,
      course_context,
    } = body;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prompt = `
Create a structured learning progression for an AI chat activity with the following details:

Activity: ${title}
Description: ${description}
Learning Objectives: ${learning_objectives.join(", ")}
Course Context: ${course_context.subject} - ${course_context.grade_level}

Design a multi-phase learning experience that guides students through:
1. Introduction and concept exploration
2. Interactive learning with AI tutor
3. Knowledge assessment through quizzes
4. Mastery verification
5. Completion and next steps

Each phase should have:
- Clear instructions for the AI tutor
- Specific learning goals
- Quiz questions (if applicable)
- Mastery thresholds
- Transition criteria

Return the response as valid JSON with this structure:
{
  "phases": [
    {
      "phase": "introduction",
      "title": "Welcome & Introduction",
      "description": "Getting started with the concepts",
      "instructions": "Specific instructions for the AI tutor on how to introduce concepts and engage the student",
      "mastery_threshold": 0,
      "quiz_questions": []
    },
    {
      "phase": "learning",
      "title": "Interactive Learning",
      "description": "Exploring concepts through conversation",
      "instructions": "Detailed instructions for the AI tutor on teaching methods, examples to use, and how to adapt to student responses",
      "mastery_threshold": 0,
      "quiz_questions": []
    },
    {
      "phase": "quiz",
      "title": "Knowledge Check",
      "description": "Testing understanding through quiz",
      "instructions": "Instructions for the AI tutor on how to introduce the quiz and provide support",
      "mastery_threshold": 80,
      "quiz_questions": [
        {
          "id": "q1",
          "question": "Sample question",
          "type": "multiple_choice",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_answer": "Option A",
          "explanation": "Why this is correct",
          "difficulty": 3
        }
      ]
    },
    {
      "phase": "mastery_check",
      "title": "Mastery Verification",
      "description": "Ensuring complete understanding",
      "instructions": "Instructions for the AI tutor on how to verify mastery and provide additional support if needed",
      "mastery_threshold": 90,
      "quiz_questions": []
    },
    {
      "phase": "completion",
      "title": "Activity Complete",
      "description": "Celebrating success and next steps",
      "instructions": "Instructions for the AI tutor on how to conclude the activity and guide to next steps",
      "mastery_threshold": 100,
      "quiz_questions": []
    }
  ]
}

Make the instructions specific, engaging, and appropriate for the grade level. The AI tutor should be encouraging, patient, and adaptive to student needs.
`;

    requireAIConfiguration();

    const config = {
      ...getDefaultConfig(),
      maxOutputTokens: 2000,
    };

    const response = await ai.models.generateContentStream({
      model: getModelName(),
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

    let phases;
    try {
      phases = JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Fallback phases
      phases = {
        phases: [
          {
            phase: "introduction",
            title: "Welcome & Introduction",
            description: "Getting started with the concepts",
            instructions: `Welcome! I'm your AI tutor for "${title}". I'm here to help you understand ${learning_objectives.join(
              ", "
            )}. Let's start by exploring what you already know about these concepts.`,
            mastery_threshold: 0,
            quiz_questions: [],
          },
          {
            phase: "learning",
            title: "Interactive Learning",
            description: "Exploring concepts through conversation",
            instructions: `Now let's dive deeper into these concepts. I'll explain things clearly, give you examples, and answer any questions you have. Feel free to ask me to explain things differently if you don't understand.`,
            mastery_threshold: 0,
            quiz_questions: [],
          },
          {
            phase: "quiz",
            title: "Knowledge Check",
            description: "Testing understanding through quiz",
            instructions: `Great! Now let's see how well you understand these concepts. I'll give you a short quiz to check your knowledge. Don't worry if you don't know everything - I'm here to help!`,
            mastery_threshold: 80,
            quiz_questions: [],
          },
          {
            phase: "completion",
            title: "Activity Complete",
            description: "Celebrating success and next steps",
            instructions: `Excellent work! You've successfully learned about ${learning_objectives.join(
              ", "
            )}. You can now move on to the next activity or continue exploring these concepts.`,
            mastery_threshold: 100,
            quiz_questions: [],
          },
        ],
      };
    }

    // Save to AI content history
    await supabase.from("ai_content_history").insert({
      teacher_id: user.id,
      activity_id,
      prompt,
      generated_content: phases,
      content_type: "chat_phases",
      model_used: getModelName(),
    });

    return NextResponse.json({ phases: phases.phases });
  } catch (error) {
    console.error("Error generating chat phases:", error);
    return NextResponse.json(
      { error: "Failed to generate chat phases" },
      { status: 500 }
    );
  }
}
