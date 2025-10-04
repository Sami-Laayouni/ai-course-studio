import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;

    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from("invite_links")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: "Invalid or expired invite" },
        { status: 404 }
      );
    }

    // Check if invite has expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 410 }
      );
    }

    // Check if invite has reached max uses
    if (invite.max_uses && invite.uses_count >= invite.max_uses) {
      return NextResponse.json(
        { error: "Invite has reached maximum uses" },
        { status: 410 }
      );
    }

    // Get target details based on type
    let targetDetails = null;
    if (invite.type === "course") {
      const { data: course } = await supabase
        .from("courses")
        .select(
          "id, title, description, subject, grade_level, teacher_id, profiles(full_name)"
        )
        .eq("id", invite.target_id)
        .single();
      targetDetails = course;
    } else if (invite.type === "lesson") {
      const { data: lesson } = await supabase
        .from("lessons")
        .select(
          `
          id, title, description, learning_objectives, estimated_duration,
          courses(id, title, subject, grade_level, teacher_id, profiles(full_name))
        `
        )
        .eq("id", invite.target_id)
        .single();
      targetDetails = lesson;
    } else if (invite.type === "activity") {
      const { data: activity } = await supabase
        .from("activities")
        .select(
          `
          id, title, description, activity_type, difficulty_level, estimated_duration,
          courses(id, title, subject, grade_level, teacher_id, profiles(full_name))
        `
        )
        .eq("id", invite.target_id)
        .single();
      targetDetails = activity;
    }

    if (!targetDetails) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    return NextResponse.json({
      invite: {
        ...invite,
        target: targetDetails,
      },
    });
  } catch (error) {
    console.error("Error fetching invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;

    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from("invite_links")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: "Invalid or expired invite" },
        { status: 404 }
      );
    }

    // Check if invite has expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 410 }
      );
    }

    // Check if invite has reached max uses
    if (invite.max_uses && invite.uses_count >= invite.max_uses) {
      return NextResponse.json(
        { error: "Invite has reached maximum uses" },
        { status: 410 }
      );
    }

    // Check if user has already used this invite
    const { data: existingUsage } = await supabase
      .from("invite_usage")
      .select("id")
      .eq("invite_id", invite.id)
      .eq("used_by", user.id)
      .single();

    if (existingUsage) {
      return NextResponse.json(
        { error: "You have already used this invite" },
        { status: 409 }
      );
    }

    // Process the invite based on type
    let result = null;
    if (invite.type === "course") {
      // Enroll user in course
      const { data: enrollment, error: enrollError } = await supabase
        .from("enrollments")
        .insert({
          student_id: user.id,
          course_id: invite.target_id,
        })
        .select()
        .single();

      if (enrollError) {
        // If already enrolled, that's okay
        if (enrollError.code !== "23505") {
          throw enrollError;
        }
      }

      result = { type: "course", id: invite.target_id, enrolled: true };
    } else if (invite.type === "lesson") {
      // Get course from lesson and enroll if not already enrolled
      const { data: lesson } = await supabase
        .from("lessons")
        .select("course_id")
        .eq("id", invite.target_id)
        .single();

      if (lesson) {
        const { error: enrollError } = await supabase
          .from("enrollments")
          .insert({
            student_id: user.id,
            course_id: lesson.course_id,
          });

        if (enrollError && enrollError.code !== "23505") {
          // If already enrolled, that's okay
        }
      }

      result = { type: "lesson", id: invite.target_id };
    } else if (invite.type === "activity") {
      // Get course from activity and enroll if not already enrolled
      const { data: activity } = await supabase
        .from("activities")
        .select("course_id")
        .eq("id", invite.target_id)
        .single();

      if (activity) {
        const { error: enrollError } = await supabase
          .from("enrollments")
          .insert({
            student_id: user.id,
            course_id: activity.course_id,
          });

        if (enrollError && enrollError.code !== "23505") {
          // If already enrolled, that's okay
        }
      }

      result = { type: "activity", id: invite.target_id };
    }

    // Record the usage
    await supabase.from("invite_usage").insert({
      invite_id: invite.id,
      used_by: user.id,
    });

    // Update usage count
    await supabase
      .from("invite_links")
      .update({ uses_count: invite.uses_count + 1 })
      .eq("id", invite.id);

    // Send notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "invite",
      title: "Successfully joined!",
      message: `You have successfully joined via invite link.`,
      data: { invite_type: invite.type, target_id: invite.target_id },
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error using invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
