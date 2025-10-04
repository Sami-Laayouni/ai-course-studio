import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courseId = params.id;

    // Verify course access
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, teacher_id")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if user has access to the course
    const { data: enrollment } = await supabase
      .from("course_enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("student_id", user.id)
      .single();

    if (course.teacher_id !== user.id && !enrollment) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get context sources for the course
    const { data: contextSources, error: sourcesError } = await supabase
      .from("context_sources")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    if (sourcesError) {
      console.error("Error fetching context sources:", sourcesError);
      return NextResponse.json(
        { error: "Failed to fetch context sources" },
        { status: 500 }
      );
    }

    // Also get PDFs from activities in this course
    const { data: pdfActivities, error: pdfError } = await supabase
      .from("activities")
      .select("id, title, content")
      .eq("course_id", courseId)
      .eq("type", "pdf");

    if (!pdfError && pdfActivities) {
      const pdfSources = pdfActivities
        .filter((activity) => activity.content?.pdf_url)
        .map((activity) => ({
          id: `pdf_${activity.id}`,
          type: "pdf" as const,
          title: activity.title,
          filename: activity.content.pdf_url.split("/").pop(),
          summary: activity.content.pdf_summary || "PDF document",
          key_points: activity.content.key_points || [],
          url: activity.content.pdf_url,
          created_at: new Date().toISOString(),
        }));

      contextSources?.push(...pdfSources);
    }

    // Also get YouTube videos from activities in this course
    const { data: videoActivities, error: videoError } = await supabase
      .from("activities")
      .select("id, title, content")
      .eq("course_id", courseId)
      .eq("type", "youtube");

    if (!videoError && videoActivities) {
      const videoSources = videoActivities
        .filter((activity) => activity.content?.video_url)
        .map((activity) => ({
          id: `youtube_${activity.id}`,
          type: "youtube" as const,
          title: activity.title,
          url: activity.content.video_url,
          summary: activity.content.video_summary || "YouTube video",
          key_concepts: activity.content.key_concepts || [],
          thumbnail: activity.content.thumbnail || `https://img.youtube.com/vi/${extractVideoId(activity.content.video_url)}/maxresdefault.jpg`,
          created_at: new Date().toISOString(),
        }));

      contextSources?.push(...videoSources);
    }

    return NextResponse.json({
      sources: contextSources || [],
    });
  } catch (error) {
    console.error("Context sources API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
