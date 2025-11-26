import { NextRequest, NextResponse } from "next/server";
import genAI from "@/lib/genai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      learning_objectives,
      concepts_mastered,
      concepts_struggling,
      phase_instructions,
      difficulty_level,
    } = body;

    const prompt = `
Generate quiz questions for a learning assessment based on the following context:

Learning Objectives: ${learning_objectives.join(", ")}
Concepts Mastered: ${concepts_mastered.join(", ")}
Concepts Struggling: ${concepts_struggling.join(", ")}
Phase Instructions: ${phase_instructions}
Difficulty Level: ${difficulty_level}/5

Create 3-5 quiz questions that:
1. Test understanding of the learning objectives
2. Are appropriate for the difficulty level
3. Include a mix of question types (multiple choice, true/false, short answer)
4. Focus on areas where the student might be struggling
5. Build on concepts they've already mastered

Return JSON response:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "type": "multiple_choice|true_false|short_answer",
      "options": ["Option A", "Option B", "Option C", "Option D"], // only for multiple choice
      "correct_answer": "Correct answer",
      "explanation": "Why this answer is correct",
      "difficulty": 3
    }
  ]
}

Make questions clear, fair, and educational. Avoid trick questions.
`;

    requireAIConfiguration();

    const config = {
      ...getDefaultConfig(),
      maxOutputTokens: 1000,
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

    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Fallback questions
      result = {
        questions: [
          {
            id: "q1",
            question: `Which of the following best describes ${
              learning_objectives[0] || "the main concept"
            }?`,
            type: "multiple_choice",
            options: [
              "Option A - Basic understanding",
              "Option B - Intermediate understanding",
              "Option C - Advanced understanding",
              "Option D - Expert level understanding",
            ],
            correct_answer: "Option B - Intermediate understanding",
            explanation:
              "This represents the expected level of understanding for this concept.",
            difficulty: difficulty_level,
          },
          {
            id: "q2",
            question: `True or False: ${
              learning_objectives[0] || "This concept"
            } is important for understanding the topic.`,
            type: "true_false",
            correct_answer: "true",
            explanation:
              "This concept is fundamental to understanding the broader topic.",
            difficulty: difficulty_level,
          },
          {
            id: "q3",
            question: `Explain in your own words: What is ${
              learning_objectives[0] || "the main concept"
            }?`,
            type: "short_answer",
            correct_answer:
              "A clear explanation that shows understanding of the concept",
            explanation:
              "Any answer that demonstrates understanding of the concept is acceptable.",
            difficulty: difficulty_level,
          },
        ],
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating quiz questions:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz questions" },
      { status: 500 }
    );
  }
}
