import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bucket } from "@/lib/gcs";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { ai, getModelName } from "@/lib/ai-config";

// Initialize Document AI client using environment variables
const documentAI = new DocumentProcessorServiceClient({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

export const runtime = 'nodejs';

// Extract sections from document text using AI
async function extractSections(text: string): Promise<any[]> {
  try {
    const prompt = `Analyze the following curriculum document and extract all major sections, chapters, or topics. For each section, provide:
1. Section title/heading
2. Approximate page number or location
3. Key concepts covered
4. Brief description

Return a JSON array of sections. Each section should have: id, title, pageNumber (or location), concepts (array), description.

Document text:
${text.substring(0, 5000)}...`;

    const response = await ai.models.generateContent({
      model: getModelName(),
      contents: prompt,
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
      const sections = JSON.parse(jsonMatch[0]);
      return sections.map((s: any, i: number) => ({
        ...s,
        id: s.id || `section_${i}`,
      }));
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

// Process a single job
async function processJob(job: any, supabase: any) {
  const { id, curriculum_document_id, course_id, job_type } = job;

  try {
    // Update job status to processing
    await supabase
      .from("curriculum_processing_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1,
      })
      .eq("id", id);

    // Update curriculum document status
    await supabase
      .from("curriculum_documents")
      .update({ processing_status: "extracting" })
      .eq("id", curriculum_document_id);

    // Get curriculum document
    const { data: curriculum } = await supabase
      .from("curriculum_documents")
      .select("*")
      .eq("id", curriculum_document_id)
      .single();

    if (!curriculum) {
      throw new Error("Curriculum document not found");
    }

    if (job_type === "extract_sections" || job_type === "full_pipeline") {
      // Step 1: Extract text from document
      await supabase
        .from("curriculum_documents")
        .update({ processing_status: "extracting", processing_progress: 20 })
        .eq("id", curriculum_document_id);

      let extractedText = curriculum.extracted_text || "";

      if (!extractedText && curriculum.file_type === "pdf") {
        // Download file from GCS and extract text
        // Use file_path if available, otherwise extract from file_url
        let filePath = (curriculum as any).file_path || curriculum.file_url;
        
        if (filePath.includes('storage.googleapis.com/') || filePath.includes('?')) {
          // Extract path from signed URL
          const urlParts = filePath.split('/');
          const bucketIndex = urlParts.findIndex(part => part.includes('storage.googleapis.com'));
          if (bucketIndex >= 0) {
            filePath = urlParts.slice(bucketIndex + 2).join('/');
            // Remove query parameters if present
            filePath = filePath.split('?')[0];
          }
        }
        
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        
        if (!exists) {
          throw new Error(`File not found in storage: ${filePath}`);
        }
        
        const [buffer] = await file.download();

        const [result] = await documentAI.processDocument({
          name: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/us/processors/${process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID}`,
          rawDocument: {
            content: buffer,
            mimeType: "application/pdf",
          },
        });

        extractedText = result.document?.text || "";

        // Update extracted text
        await supabase
          .from("curriculum_documents")
          .update({ extracted_text: extractedText, processing_progress: 40 })
          .eq("id", curriculum_document_id);
      }

      // Step 2: Extract sections
      await supabase
        .from("curriculum_documents")
        .update({ processing_status: "analyzing", processing_progress: 60 })
        .eq("id", curriculum_document_id);

      const sections = await extractSections(extractedText);

      // Update sections
      await supabase
        .from("curriculum_documents")
        .update({
          sections: sections,
          processing_progress: 80,
          processing_status: job_type === "full_pipeline" ? "mapping" : "analyzing",
        })
        .eq("id", curriculum_document_id);

      // Generate embeddings for sections (async, don't wait)
      if (sections.length > 0) {
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/curriculum/generate-embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ curriculum_document_id }),
        }).catch(err => console.error("Error triggering embedding generation:", err));
      }
    }

    if (job_type === "map_activities" || job_type === "full_pipeline") {
      // Map activities to sections (this will be done in calculate_analytics)
      await supabase
        .from("curriculum_documents")
        .update({ processing_status: "mapping", processing_progress: 85 })
        .eq("id", curriculum_document_id);
    }

    if (job_type === "calculate_analytics" || job_type === "full_pipeline") {
      // Calculate analytics (call the analytics endpoint logic)
      await supabase
        .from("curriculum_documents")
        .update({ processing_status: "analyzing", processing_progress: 90 })
        .eq("id", curriculum_document_id);

      // Import and call analytics calculation
      const analyticsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/courses/${course_id}/curriculum/analytics`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ curriculum_id: curriculum_document_id }),
        }
      );

      if (!analyticsResponse.ok) {
        throw new Error("Failed to calculate analytics");
      }
    }

    // Mark as completed
    await supabase
      .from("curriculum_documents")
      .update({
        processing_status: "completed",
        processing_progress: 100,
      })
      .eq("id", curriculum_document_id);

    await supabase
      .from("curriculum_processing_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Send notification to the teacher that processing is complete
    try {
      const { data: curriculumDoc } = await supabase
        .from("curriculum_documents")
        .select("title, uploaded_by, course_id, courses!inner(title)")
        .eq("id", curriculum_document_id)
        .single();

      if (curriculumDoc && curriculumDoc.uploaded_by) {
        // Send notification (type can be 'announcement' or any valid type from your schema)
        await supabase.from("notifications").insert({
          user_id: curriculumDoc.uploaded_by,
          type: "announcement", // Using 'announcement' as it's likely in the schema
          title: "Curriculum Analysis Complete",
          message: `Your curriculum "${curriculumDoc.title}" has been analyzed and is ready to view. Click to see the insights!`,
          data: {
            curriculum_id: curriculum_document_id,
            course_id: course_id,
            course_title: (curriculumDoc.courses as any)?.title,
            action_url: `/dashboard/courses/${course_id}/curriculum`,
          },
          priority: "normal",
        });
        console.log("✅ [PROCESS-JOBS] Notification sent to teacher");
      }
    } catch (notifError: any) {
      console.warn("⚠️ [PROCESS-JOBS] Failed to send notification:", notifError.message);
      // Don't fail the job if notification fails
    }

    return { success: true };
  } catch (error: any) {
    console.error(`Error processing job ${id}:`, error);

    // Update job with error
    await supabase
      .from("curriculum_processing_jobs")
      .update({
        status: job.attempts >= job.max_attempts ? "failed" : "pending",
        error_message: error.message,
        attempts: job.attempts + 1,
      })
      .eq("id", id);

    // Update curriculum document
    if (job.attempts >= job.max_attempts) {
      await supabase
        .from("curriculum_documents")
        .update({
          processing_status: "failed",
          processing_error: error.message,
        })
        .eq("id", curriculum_document_id);
    }

    throw error;
  }
}

// Main endpoint - processes pending jobs
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { max_jobs = 5 } = await request.json().catch(() => ({}));

    // Get pending jobs, ordered by priority and creation time
    const { data: jobs, error: jobsError } = await supabase
      .from("curriculum_processing_jobs")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(max_jobs);

    if (jobsError) {
      throw jobsError;
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ processed: 0, message: "No pending jobs" });
    }

    // Process jobs in parallel (but limit concurrency)
    const results = await Promise.allSettled(
      jobs.map((job) => processJob(job, supabase))
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      processed: successful,
      failed,
      total: jobs.length,
    });
  } catch (error: any) {
    console.error("Error processing jobs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process jobs" },
      { status: 500 }
    );
  }
}

