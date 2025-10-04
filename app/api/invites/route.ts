import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, target_id, expires_at, max_uses, settings } = body;

    // Verify user has permission to create invite for this target
    let hasPermission = false;

    if (type === "course") {
      const { data: course } = await supabase
        .from("courses")
        .select("teacher_id")
        .eq("id", target_id)
        .single();
      hasPermission = course?.teacher_id === user.id;
    } else if (type === "lesson") {
      const { data: lesson } = await supabase
        .from("lessons")
        .select("courses(teacher_id)")
        .eq("id", target_id)
        .single();
      hasPermission = lesson?.courses?.teacher_id === user.id;
    } else if (type === "activity") {
      const { data: activity } = await supabase
        .from("activities")
        .select("courses(teacher_id)")
        .eq("id", target_id)
        .single();
      hasPermission = activity?.courses?.teacher_id === user.id;
    }

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create invite using database function
    const { data: inviteCode, error } = await supabase.rpc(
      "create_invite_link",
      {
        p_type: type,
        p_target_id: target_id,
        p_created_by: user.id,
        p_expires_at: expires_at,
        p_max_uses: max_uses,
        p_settings: settings || {},
      }
    );

    if (error) {
      throw error;
    }

    // Get the created invite details
    const { data: invite, error: fetchError } = await supabase
      .from("invite_links")
      .select("*")
      .eq("code", inviteCode)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json({ invite });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const target_id = searchParams.get("target_id");

    let query = supabase
      .from("invite_links")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (type) {
      query = query.eq("type", type);
    }

    if (target_id) {
      query = query.eq("target_id", target_id);
    }

    const { data: invites, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ invites });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
