import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lessonId = params.id;
    const supabase = await createClient();

    // Get the lesson
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single();

    if (lessonError) {
      console.error("Error fetching lesson:", lessonError);
      return NextResponse.json(
        { error: "Lesson not found", details: lessonError.message },
        { status: 404 }
      );
    }

    // Get activities for this lesson
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true });

    if (activitiesError) {
      console.error("Error fetching activities:", activitiesError);
      return NextResponse.json(
        {
          error: "Failed to fetch activities",
          details: activitiesError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lesson: {
        ...lesson,
        activities: activities || [],
      },
    });
  } catch (error) {
    console.error("Error in lessons GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lessonId = params.id;
    const body = await request.json();
    const { title, description, course_id } = body;

    const supabase = await createClient();

    const { data: lesson, error } = await supabase
      .from("lessons")
      .update({
        title,
        description,
        course_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lessonId)
      .select()
      .single();

    if (error) {
      console.error("Error updating lesson:", error);
      return NextResponse.json(
        { error: "Failed to update lesson", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lesson,
      message: "Lesson updated successfully",
    });
  } catch (error) {
    console.error("Error in lessons PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lessonId = params.id;
    const supabase = await createClient();

    // Delete all activities for this lesson first
    const { error: activitiesError } = await supabase
      .from("activities")
      .delete()
      .eq("lesson_id", lessonId);

    if (activitiesError) {
      console.error("Error deleting activities:", activitiesError);
      return NextResponse.json(
        {
          error: "Failed to delete activities",
          details: activitiesError.message,
        },
        { status: 500 }
      );
    }

    // Delete the lesson
    const { error: lessonError } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (lessonError) {
      console.error("Error deleting lesson:", lessonError);
      return NextResponse.json(
        { error: "Failed to delete lesson", details: lessonError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lesson and all activities deleted successfully",
    });
  } catch (error) {
    console.error("Error in lessons DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
