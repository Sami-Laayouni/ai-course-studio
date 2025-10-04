import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { course_id, expires_at, max_uses } = body;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is teacher of this course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("teacher_id")
      .eq("id", course_id)
      .single();

    if (courseError || course.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized to create invites for this course" },
        { status: 403 }
      );
    }

    // Create invite using database function
    const { data: inviteId, error: inviteError } = await supabase.rpc(
      "create_course_invite",
      {
        p_course_id: course_id,
        p_created_by: user.id,
        p_expires_at: expires_at || null,
        p_max_uses: max_uses || null,
      }
    );

    if (inviteError) {
      throw inviteError;
    }

    // Get the created invite with token
    const { data: invite, error: fetchError } = await supabase
      .from("course_invites")
      .select("*")
      .eq("id", inviteId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        invite_token: invite.invite_token,
        expires_at: invite.expires_at,
        max_uses: invite.max_uses,
        used_count: invite.used_count,
        invite_url: `${process.env.NEXT_PUBLIC_APP_URL}/join/course/${invite.invite_token}`,
      },
    });
  } catch (error) {
    console.error("Error creating course invite:", error);
    return NextResponse.json(
      { error: "Failed to create course invite" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const course_id = searchParams.get("course_id");

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("course_invites")
      .select(
        `
        *,
        courses(title, subject, grade_level)
      `
      )
      .eq("created_by", user.id);

    if (course_id) {
      query = query.eq("course_id", course_id);
    }

    const { data: invites, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      throw error;
    }

    // Add invite URLs
    const invitesWithUrls = invites?.map((invite) => ({
      ...invite,
      invite_url: `${process.env.NEXT_PUBLIC_APP_URL}/join/course/${invite.invite_token}`,
    }));

    return NextResponse.json({ invites: invitesWithUrls });
  } catch (error) {
    console.error("Error fetching course invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch course invites" },
      { status: 500 }
    );
  }
}
