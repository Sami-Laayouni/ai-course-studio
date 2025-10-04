import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { join_code } = body;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get lesson by join code
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select(
        `
        *,
        courses!inner(
          id,
          title,
          join_code
        )
      `
      )
      .eq("join_code", join_code)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
    }

    // Check if student is already enrolled in the course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("course_enrollments")
      .select("*")
      .eq("student_id", user.id)
      .eq("course_id", lesson.courses.id)
      .single();

    if (enrollmentError && enrollmentError.code !== "PGRST116") {
      throw enrollmentError;
    }

    // If not enrolled, create enrollment
    if (!enrollment) {
      const { error: enrollError } = await supabase
        .from("course_enrollments")
        .insert({
          student_id: user.id,
          course_id: lesson.courses.id,
          enrolled_at: new Date().toISOString(),
        });

      if (enrollError) {
        throw enrollError;
      }
    }

    return NextResponse.json({
      success: true,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        course_id: lesson.courses.id,
      },
    });
  } catch (error) {
    console.error("Error joining lesson:", error);
    return NextResponse.json(
      { error: "Failed to join lesson" },
      { status: 500 }
    );
  }
}
