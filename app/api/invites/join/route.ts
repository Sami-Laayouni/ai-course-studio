import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { invite_token, invite_type } = body;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let success = false;
    let message = "";
    let data = {};

    if (invite_type === "course") {
      // Use course invite
      const { data: result, error } = await supabase.rpc("use_course_invite", {
        p_invite_token: invite_token,
        p_student_id: user.id,
      });

      if (error) {
        throw error;
      }

      success = result;
      message = success
        ? "Successfully joined the course!"
        : "Invalid or expired invite token";

      if (success) {
        // Get course details
        const { data: courseInvite } = await supabase
          .from("course_invites")
          .select("course_id")
          .eq("invite_token", invite_token)
          .single();

        if (courseInvite) {
          const { data: course } = await supabase
            .from("courses")
            .select("id, title, description, subject")
            .eq("id", courseInvite.course_id)
            .single();

          data = { course };
        }
      }
    } else if (invite_type === "lesson") {
      // Use lesson invite
      const { data: result, error } = await supabase.rpc("use_lesson_invite", {
        p_invite_token: invite_token,
        p_student_id: user.id,
      });

      if (error) {
        throw error;
      }

      success = result;
      message = success
        ? "Successfully joined the lesson!"
        : "Invalid or expired invite token";

      if (success) {
        // Get lesson details
        const { data: lessonInvite } = await supabase
          .from("lesson_invites")
          .select(
            `
            lesson_id,
            course_id,
            lessons(title, description),
            courses(title, subject)
          `
          )
          .eq("invite_token", invite_token)
          .single();

        if (lessonInvite) {
          data = {
            lesson: lessonInvite.lessons,
            course: lessonInvite.courses,
          };
        }
      }
    } else {
      return NextResponse.json(
        { error: "Invalid invite type" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success,
      message,
      data,
    });
  } catch (error) {
    console.error("Error using invite:", error);
    return NextResponse.json(
      { error: "Failed to use invite" },
      { status: 500 }
    );
  }
}
