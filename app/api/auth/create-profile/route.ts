import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, role, school_name } = body;

    // Validate role
    if (!["admin", "teacher", "student"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Use service role client to bypass RLS for profile creation
    const serviceClient = createServiceClient();

    // Create or update profile using service role (bypasses RLS)
    const { error: profileError } = await serviceClient.from("profiles").upsert({
      id: user.id,
      email: user.email!,
      full_name: full_name || "",
      role: role,
      school_name: school_name || "",
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return NextResponse.json(
        { error: "Failed to create profile", details: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating profile:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
