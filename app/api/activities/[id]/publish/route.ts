import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the activity to verify ownership
    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .select("id, course_id, courses!inner(teacher_id)")
      .eq("id", activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Verify user is the teacher of the course
    if ((activity.courses as any).teacher_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Publish the activity (set is_published = true)
    const { error: updateError } = await supabase
      .from("activities")
      .update({ is_published: true })
      .eq("id", activityId);

    if (updateError) {
      console.error("Error publishing activity:", updateError);
      return NextResponse.json(
        { error: "Failed to publish activity", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Activity published successfully",
      activity_id: activityId
    });
  } catch (error: any) {
    console.error("Error in publish activity:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

