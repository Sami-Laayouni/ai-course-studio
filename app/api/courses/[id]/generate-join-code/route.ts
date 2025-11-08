import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the course and verify ownership
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, teacher_id, join_code")
      .eq("id", id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Verify the user is the teacher
    if (course.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - You are not the teacher of this course" },
        { status: 403 }
      );
    }

    // Generate a unique join code
    const generateJoinCode = (): string => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let newJoinCode = generateJoinCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Check uniqueness
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from("courses")
        .select("id")
        .eq("join_code", newJoinCode)
        .single();

      if (!existing) break;
      newJoinCode = generateJoinCode();
      attempts++;
    }

    // Update the course with the new join code
    const { data: updatedCourse, error: updateError } = await supabase
      .from("courses")
      .update({ join_code: newJoinCode })
      .eq("id", id)
      .select("join_code")
      .single();

    if (updateError) {
      console.error("Failed to generate join code:", updateError);
      return NextResponse.json(
        { error: "Failed to generate join code", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      join_code: updatedCourse.join_code,
    });
  } catch (error) {
    console.error("Error generating join code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

