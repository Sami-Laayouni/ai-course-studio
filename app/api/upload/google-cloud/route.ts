import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { createClient } from "@/lib/supabase/server";

// Initialize Google Cloud clients
const storage = new Storage({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

const documentAI = new DocumentProcessorServiceClient({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || "ai-course-documents";

// Force Node.js runtime for this route (required for Google Cloud SDKs)
export const runtime = 'nodejs';

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
    const extractText = formData.get("extractText") === "true";

    if (!file || !activityId || !nodeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${user.id}/${activityId}/${nodeId}/${timestamp}.${fileExtension}`;

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

    let extractedText = "";
    let keyPoints: string[] = [];
    let keyConcepts: string[] = [];

    // Extract text if requested and file is PDF
    if (extractText && file.type === "application/pdf") {
      try {
        const [result] = await documentAI.processDocument({
          name: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/us/processors/${process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID}`,
          rawDocument: {
            content: buffer,
            mimeType: file.type,
          },
        });

        extractedText = result.document?.text || "";

        // Extract key points and concepts using AI
        if (extractedText) {
          const keyPointsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/extract-key-points`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: extractedText }),
          });
          
          if (keyPointsResponse.ok) {
            const keyPointsData = await keyPointsResponse.json();
            keyPoints = keyPointsData.keyPoints || [];
            keyConcepts = keyPointsData.keyConcepts || [];
          }
        }
      } catch (error) {
        console.error("Error extracting text:", error);
        // Continue without extracted text
      }
    }

    // Save to database
    const { error: dbError } = await supabase
      .from("context_sources")
      .insert({
        id: `doc_${timestamp}`,
        type: "document",
        title: file.name,
        url: publicUrl,
        filename: file.name,
        summary: extractedText.substring(0, 500) + (extractedText.length > 500 ? "..." : ""),
        key_points: keyPoints,
        key_concepts: keyConcepts,
        user_id: user.id,
        activity_id: activityId,
        node_id: nodeId,
        file_size: file.size,
        mime_type: file.type,
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ error: "Failed to save document info" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: `doc_${timestamp}`,
        title: file.name,
        url: publicUrl,
        extractedText,
        keyPoints,
        keyConcepts,
        fileSize: file.size,
        mimeType: file.type,
      },
    });

  } catch (error) {
    console.error("Upload error:", error);
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

    const { documentId } = await request.json();

    // Get document info from database
    const { data: document, error: fetchError } = await supabase
      .from("context_sources")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Extract file path from URL
    const urlParts = document.url.split("/");
    const fileName = urlParts.slice(4).join("/"); // Remove https://storage.googleapis.com/bucket-name/

    // Delete from Google Cloud Storage
    try {
      await storage.bucket(bucketName).file(fileName).delete();
    } catch (error) {
      console.error("Error deleting from storage:", error);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("context_sources")
      .delete()
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (dbError) {
      return NextResponse.json({ error: "Failed to delete document info" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
