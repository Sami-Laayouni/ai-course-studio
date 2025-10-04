import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Test basic connection
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    console.log("User:", user);
    console.log("User error:", userError);

    // Test activities table specifically
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select("*")
      .limit(1);

    console.log("Activities:", activities);
    console.log("Activities error:", activitiesError);

    // Test lessons table specifically
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("*")
      .limit(1);

    console.log("Lessons:", lessons);
    console.log("Lessons error:", lessonsError);

    return NextResponse.json({
      success: true,
      user: user ? { id: user.id, email: user.email } : null,
      userError: userError?.message,
      activities: activities || [],
      activitiesError: activitiesError?.message,
      lessons: lessons || [],
      lessonsError: lessonsError?.message,
    });
  } catch (error) {
    console.error("Error in test-db:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
