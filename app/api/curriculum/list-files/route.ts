import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/lib/gcs";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // This route uses cookies/auth, must be dynamic

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }

    // Verify user is teacher of this course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("teacher_id")
      .eq("id", courseId)
      .single();

    if (courseError || !course || course.teacher_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // List files in user's curriculum folder for this course
    const prefix = `${user.id}/curriculum/${courseId}/`;
    const [files] = await bucket.getFiles({ prefix });

    // Generate signed URLs for each file (1 hour expiry)
    const fileUrls = await Promise.all(
      files.map(async (file) => {
        const [url] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });

        const [metadata] = await file.getMetadata();
        
        return {
          name: file.name.split('/').pop() || file.name,
          path: file.name,
          url,
          size: metadata.size,
          contentType: metadata.contentType,
          created: metadata.timeCreated,
        };
      })
    );

    return NextResponse.json({ files: fileUrls });
  } catch (error: any) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list files" },
      { status: 500 }
    );
  }
}

