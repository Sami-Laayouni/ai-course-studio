import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runEarlAnalysis } from "@/lib/earl-analyzer";
import { generateContent, createCacheKey } from "@/lib/genai-utils";

type ActivityContent = {
  nodes?: any[];
  context_sources?: any[];
  [key: string]: any;
};

const buildContextText = (
  nodeConfig: any = {},
  contextSources: any[] = []
) => {
  let contextText = nodeConfig.context || "";

  if (Array.isArray(contextSources) && contextSources.length > 0) {
    const parts = contextSources
      .map((source) => {
        if (!source) return "";
        if (source.type === "document" || source.type === "pdf") {
          return `Document: ${source.title || "Untitled"}\n${
            source.summary || ""
          }\nKey Points: ${(source.key_points || []).join(", ")}`;
        }
        if (source.type === "youtube" || source.type === "video") {
          return `Video: ${source.title || "Untitled"}\n${
            source.summary || ""
          }\nKey Concepts: ${(source.key_concepts || []).join(", ")}`;
        }
        return "";
      })
      .filter(Boolean);
    contextText = `${parts.join("\n\n")}\n\n${contextText}`.trim();
  }

  return contextText;
};

const parseFlashcardTerms = (text: string, fallbackCount: number) => {
  if (!text) return [];

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === "string" ? item.trim() : null))
          .filter(Boolean);
      }
    } catch (error) {
      console.warn("⚠️ Failed to parse flashcard terms JSON:", error);
    }
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("[") && !line.startsWith("]"));

  return lines.slice(0, fallbackCount);
};

const generateFlashcardTerms = async (
  contextText: string,
  numTerms: number,
  cacheSalt: string
) => {
  if (!contextText) return [];

  const prompt = `Based on the following context from documents and videos, generate ${
    numTerms || 10
  } important terms/concepts that students should learn. Return only a JSON array of term strings, nothing else.

Context:
${contextText}

Return a JSON array like: ["Term 1", "Term 2", "Term 3", ...]`;

  const cacheKey = createCacheKey(
    "generate-flashcards",
    cacheSalt,
    numTerms,
    contextText.substring(0, 100)
  );

  let text = "";
  try {
    text = await generateContent(prompt, {
      maxRetries: 0, // No retries - use API as intended
      cacheKey,
      endpoint: "generate-flashcards",
      minInterval: 3000,
    });
  } catch (error) {
    console.error("❌ Failed to generate flashcards during activity creation:", error);
    return [];
  }

  return parseFlashcardTerms(text, numTerms || 10);
};

