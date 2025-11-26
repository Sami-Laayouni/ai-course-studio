import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/lib/gcs";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // This route uses cookies/auth, must be dynamic

export async function POST(request: NextRequest) {
  console.log("📤 [GET UPLOAD URL] Starting upload URL generation...");
  
  try {
    const supabase = await createClient();
    console.log("📤 [GET UPLOAD URL] Supabase client created");
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("❌ [GET UPLOAD URL] Auth error:", userError);
      return NextResponse.json({ 
        error: "Authentication failed",
        details: userError.message
      }, { status: 401 });
    }
    
    if (!user) {
      console.error("❌ [GET UPLOAD URL] No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log("📤 [GET UPLOAD URL] User authenticated:", user.id);

    const requestBody = await request.json();
    console.log("📤 [GET UPLOAD URL] Request body:", {
      hasFilename: !!requestBody.filename,
      hasCourseId: !!requestBody.courseId,
      hasContentType: !!requestBody.contentType,
      filename: requestBody.filename,
      courseId: requestBody.courseId,
      contentType: requestBody.contentType,
    });
    
    const { filename, courseId, contentType } = requestBody;

    if (!filename || !courseId) {
      console.error("❌ [GET UPLOAD URL] Missing required fields:", {
        hasFilename: !!filename,
        hasCourseId: !!courseId,
        received: Object.keys(requestBody)
      });
      return NextResponse.json({ 
        error: "Missing filename or courseId",
        received: Object.keys(requestBody)
      }, { status: 400 });
    }

    // Verify user is teacher of this course
    console.log("📤 [GET UPLOAD URL] Verifying course ownership...");
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("teacher_id")
      .eq("id", courseId)
      .single();

    if (courseError) {
      console.error("❌ [GET UPLOAD URL] Course fetch error:", courseError);
      return NextResponse.json({ 
        error: "Failed to verify course",
        details: courseError.message
      }, { status: 500 });
    }
    
    if (!course) {
      console.error("❌ [GET UPLOAD URL] Course not found:", courseId);
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    
    if (course.teacher_id !== user.id) {
      console.error("❌ [GET UPLOAD URL] User is not teacher. User:", user.id, "Teacher:", course.teacher_id);
      return NextResponse.json({ error: "Unauthorized - Not course teacher" }, { status: 403 });
    }
    
    console.log("✅ [GET UPLOAD URL] Course verified, user is teacher");

    // Generate unique filename with user folder structure
    const timestamp = Date.now();
    const fileExtension = filename.split('.').pop() || 'pdf';
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/curriculum/${courseId}/${timestamp}_${sanitizedFilename}`;
    
    console.log("📤 [GET UPLOAD URL] Generated file path:", filePath);
    console.log("📤 [GET UPLOAD URL] Bucket:", process.env.GOOGLE_CLOUD_BUCKET_NAME);

    const file = bucket.file(filePath);

    // Generate signed URL for upload (15 minutes expiry)
    // Use the actual content type from the request, or default to application/octet-stream
    // The frontend MUST send the EXACT same Content-Type header that we use here
    const uploadContentType = contentType || 'application/octet-stream';
    console.log("📤 [GET UPLOAD URL] Generating signed URL with content type:", uploadContentType);
    try {
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: uploadContentType, // Use the actual file content type
      });
      
      console.log("✅ [GET UPLOAD URL] Signed URL generated successfully");
      console.log("📤 [GET UPLOAD URL] Returning URL and filePath");

      return NextResponse.json({
        url,
        filePath, // Return the path so we can use it after upload
      });
    } catch (urlError: any) {
      console.error("❌ [GET UPLOAD URL] Error generating signed URL:", urlError);
      console.error("❌ [GET UPLOAD URL] Error details:", {
        message: urlError.message,
        code: urlError.code,
        stack: urlError.stack
      });
      throw urlError;
    }
  } catch (error: any) {
    console.error("❌ [GET UPLOAD URL] Error generating upload URL:", error);
    console.error("❌ [GET UPLOAD URL] Error message:", error.message);
    console.error("❌ [GET UPLOAD URL] Error stack:", error.stack);
    return NextResponse.json(
      { 
        error: "Failed to generate upload URL",
        details: error.message,
        type: error.constructor.name
      },
      { status: 500 }
    );
  }
}

