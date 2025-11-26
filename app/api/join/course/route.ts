import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { join_code } = body;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Normalize join code: trim whitespace and convert to uppercase
    const normalizedJoinCode = join_code?.trim().toUpperCase();
    
    if (!normalizedJoinCode) {
      return NextResponse.json({ error: "Join code is required" }, { status: 400 });
    }

    console.log("Looking for join code:", normalizedJoinCode);

    // IMPORTANT: We need to use a service role client or bypass RLS for this query
    // because students can't see courses they're not enrolled in yet
    // For now, let's try with the current client and see if RLS allows it
    // If not, we'll need to use a service role or add a specific RLS policy
    
    // Get course by join code (normalized to uppercase for consistent matching)
    // First try direct query
    let { data: courses, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("join_code", normalizedJoinCode);
    
    console.log("Direct query result:", { courses, courseError });

    // If query returns no results or fails, try fetching all and filtering in memory
    // This handles cases where join_code might be NULL or stored differently
    if (courseError || !courses || courses.length === 0) {
      console.log("Direct query failed or returned no results, trying fallback. Error:", courseError);
      
      // Fetch all courses and filter in memory
      const { data: allCourses, error: allCoursesError } = await supabase
        .from("courses")
        .select("*");
      
      if (!allCoursesError && allCourses) {
        // Filter in memory - handle NULL, case-insensitive matching, and whitespace
        const matchingCourse = allCourses.find(c => {
          if (!c.join_code) return false;
          const courseJoinCode = String(c.join_code).trim().toUpperCase();
          return courseJoinCode === normalizedJoinCode;
        });
        
        if (matchingCourse) {
          courses = [matchingCourse];
          courseError = null;
        } else {
          courseError = { code: "PGRST116", message: "Course not found" };
        }
      } else if (allCoursesError) {
        console.error("Failed to fetch courses:", allCoursesError);
        courseError = allCoursesError;
      }
    }

    let course = courses && courses.length > 0 ? courses[0] : null;

    // If course not found, it might be because the course doesn't have a join_code yet
    // In that case, we can't help - the teacher needs to generate one first
    if (courseError || !course) {
      console.error("Course not found. Error:", courseError);
      console.error("Join code searched:", normalizedJoinCode);
      
      // Debug: Check what join codes exist in the database
      const { data: sampleCourses } = await supabase
        .from("courses")
        .select("id, title, join_code")
        .limit(5);
      
      console.log("Sample courses with join codes:", sampleCourses?.map(c => ({
        id: c.id,
        title: c.title,
        join_code: c.join_code || "NULL"
      })));
      
      // Check if join_code column exists by trying to select it
      const { data: testCourse, error: testError } = await supabase
        .from("courses")
        .select("id, join_code")
        .limit(1)
        .single();
      
      if (testError && testError.message?.includes("join_code")) {
        return NextResponse.json({ 
          error: "Join codes are not enabled",
          details: "The join_code column does not exist in the database. Please run the database migration script to add join codes support."
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: "Invalid join code",
        details: `No course found with join code "${normalizedJoinCode}". Please verify the code is correct. If you're a teacher, make sure your course has a join code generated.`
      }, { status: 404 });
    }
    
    // Ensure the course has a join code (shouldn't happen, but just in case)
    if (!course.join_code) {
      console.log("Course found but has no join code, generating one...");
      
      // Generate a unique join code
      const generateJoinCode = (): string => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      
      let newJoinCode = generateJoinCode();
      let attempts = 0;
      const maxAttempts = 10;
      
      // Check uniqueness
      while (attempts < maxAttempts) {
        const { data: existing } = await supabase
          .from("courses")
          .select("id")
          .eq("join_code", newJoinCode)
          .single();
        
        if (!existing) break;
        newJoinCode = generateJoinCode();
        attempts++;
      }
      
      // Update the course with the new join code
      const { error: updateError } = await supabase
        .from("courses")
        .update({ join_code: newJoinCode })
        .eq("id", course.id);
      
      if (updateError) {
        console.error("Failed to generate join code:", updateError);
        return NextResponse.json({ 
          error: "Failed to generate join code",
          details: "The course was found but doesn't have a join code, and we couldn't generate one."
        }, { status: 500 });
      }
      
      course.join_code = newJoinCode;
      console.log("Generated join code for course:", newJoinCode);
    }

    // Check if student is already enrolled
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", user.id)
      .eq("course_id", course.id)
      .single();

    if (enrollmentError && enrollmentError.code !== "PGRST116") {
      throw enrollmentError;
    }

    // If not enrolled, create enrollment
    if (!enrollment) {
      const { error: enrollError } = await supabase
        .from("enrollments")
        .insert({
          student_id: user.id,
          course_id: course.id,
          enrolled_at: new Date().toISOString(),
          progress_percentage: 0,
        });

      if (enrollError) {
        throw enrollError;
      }
    }

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
      },
    });
  } catch (error) {
    console.error("Error joining course:", error);
    return NextResponse.json(
      { error: "Failed to join course" },
      { status: 500 }
    );
  }
}
