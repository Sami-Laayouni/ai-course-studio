import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runEarlAnalysis } from "@/lib/earl-analyzer";

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

    // Create the activity - only use columns that exist in the database
    const activityData: any = {
      title,
      description: description || "",
      content: content || {},
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
    if (content !== undefined) activityData.content = content || {};
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
