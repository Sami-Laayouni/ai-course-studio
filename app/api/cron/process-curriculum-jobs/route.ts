import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron endpoint for processing curriculum jobs
 * 
 * This endpoint should be called by:
 * - Google Cloud Scheduler: Schedule HTTP requests to this endpoint
 * - Vercel Cron Jobs: Add to vercel.json
 * - Any other cron service
 * 
 * Setup:
 * 1. Set CRON_SECRET in your environment variables
 * 2. Configure your cron service to call: GET /api/cron/process-curriculum-jobs?cron_secret=YOUR_SECRET
 * 3. Recommended schedule: Every 5 minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get("cron_secret");
    const authHeader = request.headers.get("authorization");

    // Check both query param and header for flexibility
    const providedSecret = cronSecret || authHeader?.replace("Bearer ", "");
    
    if (!providedSecret || providedSecret !== process.env.CRON_SECRET) {
      console.error("❌ [CRON] Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("📤 [CRON] Processing curriculum jobs...");

    const supabase = await createClient();
    const maxJobs = 10; // Process up to 10 jobs per run

    // Get pending jobs, ordered by priority and creation time
    const { data: jobs, error: jobsError } = await supabase
      .from("curriculum_processing_jobs")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(maxJobs);

    if (jobsError) {
      console.error("❌ [CRON] Error fetching jobs:", jobsError);
      return NextResponse.json(
        { error: "Failed to fetch jobs", details: jobsError.message },
        { status: 500 }
      );
    }

    if (!jobs || jobs.length === 0) {
      console.log("✅ [CRON] No pending jobs");
      return NextResponse.json({ 
        success: true,
        processed: 0,
        message: "No pending jobs",
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📤 [CRON] Found ${jobs.length} pending job(s)`);

    // Import and use the processJob function directly
    const processJobsModule = await import("@/app/api/curriculum/process-jobs/route");
    const processJob = processJobsModule.processJob;
    
    // Process jobs sequentially to avoid overwhelming the system
    const results = [];
    for (const job of jobs) {
      try {
        await processJob(job, supabase);
        results.push({ jobId: job.id, status: "success" });
        console.log(`✅ [CRON] Processed job ${job.id}`);
      } catch (error: any) {
        console.error(`❌ [CRON] Failed to process job ${job.id}:`, error);
        results.push({ jobId: job.id, status: "failed", error: error.message });
      }
    }

    const successful = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;

    console.log(`✅ [CRON] Completed: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed: successful,
      failed,
      total: jobs.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ [CRON] Cron job error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process jobs", details: error.stack },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}

