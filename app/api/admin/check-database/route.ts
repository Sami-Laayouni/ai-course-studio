import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Check if essential tables exist
    const tables = [
      "profiles",
      "courses",
      "activities",
      "enrollments",
      "student_progress",
    ];

    const results: Record<string, boolean> = {};

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select("*").limit(1);

        results[table] = !error;
      } catch {
        results[table] = false;
      }
    }

    // Check if trigger exists
    const { data: triggerData } = await supabase.rpc("sql", {
      query: `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
          ) as trigger_exists;
        `,
    });

    // Get user count
    const { count: userCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      tables: results,
      triggerExists: triggerData?.[0]?.trigger_exists || false,
      userCount: userCount || 0,
      message: "Database check completed",
    });
  } catch (error) {
    console.error("Database check error:", error);
    return NextResponse.json(
      {
        error: "Database check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
