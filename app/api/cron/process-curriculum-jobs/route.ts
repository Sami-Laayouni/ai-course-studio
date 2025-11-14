import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';

/**
 * Cron endpoint for processing curriculum jobs
 * 
 * This endpoint should be called by:
 * - Vercel Cron Jobs (recommended): Add to vercel.json
 * - Google Cloud Scheduler: Schedule HTTP requests to this endpoint
 * - Any other cron service
 * 
 * Setup:
 * 1. Set CRON_SECRET in your environment variables
 * 2. Configure your cron service to call: POST /api/cron/process-curriculum-jobs?cron_secret=YOUR_SECRET
 * 3. Recommended schedule: Every 1-5 minutes
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

    // Call the process-jobs endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/curriculum/process-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_jobs: 10 }), // Process up to 10 jobs per run
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ [CRON] Failed to process jobs:", errorData);
      return NextResponse.json(
        { error: "Failed to process jobs", details: errorData },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log("✅ [CRON] Processed jobs:", data);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...data,
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