// GET endpoint to check job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const curriculumId = searchParams.get("curriculum_id");

    console.log("📤 [PROCESS-JOBS GET] Checking status for curriculum:", curriculumId);

    const supabase = await createClient();

    if (curriculumId) {
      // Get status for specific curriculum
      const { data: curriculum, error: curriculumError } = await supabase
        .from("curriculum_documents")
        .select("processing_status, processing_progress, processing_error")
        .eq("id", curriculumId)
        .maybeSingle(); // Use maybeSingle to handle missing records gracefully

      if (curriculumError) {
        console.error("❌ [PROCESS-JOBS GET] Error fetching curriculum:", curriculumError);
        return NextResponse.json(
          { error: "Failed to fetch curriculum status", details: curriculumError.message },
          { status: 500 }
        );
      }

      const { data: jobs, error: jobsError } = await supabase
        .from("curriculum_processing_jobs")
        .select("status, error_message")
        .eq("curriculum_document_id", curriculumId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (jobsError) {
        console.error("❌ [PROCESS-JOBS GET] Error fetching jobs:", jobsError);
        // Don't fail completely, just log the error
      }

      return NextResponse.json({
        curriculum: curriculum || null,
        latest_job: jobs?.[0] || null,
      });
    }

    // Get pending jobs count
    const { count, error: countError } = await supabase
      .from("curriculum_processing_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (countError) {
      console.error("❌ [PROCESS-JOBS GET] Error counting jobs:", countError);
      return NextResponse.json(
        { error: "Failed to count pending jobs", details: countError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ pending_jobs: count || 0 });
  } catch (error: any) {
    console.error("❌ [PROCESS-JOBS GET] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get job status", details: error.stack },
      { status: 500 }
    );
  }
}

