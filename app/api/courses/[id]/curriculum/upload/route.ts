import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bucket, bucketName } from "@/lib/gcs";
import { ai, getModelName, getDefaultConfig } from "@/lib/ai-config";
import pdfParse from "pdf-parse";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // This route uses cookies/auth, must be dynamic

// Extract sections from document text using AI
async function extractSections(text: string): Promise<any[]> {
  try {
    const prompt = `Analyze the following curriculum document and extract all major sections, chapters, or topics. For each section, provide:
1. Section title/heading
2. Approximate page number or location
3. Key concepts covered
4. Brief description

Return a JSON array of sections. Each section should have: title, pageNumber (or location), concepts (array), description.

Document text:
${text.substring(0, 5000)}...`;

    const config = {
      ...getDefaultConfig(),
      responseMimeType: "application/json" as const,
    };

    const response = await ai.models.generateContent({
      model: getModelName(),
      config,
      contents: [
        {
          role: "user",
          text: prompt,
        },
      ],
    });

    let responseText = "";
    if (typeof (response as any).outputText === "function") {
      responseText = (response as any).outputText();
    } else if ((response as any).outputText) {
      responseText = (response as any).outputText;
    } else if (response.text) {
      responseText = typeof response.text === "function" ? response.text() : response.text;
    }

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Error extracting sections:", error);
  }
  
  // Fallback: create basic sections from headings
  const headings = text.match(/^#{1,3}\s+.+$/gm) || [];
  return headings.map((heading, index) => ({
    id: `section_${index}`,
    title: heading.replace(/^#+\s+/, ""),
    pageNumber: Math.floor(index / 3) + 1,
    concepts: [],
    description: "",
  }));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("📤 [CURRICULUM UPLOAD] Starting curriculum upload process...");
  
  try {
    const { id: courseId } = await params;
    console.log("📤 [CURRICULUM UPLOAD] Course ID:", courseId);
    
    const supabase = await createClient();
    console.log("📤 [CURRICULUM UPLOAD] Supabase client created");
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("❌ [CURRICULUM UPLOAD] Auth error:", userError);
      return NextResponse.json({ 
        error: "Authentication failed", 
        details: userError.message 
      }, { status: 401 });
    }
    
    if (!user) {
      console.error("❌ [CURRICULUM UPLOAD] No user found");
      return NextResponse.json({ error: "Unauthorized - No user" }, { status: 401 });
    }
    
    console.log("📤 [CURRICULUM UPLOAD] User authenticated:", user.id);

    // Verify user is teacher of this course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("teacher_id")
      .eq("id", courseId)
      .single();

    if (courseError) {
      console.error("❌ [CURRICULUM UPLOAD] Course fetch error:", courseError);
      return NextResponse.json({ 
        error: "Failed to verify course", 
        details: courseError.message 
      }, { status: 500 });
    }
    
    if (!course) {
      console.error("❌ [CURRICULUM UPLOAD] Course not found:", courseId);
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    
    if (course.teacher_id !== user.id) {
      console.error("❌ [CURRICULUM UPLOAD] User is not teacher. User:", user.id, "Teacher:", course.teacher_id);
      return NextResponse.json({ error: "Unauthorized - Not course teacher" }, { status: 403 });
    }
    
    console.log("📤 [CURRICULUM UPLOAD] Course verified, user is teacher");

    const requestBody = await request.json();
    console.log("📤 [CURRICULUM UPLOAD] Request body received:", {
      hasFilePath: !!requestBody.filePath,
      hasTitle: !!requestBody.title,
      hasFileSize: !!requestBody.fileSize,
      hasContentType: !!requestBody.contentType,
    });
    
    const { filePath, title, fileSize, contentType } = requestBody;

    if (!filePath) {
      console.error("❌ [CURRICULUM UPLOAD] Missing filePath in request");
      return NextResponse.json({ 
        error: "File path is required",
        received: Object.keys(requestBody)
      }, { status: 400 });
    }
    
    console.log("📤 [CURRICULUM UPLOAD] File path:", filePath);
    console.log("📤 [CURRICULUM UPLOAD] Expected prefix:", `${user.id}/curriculum/${courseId}/`);

    // Verify the file exists in the expected user folder
    if (!filePath.startsWith(`${user.id}/curriculum/${courseId}/`)) {
      console.error("❌ [CURRICULUM UPLOAD] Invalid file path. Expected to start with:", `${user.id}/curriculum/${courseId}/`);
      return NextResponse.json({ 
        error: "Invalid file path",
        received: filePath,
        expected: `${user.id}/curriculum/${courseId}/...`
      }, { status: 400 });
    }

    // Get the file from GCS
    console.log("📤 [CURRICULUM UPLOAD] Checking if file exists in GCS...");
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    
    console.log("📤 [CURRICULUM UPLOAD] File exists check result:", exists);
    
    if (!exists) {
      console.error("❌ [CURRICULUM UPLOAD] File not found in GCS:", filePath);
      return NextResponse.json({ 
        error: "File not found in storage",
        filePath: filePath,
        bucket: bucketName
      }, { status: 404 });
    }
    
    console.log("✅ [CURRICULUM UPLOAD] File found in GCS");

    // Get file metadata
    console.log("📤 [CURRICULUM UPLOAD] Getting file metadata...");
    const [metadata] = await file.getMetadata();
    const originalName = metadata.metadata?.originalName || filePath.split('/').pop() || 'document';
    console.log("📤 [CURRICULUM UPLOAD] File metadata retrieved. Original name:", originalName);
    console.log("📤 [CURRICULUM UPLOAD] File size:", metadata.size);

    // Download file for text extraction
    console.log("📤 [CURRICULUM UPLOAD] Downloading file from GCS...");
    const [buffer] = await file.download();
    console.log("✅ [CURRICULUM UPLOAD] File downloaded. Buffer size:", buffer.length);
    
    // Generate signed URL for reading (1 hour expiry)
    console.log("📤 [CURRICULUM UPLOAD] Generating signed URL...");
    const [publicUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });
    console.log("✅ [CURRICULUM UPLOAD] Signed URL generated");

    // Extract text from document
    let extractedText = "";
    let sections: any[] = [];

    if (contentType === "application/pdf") {
      console.log("📤 [CURRICULUM UPLOAD] Processing PDF with pdf-parse...");
      try {
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text || "";
        console.log("✅ [CURRICULUM UPLOAD] Text extracted. Length:", extractedText.length);
        
        // Extract sections if we have text
        if (extractedText && extractedText.length > 100) {
          console.log("📤 [CURRICULUM UPLOAD] Extracting sections from text...");
          sections = await extractSections(extractedText);
          console.log("✅ [CURRICULUM UPLOAD] Sections extracted:", sections.length);
        } else if (extractedText.length > 0) {
          console.warn("⚠️ [CURRICULUM UPLOAD] Extracted text is too short, skipping section extraction");
        }
      } catch (error: any) {
        console.error("❌ [CURRICULUM UPLOAD] Error extracting text:", error);
        console.error("❌ [CURRICULUM UPLOAD] Error details:", {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        // Continue without text - background job will try again
        extractedText = "";
      }
    } else {
      console.log("📤 [CURRICULUM UPLOAD] File type is not PDF, skipping text extraction. Type:", contentType);
    }

    // Determine file type
    const fileType = contentType?.includes('pdf') ? 'pdf' 
      : contentType?.includes('word') ? 'docx' 
      : contentType?.includes('presentation') ? 'pptx' 
      : 'pdf';
    
    console.log("📤 [CURRICULUM UPLOAD] Determined file type:", fileType);

    // Save to database with initial status
    console.log("📤 [CURRICULUM UPLOAD] Saving to database...");
    const insertData: any = {
      course_id: courseId,
      title: title || originalName,
      file_url: publicUrl, // Signed URL for reading (will expire, but we can regenerate)
      file_name: originalName,
      file_type: fileType,
      file_size: fileSize || parseInt(metadata.size || '0'),
      uploaded_by: user.id,
      extracted_text: extractedText || "",
      sections: sections || [],
      processing_status: "uploading",
      processing_progress: 10,
    };
    
    // Only add file_path if the column exists (it might not be in the schema cache yet)
    // We'll try to add it, but if it fails, we'll continue without it
    try {
      insertData.file_path = filePath; // Store internal path for backend operations
    } catch (e) {
      console.warn("⚠️ [CURRICULUM UPLOAD] Could not add file_path, column might not exist");
    }
    
    console.log("📤 [CURRICULUM UPLOAD] Insert data:", {
      course_id: insertData.course_id,
      title: insertData.title,
      file_name: insertData.file_name,
      file_type: insertData.file_type,
      file_size: insertData.file_size,
      has_extracted_text: !!insertData.extracted_text,
      sections_count: insertData.sections.length,
    });
    
    // Try inserting with file_path first, if that fails, try without it
    let curriculumDoc;
    let dbError;
    
    const { data: data1, error: error1 } = await supabase
      .from("curriculum_documents")
      .insert(insertData)
      .select()
      .single();
    
    if (error1 && error1.code === 'PGRST204' && error1.message?.includes('file_path')) {
      console.warn("⚠️ [CURRICULUM UPLOAD] file_path column not found, trying without it...");
      // Remove file_path and try again
      const insertDataWithoutPath = { ...insertData };
      delete insertDataWithoutPath.file_path;
      
      const { data: data2, error: error2 } = await supabase
        .from("curriculum_documents")
        .insert(insertDataWithoutPath)
        .select()
        .single();
      
      curriculumDoc = data2;
      dbError = error2;
    } else {
      curriculumDoc = data1;
      dbError = error1;
    }

    if (dbError) {
      console.error("❌ [CURRICULUM UPLOAD] Database error:", dbError);
      console.error("❌ [CURRICULUM UPLOAD] Error code:", dbError.code);
      console.error("❌ [CURRICULUM UPLOAD] Error message:", dbError.message);
      console.error("❌ [CURRICULUM UPLOAD] Error details:", dbError.details);
      console.error("❌ [CURRICULUM UPLOAD] Error hint:", dbError.hint);
      return NextResponse.json({ 
        error: "Failed to save curriculum document",
        details: dbError.message,
        code: dbError.code,
        hint: dbError.hint
      }, { status: 500 });
    }
    
    console.log("✅ [CURRICULUM UPLOAD] Curriculum document saved. ID:", curriculumDoc?.id);
    console.log("📤 [CURRICULUM UPLOAD] Processing job will be created automatically by database trigger");
    console.log("📤 [CURRICULUM UPLOAD] Background worker will process it asynchronously");
    
    // Job is automatically created by database trigger (on_curriculum_uploaded)
    // Background worker (cron job) will pick it up and process it
    // User will be notified when processing completes

    console.log("✅ [CURRICULUM UPLOAD] Upload completed successfully!");
    return NextResponse.json({
      success: true,
      curriculum: curriculumDoc,
    });

  } catch (error: any) {
    console.error("❌ [CURRICULUM UPLOAD] Upload error:", error);
    console.error("❌ [CURRICULUM UPLOAD] Error message:", error.message);
    console.error("❌ [CURRICULUM UPLOAD] Error stack:", error.stack);
    return NextResponse.json({ 
      error: "Upload failed",
      details: error.message,
      type: error.constructor.name
    }, { status: 500 });
  }
}

