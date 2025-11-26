import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const courseId = resolvedParams.id;
    const supabase = await createClient();

    // Get the course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseError) {
      console.error("Error fetching course:", courseError);
      return NextResponse.json(
        { error: "Course not found", details: courseError.message },
        { status: 404 }
      );
    }

    // Get lessons for this course
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });

    if (lessonsError) {
      console.error("Error fetching lessons:", lessonsError);
      return NextResponse.json(
        { error: "Failed to fetch lessons", details: lessonsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        lessons: lessons || [],
      },
    });
  } catch (error) {
    console.error("Error in courses GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const courseId = resolvedParams.id;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { title, description, subject, grade_level, learning_objectives } =
      body;

    // Verify course ownership
    const { data: existingCourse, error: courseError } = await supabase
      .from("courses")
      .select("teacher_id")
      .eq("id", courseId)
      .single();

    if (courseError || !existingCourse) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    if (existingCourse.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - not course owner" },
        { status: 403 }
      );
    }

    // Update course
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (subject !== undefined) updateData.subject = subject;
    if (grade_level !== undefined) updateData.grade_level = grade_level;
    if (learning_objectives !== undefined)
      updateData.learning_objectives = learning_objectives;
    updateData.updated_at = new Date().toISOString();

    const { data: course, error: updateError } = await supabase
      .from("courses")
      .update(updateData)
      .eq("id", courseId)
      .select()
      .single();

    if (updateError) {
      console.error("Course update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update course", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ course }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const courseId = resolvedParams.id;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify course ownership
    const { data: existingCourse, error: courseError } = await supabase
      .from("courses")
      .select("teacher_id")
      .eq("id", courseId)
      .single();

    if (courseError || !existingCourse) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    if (existingCourse.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - not course owner" },
        { status: 403 }
      );
    }

    // Delete course (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (deleteError) {
      console.error("Course deletion error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete course", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Course deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}