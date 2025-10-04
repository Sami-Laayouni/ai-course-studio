import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course_id");
    const studentId = searchParams.get("student_id");

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase.from("student_points").select(`
        *,
        activities(title, activity_type, points),
        lessons(title),
        profiles(full_name, email)
      `);

    if (courseId) {
      query = query.eq("course_id", courseId);
    }

    if (studentId) {
      query = query.eq("student_id", studentId);
    } else {
      // If no specific student, get current user's points
      query = query.eq("student_id", user.id);
    }

    const { data: points, error } = await query.order("earned_at", {
      ascending: false,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ points });
  } catch (error) {
    console.error("Error fetching student points:", error);
    return NextResponse.json(
      { error: "Failed to fetch points" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      student_id,
      course_id,
      activity_id,
      lesson_id,
      points_earned,
      reason,
    } = body;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user can award points (teacher or self)
    if (student_id !== user.id) {
      // Check if user is a teacher for this course
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("teacher_id")
        .eq("id", course_id)
        .single();

      if (courseError || course.teacher_id !== user.id) {
        return NextResponse.json(
          { error: "Unauthorized to award points" },
          { status: 403 }
        );
      }
    }

    // Award points
    const { data: pointRecord, error } = await supabase
      .from("student_points")
      .insert({
        student_id,
        course_id,
        activity_id,
        lesson_id,
        points_earned,
        reason: reason || "Activity completion",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update total points in profile (if needed)
    await supabase.rpc("update_student_total_points", {
      student_id,
      course_id,
    });

    return NextResponse.json({ pointRecord });
  } catch (error) {
    console.error("Error awarding points:", error);
    return NextResponse.json(
      { error: "Failed to award points" },
      { status: 500 }
    );
  }
}
