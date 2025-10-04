import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const assignment_id = searchParams.get("assignment_id");
    const course_id = searchParams.get("course_id");

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

    let query = supabase.from("assignment_submissions").select(`
        *,
        assignments(title, points, due_date),
        profiles(full_name, email),
        courses(title, subject)
      `);

    if (profile?.role === "student") {
      // Students can only see their own submissions
      query = query.eq("student_id", user.id);
    } else if (profile?.role === "teacher") {
      // Teachers can see all submissions for their courses
      if (course_id) {
        // Verify teacher owns this course
        const { data: course } = await supabase
          .from("courses")
          .select("teacher_id")
          .eq("id", course_id)
          .single();

        if (!course || course.teacher_id !== user.id) {
          return NextResponse.json(
            { error: "Not authorized to view submissions for this course" },
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
          return NextResponse.json({ submissions: [] });
        }
      }
    }

    if (assignment_id) {
      query = query.eq("assignment_id", assignment_id);
    }

    const { data: submissions, error } = await query.order("submitted_at", {
      ascending: false,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { assignment_id, submission_data, status } = body;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(
        `
        id, course_id, title, due_date, points,
        courses(teacher_id)
      `
      )
      .eq("id", assignment_id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Check if student is enrolled in the course
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("course_id", assignment.course_id)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: "Not enrolled in this course" },
        { status: 403 }
      );
    }

    // Check if assignment is still open (if due date has passed)
    if (assignment.due_date && new Date(assignment.due_date) < new Date()) {
      return NextResponse.json(
        { error: "Assignment deadline has passed" },
        { status: 400 }
      );
    }

    // Create or update submission
    const submissionData = {
      assignment_id,
      student_id: user.id,
      course_id: assignment.course_id,
      submission_data: submission_data || {},
      status: status || "submitted",
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
    };

    const { data: submission, error } = await supabase
      .from("assignment_submissions")
      .upsert(submissionData, {
        onConflict: "assignment_id,student_id",
      })
      .select(
        `
        *,
        assignments(title, points, due_date)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    // Create notification for teacher
    if (status === "submitted") {
      await supabase.from("notifications").insert({
        user_id: assignment.courses.teacher_id,
        type: "assignment",
        title: "New Assignment Submission",
        message: `A student has submitted: ${assignment.title}`,
        data: {
          assignment_id: assignment.id,
          student_id: user.id,
          submission_id: submission.id,
        },
      });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { submission_id, grade, feedback, status } = body;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from("assignment_submissions")
      .select(
        `
        *,
        assignments(course_id, courses(teacher_id))
      `
      )
      .eq("id", submission_id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Check if user is authorized to grade this submission
    const isTeacher = submission.assignments.courses.teacher_id === user.id;
    const isStudent = submission.student_id === user.id;

    if (!isTeacher && !isStudent) {
      return NextResponse.json(
        { error: "Unauthorized to update this submission" },
        { status: 403 }
      );
    }

    // Students can only update their own submission status and data
    // Teachers can grade and provide feedback
    const updateData: any = {};

    if (isStudent) {
      updateData.status = status;
      if (status === "submitted") {
        updateData.submitted_at = new Date().toISOString();
      }
    }

    if (isTeacher) {
      if (grade !== undefined) updateData.grade = grade;
      if (feedback !== undefined) updateData.feedback = feedback;
      if (status) updateData.status = status;
      if (grade !== undefined || feedback !== undefined) {
        updateData.graded_at = new Date().toISOString();
      }
    }

    const { data: updatedSubmission, error } = await supabase
      .from("assignment_submissions")
      .update(updateData)
      .eq("id", submission_id)
      .select(
        `
        *,
        assignments(title, points, due_date),
        profiles(full_name, email)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    // Create notification for student if teacher graded it
    if (isTeacher && (grade !== undefined || feedback !== undefined)) {
      await supabase.from("notifications").insert({
        user_id: submission.student_id,
        type: "grade",
        title: "Assignment Graded",
        message: `Your assignment "${submission.assignments.title}" has been graded`,
        data: {
          assignment_id: submission.assignment_id,
          submission_id: submission.id,
          grade: grade,
        },
      });
    }

    return NextResponse.json({ submission: updatedSubmission });
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}
