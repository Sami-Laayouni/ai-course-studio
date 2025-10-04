import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;
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
