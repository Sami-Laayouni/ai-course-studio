import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

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

    // Validate required fields
    if (!title || !subject || !grade_level) {
      return NextResponse.json(
        { error: "Missing required fields: title, subject, grade_level" },
        { status: 400 }
      );
    }

    // Generate a simple join code
    const generateJoinCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let result = "";
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // Insert course with join code
    const { data: course, error: insertError } = await supabase
      .from("courses")
      .insert({
        title,
        description: description || null,
        subject,
        grade_level,
        learning_objectives: learning_objectives || [],
        teacher_id: user.id,
        is_published: false,
        join_code: generateJoinCode(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Course creation error:", insertError);
      return NextResponse.json(
        { error: "Failed to create course", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's courses with stats
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select(
        `
        *,
        activities(count),
        enrollments(count)
      `
      )
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (coursesError) {
      return NextResponse.json(
        { error: "Failed to fetch courses" },
        { status: 500 }
      );
    }

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
