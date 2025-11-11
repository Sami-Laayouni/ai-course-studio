import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Check for required environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
      return NextResponse.json(
        { error: "Server configuration error: Missing Supabase URL" },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { error: "Server configuration error: Missing Supabase service role key. Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables." },
        { status: 500 }
      );
    }

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
    let serviceClient;
    try {
      serviceClient = createServiceClient();
    } catch (clientError) {
      console.error("Failed to create service client:", clientError);
      return NextResponse.json(
        { error: "Server configuration error", details: clientError instanceof Error ? clientError.message : String(clientError) },
        { status: 500 }
      );
    }

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
