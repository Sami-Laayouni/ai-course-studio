import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const course_id = searchParams.get("course_id");
    const student_id = searchParams.get("student_id");

    // Check authentication
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

    let query = supabase
      .from("assignments")
      .select(
        `
        *,
        courses(title, subject),
        lessons(title, description),
        profiles(full_name)
      `
      )
      .eq("is_published", true);

    if (profile?.role === "student") {
      // Students can only see assignments for courses they're enrolled in
      if (course_id) {
        // Check if student is enrolled in this course
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("student_id", user.id)
          .eq("course_id", course_id)
          .single();

        if (!enrollment) {
          return NextResponse.json(
            { error: "Not enrolled in this course" },
            { status: 403 }
          );
        }

        query = query.eq("course_id", course_id);
      } else {
        // Get all courses student is enrolled in
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("student_id", user.id);

        if (enrollments && enrollments.length > 0) {
          const courseIds = enrollments.map((e) => e.course_id);
          query = query.in("course_id", courseIds);
        } else {
          return NextResponse.json({ assignments: [] });
        }
      }
    } else if (profile?.role === "teacher") {
      // Teachers can see assignments for their courses
      if (course_id) {
        // Verify teacher owns this course
        const { data: course } = await supabase
          .from("courses")
          .select("teacher_id")
          .eq("id", course_id)
          .single();

        if (!course || course.teacher_id !== user.id) {
          return NextResponse.json(
            { error: "Not authorized to view this course" },
            { status: 403 }
          );
        }

        query = query.eq("course_id", course_id);
      } else {
        // Get all courses taught by this teacher
        const { data: courses } = await supabase
          .from("courses")
          .select("id")
          .eq("teacher_id", user.id);

        if (courses && courses.length > 0) {
          const courseIds = courses.map((c) => c.id);
          query = query.in("course_id", courseIds);
        } else {
          return NextResponse.json({ assignments: [] });
        }
      }
    }

    const { data: assignments, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      throw error;
    }

    // For students, also get their submission status
    if (profile?.role === "student") {
      const assignmentIds = assignments?.map((a) => a.id) || [];
      if (assignmentIds.length > 0) {
        const { data: submissions } = await supabase
          .from("assignment_submissions")
          .select("assignment_id, status, grade, submitted_at")
          .eq("student_id", user.id)
          .in("assignment_id", assignmentIds);

        // Add submission status to assignments
        const submissionsMap = new Map();
        submissions?.forEach((sub) => {
          submissionsMap.set(sub.assignment_id, sub);
        });

        assignments?.forEach((assignment) => {
          assignment.submission = submissionsMap.get(assignment.id) || null;
        });
      }
    }

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      course_id,
      lesson_id,
      title,
      description,
      instructions,
      due_date,
      points,
      is_published,
    } = body;

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
        { error: "Unauthorized to create assignments for this course" },
        { status: 403 }
      );
    }

    // Create assignment
    const { data: assignment, error } = await supabase
      .from("assignments")
      .insert({
        course_id,
        lesson_id: lesson_id || null,
        title,
        description,
        instructions,
        due_date: due_date ? new Date(due_date).toISOString() : null,
        points: points || 0,
        is_published: is_published || false,
        created_by: user.id,
      })
      .select(
        `
        *,
        courses(title, subject),
        lessons(title, description)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { assignment_id, ...updates } = body;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is teacher of this assignment's course
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("course_id, courses(teacher_id)")
      .eq("id", assignment_id)
      .single();

    if (assignmentError || assignment.courses.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized to update this assignment" },
        { status: 403 }
      );
    }

    // Update assignment
    const { data: updatedAssignment, error } = await supabase
      .from("assignments")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment_id)
      .select(
        `
        *,
        courses(title, subject),
        lessons(title, description)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ assignment: updatedAssignment });
  } catch (error) {
    console.error("Error updating assignment:", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const assignment_id = searchParams.get("id");

    if (!assignment_id) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is teacher of this assignment's course
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("course_id, courses(teacher_id)")
      .eq("id", assignment_id)
      .single();

    if (assignmentError || assignment.courses.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized to delete this assignment" },
        { status: 403 }
      );
    }

    // Delete assignment
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignment_id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
