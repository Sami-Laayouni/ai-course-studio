import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the course and verify ownership
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, teacher_id")
      .eq("id", id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Verify the user is the teacher
    if (course.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - You are not the teacher of this course" },
        { status: 403 }
      );
    }

    // Get all enrollments for this course
    // Try both enrollments and course_enrollments tables since different endpoints use different tables
    let enrollments: any[] = [];
    let enrollmentsError: any = null;

    // Try enrollments table first
    const { data: enrollmentsData, error: enrollmentsDataError } = await supabase
      .from("enrollments")
      .select("id, student_id, enrolled_at, progress_percentage")
      .eq("course_id", id)
      .order("enrolled_at", { ascending: false });

    console.log("Enrollments query result:", { enrollmentsData, enrollmentsDataError });

    if (!enrollmentsDataError && enrollmentsData && enrollmentsData.length > 0) {
      enrollments = enrollmentsData;
    } else if (enrollmentsDataError) {
      console.log("Enrollments table query failed, trying course_enrollments...");
      enrollmentsError = enrollmentsDataError;
    }

    // If no enrollments found or error, try course_enrollments table
    if (enrollments.length === 0) {
      console.log("Trying course_enrollments table...");
      const { data: courseEnrollments, error: courseEnrollmentsError } = await supabase
        .from("course_enrollments")
        .select("id, student_id, enrolled_at")
        .eq("course_id", id)
        .order("enrolled_at", { ascending: false });

      console.log("Course enrollments query result:", { courseEnrollments, courseEnrollmentsError });

      if (!courseEnrollmentsError && courseEnrollments && courseEnrollments.length > 0) {
        // Map course_enrollments to enrollments format
        enrollments = courseEnrollments.map((ce: any) => ({
          id: ce.id,
          student_id: ce.student_id,
          enrolled_at: ce.enrolled_at,
          progress_percentage: 0,
        }));
        enrollmentsError = null;
      } else if (courseEnrollmentsError) {
        enrollmentsError = courseEnrollmentsError;
        console.error("Both queries failed. Enrollments error:", enrollmentsDataError);
        console.error("Course enrollments error:", courseEnrollmentsError);
      }
    }

    // If RLS is blocking, provide helpful error message
    if (enrollmentsError && (enrollmentsError?.message?.includes("policy") || enrollmentsError?.code === "42501")) {
      return NextResponse.json(
        { 
          error: "RLS Policy Error", 
          details: "Teachers cannot view enrollments due to RLS policies. Please run the fix_enrollments_rls_for_teachers.sql script in your Supabase SQL Editor.",
          hint: "The RLS policy needs to allow teachers to view enrollments for their courses."
        },
        { status: 403 }
      );
    }

    // If no enrollments found, check if it's an error or just no enrollments
    if (enrollments.length === 0) {
      if (enrollmentsError) {
        console.error("Error fetching enrollments:", enrollmentsError);
        return NextResponse.json(
          { 
            error: "Failed to fetch enrolled students", 
            details: enrollmentsError?.message || "No enrollments found or RLS policy blocking access",
            hint: "Make sure you've run the fix_enrollments_rls_for_teachers.sql script"
          },
          { status: 500 }
        );
      } else {
        // No enrollments found but no error - this is valid (no students enrolled yet)
        console.log("No enrollments found for course:", id);
        return NextResponse.json({
          students: [],
        });
      }
    }

    // Now fetch profiles separately for each student
    // This avoids RLS issues with the join
    const studentIds = enrollments.map((e: any) => e.student_id);
    let profilesMap = new Map();
    
    if (studentIds.length > 0) {
      // Try to fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds);

      console.log("Profiles query result:", { profiles, profilesError, studentIds });

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        console.error("Profile error details:", {
          message: profilesError.message,
          code: profilesError.code,
          details: profilesError.details,
          hint: profilesError.hint,
        });
        
        // If RLS is blocking, provide helpful error message
        if (profilesError.message?.includes("policy") || profilesError.code === "42501") {
          console.error("RLS policy is blocking profile access. Run fix_profiles_rls_for_teachers.sql");
        }
      } else if (profiles && profiles.length > 0) {
        profiles.forEach((p: any) => {
          profilesMap.set(p.id, {
            id: p.id,
            full_name: p.full_name || null,
            email: p.email || null,
          });
        });
        console.log("Successfully fetched profiles:", profiles.length, profiles);
      } else {
        console.warn("No profiles found for student IDs:", studentIds);
        console.warn("This might mean:");
        console.warn("1. Profiles don't exist for these students");
        console.warn("2. RLS policy is blocking access");
        console.warn("3. Profiles exist but query returned empty");
      }

      // If we still don't have profiles, try to get email from auth.users
      // Note: This requires admin access, so we'll just log it for now
      for (const studentId of studentIds) {
        if (!profilesMap.has(studentId)) {
          // Try to get user email from auth.users (this might require admin access)
          // For now, we'll create a basic profile entry
          console.log("Missing profile for student:", studentId);
        }
      }
    }

    // Combine enrollments with profiles
    const enrollmentsWithProfiles = enrollments.map((enrollment: any) => {
      const profile = profilesMap.get(enrollment.student_id);
      
      // If no profile found, try to get at least the email from auth.users
      if (!profile) {
        console.warn("No profile found for student:", enrollment.student_id);
        // Return with null values - the frontend will show "Unknown Student"
        return {
          ...enrollment,
          profiles: {
            id: enrollment.student_id,
            full_name: null,
            email: null,
          },
        };
      }
      
      return {
        ...enrollment,
        profiles: profile,
      };
    });

    return NextResponse.json({
      students: enrollmentsWithProfiles || [],
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

