import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, email, full_name, role, school_name } = body;

    // Validate required fields
    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    // Validate role
    if (role && !["admin", "teacher", "student"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Use service role client to bypass RLS for profile creation
    // This allows creating profiles for unconfirmed users
    const serviceClient = createServiceClient();

    // Get user email if not provided
    let userEmail = email;
    if (!userEmail) {
      // Try to get email from auth.users using service role
      const { data: authUser } = await serviceClient.auth.admin.getUserById(user_id);
      userEmail = authUser?.user?.email || "";
    }

    // Create or update profile using service role (bypasses RLS)
    const { error: profileError } = await serviceClient.from("profiles").upsert({
      id: user_id,
      email: userEmail,
      full_name: full_name || "",
      role: role || "teacher",
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
