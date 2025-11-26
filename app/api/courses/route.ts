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

    // Generate a random 6-character join code
    const generateJoinCode = (): string => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    // Generate unique join code (only check uniqueness if column exists)
    let joinCode = generateJoinCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Check if code already exists and regenerate if needed
    // This will fail silently if join_code column doesn't exist, which is fine
    try {
      while (attempts < maxAttempts) {
        const { data: existingCourse, error: checkError } = await supabase
          .from("courses")
          .select("id")
          .eq("join_code", joinCode)
          .single();

        // If column doesn't exist, skip uniqueness check
        if (checkError && checkError.message?.includes("join_code")) {
          break;
        }

        if (!existingCourse) {
          break; // Code is unique
        }

        joinCode = generateJoinCode();
        attempts++;
      }
    } catch (error) {
      // If join_code column doesn't exist, just use the generated code
      console.log("Could not check join_code uniqueness, column may not exist");
    }

    // Insert course - try with join_code first, fallback without it if column doesn't exist
    let courseData: any = {
      title,
      description: description || null,
      subject,
      grade_level,
      learning_objectives: learning_objectives || [],
      teacher_id: user.id,
      is_published: false,
    };

    // Only add join_code if the column exists (check by trying to insert with it)
    // If it fails, we'll retry without it
    let { data: course, error: insertError } = await supabase
      .from("courses")
      .insert({
        ...courseData,
        join_code: joinCode, // Auto-generated join code
      })
      .select()
      .single();

    // If join_code column doesn't exist, insert without it
    if (insertError && insertError.message?.includes("join_code")) {
      console.log("join_code column not found, inserting without it");
      const { data: courseWithoutCode, error: insertErrorWithoutCode } = await supabase
        .from("courses")
        .insert(courseData)
        .select()
        .single();
      
      course = courseWithoutCode;
      insertError = insertErrorWithoutCode;
    }

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
