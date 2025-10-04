import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { createClient } from "@/lib/supabase/server";

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || "ai-course-documents";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const activityId = formData.get("activityId") as string;
    const nodeId = formData.get("nodeId") as string;
    const maxSlides = parseInt(formData.get("maxSlides") as string) || 50;
    const autoAdvance = formData.get("autoAdvance") === "true";
    const slideDuration = parseInt(formData.get("slideDuration") as string) || 5;

    if (!file || !activityId || !nodeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${user.id}/${activityId}/${nodeId}/slideshow_${timestamp}.${fileExtension}`;

    // Upload to Google Cloud Storage
    const bucket = storage.bucket(bucketName);
    const fileUpload = bucket.file(fileName);
    
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          userId: user.id,
          activityId,
          nodeId,
          type: 'slideshow',
        },
      },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', resolve);
      stream.end(buffer);
    });

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // For now, we'll create mock slides since we don't have a PowerPoint parser
    // In a real implementation, you'd use a library like 'pptx-parser' or similar
    const mockSlides = [
      "Welcome to the presentation",
      "Introduction and overview",
      "Key concepts and ideas",
      "Detailed analysis",
      "Examples and case studies",
      "Best practices",
      "Implementation strategies",
      "Challenges and solutions",
      "Future considerations",
      "Conclusion and next steps"
    ].slice(0, Math.min(maxSlides, 10)); // Limit to maxSlides or 10, whichever is smaller

    // Extract text content if it's a PDF
    let extractedText = "";
    if (file.type === "application/pdf") {
      try {
        // In a real implementation, you'd use a PDF parser here
        extractedText = "PDF content extracted (mock implementation)";
      } catch (error) {
        console.error("Error extracting PDF text:", error);
      }
    }

    // Save to database
    const { error: dbError } = await supabase
      .from("slideshow_data")
      .insert({
        id: `slides_${timestamp}`,
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        slides: mockSlides,
        current_slide: 0,
        auto_advance: autoAdvance,
        slide_duration: slideDuration,
        google_cloud_url: publicUrl,
        processing_status: "completed",
        user_id: user.id,
        activity_id: activityId,
        node_id: nodeId,
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ error: "Failed to save slideshow info" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      slideshow: {
        id: `slides_${timestamp}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        slides: mockSlides,
        currentSlide: 0,
        autoAdvance,
        slideDuration,
        url: publicUrl,
        fileSize: file.size,
        mimeType: file.type,
        extractedText,
      },
    });

  } catch (error) {
    console.error("Slideshow upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slideshowId } = await request.json();

    // Get slideshow info from database
    const { data: slideshow, error: fetchError } = await supabase
      .from("slideshow_data")
      .select("*")
      .eq("id", slideshowId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !slideshow) {
      return NextResponse.json({ error: "Slideshow not found" }, { status: 404 });
    }

    // Extract file path from URL
    const urlParts = slideshow.google_cloud_url.split("/");
    const fileName = urlParts.slice(4).join("/"); // Remove https://storage.googleapis.com/bucket-name/

    // Delete from Google Cloud Storage
    try {
      await storage.bucket(bucketName).file(fileName).delete();
    } catch (error) {
      console.error("Error deleting from storage:", error);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("slideshow_data")
      .delete()
      .eq("id", slideshowId)
      .eq("user_id", user.id);

    if (dbError) {
      return NextResponse.json({ error: "Failed to delete slideshow info" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Slideshow delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
