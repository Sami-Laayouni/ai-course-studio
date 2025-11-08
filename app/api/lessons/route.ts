import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      course_id,
      title,
      description,
      lesson_goal,
      learning_objectives,
      estimated_duration,
      content_source_type,
      content_source_data,
      generate_ai_plan = false,
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
      .eq("id", course_id)
      .eq("teacher_id", user.id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Create the lesson - don't include join_code, let database trigger handle it if column exists
    // This prevents errors if the join_code column doesn't exist in the schema
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .insert({
        course_id,
        title,
        description,
        lesson_goal: lesson_goal || "",
        learning_objectives: learning_objectives || [],
        estimated_duration: estimated_duration || null,
        content_source_type: content_source_type || "manual",
        content_source_data: content_source_data || {},
        // Note: join_code is intentionally omitted - database trigger will generate it if column exists
      })
      .select()
      .single();

    if (lessonError) {
      throw lessonError;
    }

    // Note: AI plan generation removed to fix authentication issues
    // Teachers can now use the visual editor to add activities

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 }
    );
  }
}

async function generateLessonPlan({
  title,
  description,
  lesson_goal,
  learning_objectives,
  estimated_duration,
  content_source_type,
  content_source_data,
  course_context,
}: {
  title: string;
  description: string;
  lesson_goal: string;
  learning_objectives: string[];
  estimated_duration: number | null;
  content_source_type: string;
  content_source_data: any;
  course_context: any;
}) {
  const prompt = `
Create a comprehensive lesson plan for the following lesson:

Subject: ${course_context.subject}
Grade Level: ${course_context.grade_level}
Lesson Title: ${title}
Description: ${description}
Lesson Goal: ${lesson_goal}
Learning Objectives: ${learning_objectives.join(", ")}
Estimated Duration: ${estimated_duration || 45} minutes
Content Source: ${content_source_type}

${
  content_source_type === "url" && content_source_data.url
    ? `Source URL: ${content_source_data.url}`
    : ""
}
${
  content_source_type === "upload" && content_source_data.file_name
    ? `Uploaded File: ${content_source_data.file_name}`
    : ""
}

Create a structured lesson plan with multiple activities that build upon each other. Include:

1. A variety of activity types: AI chat sessions, quizzes, collaborative activities, video content, reading materials, and custom interactive activities
2. Points for each activity (10-50 points based on complexity)
3. Clear learning progression from basic concepts to advanced application
4. Collaborative elements where students can work together
5. Adaptive elements that can be personalized per student
6. Real-time assessment and feedback opportunities

Return the response as valid JSON with this structure:
{
  "overview": {
    "title": "Lesson title",
    "description": "Brief lesson description",
    "estimated_duration": 45,
    "learning_objectives": ["objective1", "objective2"],
    "materials_needed": ["material1", "material2"]
  },
  "activities": [
    {
      "title": "Activity title",
      "description": "What students will do",
      "type": "ai_chat|quiz|collaborative|video|reading|custom",
      "subtype": "youtube|pdf|discussion|peer_review|project",
      "content": {
        "instructions": "Detailed instructions",
        "questions": [], // for quizzes
        "video_url": "", // for videos
        "collaboration_type": "", // for collaborative activities
        "ai_prompt": "" // for AI chat activities
      },
      "difficulty": 3,
      "duration": 15,
      "points": 20,
      "prerequisites": [], // previous activity IDs
      "learning_objectives": ["objective1"],
      "is_adaptive": true,
      "collaboration_settings": {
        "max_participants": 4,
        "requires_approval": false,
        "peer_review": true
      }
    }
  ],
  "assessment": {
    "formative": ["Check understanding through AI chat", "Peer review activities"],
    "summative": ["Final quiz", "Collaborative project presentation"],
    "rubric": {
      "excellent": "All objectives met with creativity",
      "good": "Most objectives met",
      "satisfactory": "Basic objectives met",
      "needs_improvement": "Objectives not fully met"
    }
  },
  "adaptation_suggestions": {
    "for_struggling_students": ["Additional AI chat support", "Simplified activities"],
    "for_advanced_students": ["Extended collaborative projects", "Additional research components"],
    "for_different_learning_styles": ["Visual: Video content", "Kinesthetic: Hands-on activities", "Auditory: Discussion components"]
  }
}

Make the lesson engaging, interactive, and suitable for the specified grade level and subject area.
`;

  const { text } = await generateText({
    model: "openai/gpt-4o-mini",
    prompt,
    temperature: 0.7,
  });

  try {
    return JSON.parse(text);
  } catch {
    // If JSON parsing fails, return a basic structure
    return {
      overview: {
        title,
        description,
        estimated_duration: estimated_duration || 45,
        learning_objectives,
        materials_needed: [],
      },
      activities: [],
      assessment: {
        formative: [],
        summative: [],
        rubric: {},
      },
      adaptation_suggestions: {},
    };
  }
}
