import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      activity_subtype = "interactive",
      order_index = 0,
      difficulty_level = 3,
      is_adaptive = true,
      is_collaborative = false,
      is_enhanced = false,
      is_conditional = false,
      supports_upload = false,
      supports_slideshow = false,
      performance_tracking = false,
      collaboration_settings = {},
    } = body;

    // Validate required fields
    if (!title || !lesson_id || !course_id) {
      return NextResponse.json(
        { error: "Missing required fields: title, lesson_id, course_id" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create the activity
    const activityData: any = {
      title,
      description: description || "",
      content: content || {},
      course_id,
      activity_type,
      activity_subtype,
      order_index,
      estimated_duration: estimated_duration || 10,
      difficulty_level,
      is_adaptive,
      is_collaborative,
      is_enhanced,
      is_conditional,
      supports_upload,
      supports_slideshow,
      performance_tracking,
      collaboration_settings,
    };

    // Add lesson_id if it exists (from migration)
    // Note: lesson_id column might not exist if migrations haven't been run
    if (lesson_id) {
      try {
        activityData.lesson_id = lesson_id;
      } catch (error) {
        console.log("lesson_id column might not exist, skipping...");
      }
    }

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

    console.log("Activity created successfully:", activity);
    return NextResponse.json({
      success: true,
      activity,
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