const enrichContentWithFlashcards = async (
  content: ActivityContent,
  cacheSalt: string
): Promise<ActivityContent> => {
  if (!content || !Array.isArray(content.nodes)) {
    return content;
  }

  const clonedContent: ActivityContent = {
    ...content,
    nodes: content.nodes.map((node) => ({ ...node, config: { ...(node.config || {}) } })),
  };

  const contextSources = clonedContent.context_sources || [];

  for (const node of clonedContent.nodes || []) {
    if (
      node.type === "review" &&
      node.config?.review_type === "flashcards" &&
      (!Array.isArray(node.config.flashcard_terms) ||
        node.config.flashcard_terms.length === 0)
    ) {
      console.log(`🔄 Generating flashcards for review node: ${node.id}`);
      const contextText = buildContextText(node.config, contextSources);
      if (!contextText) {
        console.warn(`⚠️ No context found for flashcard node ${node.id}, skipping generation`);
        continue;
      }

      const terms = await generateFlashcardTerms(
        contextText,
        node.config.num_terms || 10,
        `${cacheSalt}-${node.id}`
      );

      if (terms.length > 0) {
        node.config.flashcard_terms = terms.map((term: string, index: number) => ({
          id: `generated-${index}`,
          term,
        }));
        node.config.flashcards_generated_at = new Date().toISOString();
        console.log(`✅ Generated ${terms.length} flashcard terms for node ${node.id}`);
      } else {
        console.warn(`⚠️ Failed to generate flashcard terms for node ${node.id}`);
      }
    } else if (
      node.type === "review" &&
      node.config?.review_type === "flashcards" &&
      Array.isArray(node.config.flashcard_terms) &&
      node.config.flashcard_terms.length > 0
    ) {
      console.log(`✅ Node ${node.id} already has ${node.config.flashcard_terms.length} pre-generated flashcard terms, skipping`);
    }
  }

  return clonedContent;
};


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      content,
      lesson_id,
      course_id,
      points,
      estimated_duration,
      activity_type = "interactive",
      order_index = 0,
      difficulty_level = 3,
      is_adaptive = true,
      is_collaborative = false,
      assigned_to,
      // Removed columns that don't exist: activity_subtype, is_enhanced, is_conditional, supports_upload, supports_slideshow, performance_tracking
      collaboration_settings = {},
    } = body;

    // Validate required fields - lesson_id is optional now (activities belong directly to courses)
    if (!title || !course_id) {
      return NextResponse.json(
        { error: "Missing required fields: title, course_id" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    let processedContent: ActivityContent | undefined = undefined;
    try {
      if (content) {
        processedContent = await enrichContentWithFlashcards(
          content as ActivityContent,
          `${course_id || ""}-${title || "activity"}`
        );
      }
    } catch (flashcardError) {
      console.error("⚠️ Failed to pre-generate flashcards:", flashcardError);
      processedContent = content as ActivityContent;
    }

    // Create the activity - only use columns that exist in the database
    const activityData: any = {
      title,
      description: description || "",
      content: processedContent || content || {},
      course_id,
      activity_type,
      order_index,
      estimated_duration: estimated_duration || 10,
      difficulty_level,
      is_adaptive,
      is_collaborative,
      // Removed columns that don't exist: activity_subtype, is_enhanced, is_conditional, supports_upload, supports_slideshow, performance_tracking
      // collaboration_settings might not exist either, so we'll only add it if it's provided
    };

    // Add assigned_to if provided (can be "all" or array of student IDs)
    if (assigned_to !== undefined) {
      activityData.assigned_to = assigned_to;
    }

    // Only add collaboration_settings if it exists and is provided
    if (
      collaboration_settings &&
      Object.keys(collaboration_settings).length > 0
    ) {
      // Check if column exists before adding - if it doesn't exist, just skip it
      // activityData.collaboration_settings = collaboration_settings;
    }

    // Add lesson_id if it exists (from migration)
    // Note: lesson_id column might not exist if migrations haven't been run
    if (lesson_id) {
      try {
        activityData.lesson_id = lesson_id;
      } catch (error) {
        console.log("lesson_id column might not exist, skipping...");
      }
    }

    // Set is_published to false by default (activities must be explicitly published)
    activityData.is_published = false;

    // Add points if it exists (from migration)
    if (points) {
      activityData.points = points;
    }

    const { data: activity, error } = await supabase
      .from("activities")
      .insert(activityData)
      .select()
      .single();

    if (error) {
      console.error("Error creating activity:", error);
      return NextResponse.json(
        { error: "Failed to create activity", details: error.message },
        { status: 500 }
      );
    }

    // Earl: Intelligent Activity Analyzer
    // Automatically fetch context and generate captivating question
    // Only run if activity doesn't already have a question
    const contentObj = activity.content || {};

    // Check database again to be sure (prevent race conditions)
    const { data: latestActivity } = await supabase
      .from("activities")
      .select("content")
      .eq("id", activity.id)
      .single();

    const latestContent = latestActivity?.content || contentObj;

    if (!latestContent.earl_generated || !latestContent.captivating_question) {
      // Run Earl analysis asynchronously (don't block activity creation)
      // Use longer delay to prevent race conditions and concurrent calls
      setTimeout(() => {
        runEarlAnalysis(activity, supabase).catch((error) => {
          console.error("Earl: Error in activity analysis:", error);
        });
      }, 2000); // Increased delay to prevent concurrent calls
    } else {
      console.log(
        "Earl: Skipping - question already exists for activity",
        activity.id
      );
    }

    // Fetch the updated activity with the question
    const { data: updatedActivity } = await supabase
      .from("activities")
      .select("*")
      .eq("id", activity.id)
      .single();

    console.log("Activity created successfully:", updatedActivity || activity);
    return NextResponse.json({
      success: true,
      activity: updatedActivity || activity,
      message: "Activity created successfully",
    });
  } catch (error) {
    console.error("Error in activities POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      content,
      lesson_id,
      course_id,
      points,
      estimated_duration,
      activity_type,
      order_index,
      difficulty_level,
      is_adaptive,
      is_collaborative,
      assigned_to,
      // Removed columns that don't exist: activity_subtype, is_enhanced, is_conditional, supports_upload, supports_slideshow, performance_tracking
      collaboration_settings,
    } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update the activity
    const activityData: any = {};

    if (title !== undefined) activityData.title = title;
    if (description !== undefined) activityData.description = description || "";
    if (content !== undefined) {
      try {
        const cacheSalt = `${course_id || id || ""}-${title || "activity"}`;
        const processed = await enrichContentWithFlashcards(
          content as ActivityContent,
          cacheSalt
        );
        activityData.content = processed || {};
      } catch (flashcardError) {
        console.error("⚠️ Failed to pre-generate flashcards on update:", flashcardError);
        activityData.content = content || {};
      }
    }
    if (course_id !== undefined) activityData.course_id = course_id;
    if (activity_type !== undefined) activityData.activity_type = activity_type;
    // Removed: activity_subtype (doesn't exist)
    if (order_index !== undefined) activityData.order_index = order_index;
    if (estimated_duration !== undefined)
      activityData.estimated_duration = estimated_duration;
    if (difficulty_level !== undefined)
      activityData.difficulty_level = difficulty_level;
    if (is_adaptive !== undefined) activityData.is_adaptive = is_adaptive;
    if (is_collaborative !== undefined)
      activityData.is_collaborative = is_collaborative;
    // Removed: is_enhanced, is_conditional, supports_upload, supports_slideshow, performance_tracking (don't exist)
    if (points !== undefined) activityData.points = points;
    if (lesson_id !== undefined) activityData.lesson_id = lesson_id;
    if (assigned_to !== undefined) activityData.assigned_to = assigned_to;
    // Removed: collaboration_settings (might not exist)

    const { data: activity, error } = await supabase
      .from("activities")
      .update(activityData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating activity:", error);
      return NextResponse.json(
        { error: "Failed to update activity", details: error.message },
        { status: 500 }
      );
    }

    // Run Earl analysis on update (in case content changed)
    // Only run if activity doesn't already have a question
    const contentObj = activity.content || {};

    // Check database again to be sure (prevent race conditions)
    const { data: latestActivity } = await supabase
      .from("activities")
      .select("content")
      .eq("id", activity.id)
      .single();

    const latestContent = latestActivity?.content || contentObj;

    if (!latestContent.earl_generated || !latestContent.captivating_question) {
      // Use longer delay to prevent race conditions and concurrent calls
      setTimeout(() => {
        runEarlAnalysis(activity, supabase).catch((error) => {
          console.error("Earl: Error in activity analysis:", error);
        });
      }, 2000); // Increased delay to prevent concurrent calls
    } else {
      console.log(
        "Earl: Skipping - question already exists for activity",
        activity.id
      );
    }

    // Create notifications for enrolled students after activity is saved
    // Only create if activity has a captivating question
    if (latestContent.captivating_question && activity.course_id) {
      try {
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("student_id")
          .eq("course_id", activity.course_id);

        if (enrollments && enrollments.length > 0) {
          // Check if notifications already exist for this activity
          const { data: existingNotifications } = await supabase
            .from("notifications")
            .select("id")
            .eq("type", "activity")
            .eq("data->>activity_id", activity.id)
            .limit(1);

          // Only create notifications if they don't already exist
          if (!existingNotifications || existingNotifications.length === 0) {
            const notifications = enrollments.map((enrollment: any) => ({
              user_id: enrollment.student_id,
              type: "activity",
              title: `New Activity: ${activity.title}`,
              message: latestContent.captivating_question,
              data: {
                activity_id: activity.id,
                course_id: activity.course_id,
                lesson_id: activity.lesson_id || null,
                captivating_question: latestContent.captivating_question,
              },
              priority: "normal",
            }));

            await supabase.from("notifications").insert(notifications);
            console.log(
              `✅ Created ${notifications.length} notifications for enrolled students after activity save`
            );
          }
        }
      } catch (notificationError) {
        console.error(
          "Error creating notifications after activity save:",
          notificationError
        );
      }
    }

    console.log("Activity updated successfully:", activity);
    return NextResponse.json({
      success: true,
      activity,
      message: "Activity updated successfully",
    });
  } catch (error) {
    console.error("Error in activities PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get("id");

    if (!activityId) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId);

    if (error) {
      console.error("Error deleting activity:", error);
      return NextResponse.json(
        { error: "Failed to delete activity", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Activity deleted successfully",
    });
  } catch (error) {
    console.error("Error in activities DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lesson_id");
    const courseId = searchParams.get("course_id");
    const activityId = searchParams.get("activity_id");

    const supabase = await createClient();

    let query = supabase
      .from("activities")
      .select("*")
      .order("order_index", { ascending: true });

    if (activityId) {
      query = query.eq("id", activityId);
    } else if (lessonId) {
      query = query.eq("lesson_id", lessonId);
    } else if (courseId) {
      query = query.eq("course_id", courseId);
    }

    const { data: activities, error } = await query;

    if (error) {
      console.error("Error fetching activities:", error);
      return NextResponse.json(
        { error: "Failed to fetch activities", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      activities: activities || [],
    });
  } catch (error) {
    console.error("Error in activities GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
